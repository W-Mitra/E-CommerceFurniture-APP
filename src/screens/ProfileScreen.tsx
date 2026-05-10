import React, { useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, TouchableOpacity,
  Image, ScrollView, Switch, Alert, Dimensions, Platform, TextInput, ActivityIndicator, Modal
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  User, Mail, Phone, MapPin, Heart, ShoppingBag,
  Settings, LogOut, ChevronRight, ChevronLeft, Moon, Shield, Bell,
  CreditCard, Package, HelpCircle, LayoutDashboard,
  Clock, ClipboardList, Check, X, Truck
} from 'lucide-react-native';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../context/ThemeContext';
import { supabase } from '../lib/supabase';
import * as ImagePicker from 'expo-image-picker';

const { width } = Dimensions.get('window');

export default function ProfileScreen({ navigation, route }: any) {
  const { user, profile, role, signOut, refreshProfile } = useAuth();
  const { isDark, toggleTheme, colors } = useTheme();
  const [isEditing, setIsEditing] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [isOrderModalVisible, setIsOrderModalVisible] = useState(false);
  const [newFullName, setNewFullName] = React.useState(profile?.full_name || '');
  const [newAvatar, setNewAvatar] = React.useState(profile?.avatar_url || '');
  const [newPhone, setNewPhone] = React.useState(profile?.phone || '');
  const [newAddress, setNewAddress] = React.useState(profile?.address || '');
  const [saving, setSaving] = React.useState(false);
  const [userOrders, setUserOrders] = React.useState<any[]>([]);
  const [filteredOrders, setFilteredOrders] = React.useState<any[]>([]);
  const [showOrderHistory, setShowOrderHistory] = React.useState(false);
  const [activeFilter, setActiveFilter] = React.useState('all');
  const [orderStats, setOrderStats] = React.useState({ count: 0, total: 0 });

  React.useEffect(() => {
    if (route.params?.showHistory) {
      setShowOrderHistory(true);
      setActiveFilter('all');
      fetchUserOrders();
      // Clear the param after handling it
      navigation.setParams({ showHistory: undefined });
    }
  }, [route.params?.showHistory]);

  React.useEffect(() => {
    if (user?.id) {
      fetchUserOrders();
    }
  }, [user]);

  const getItemsData = (rawItems: any) => {
    if (!rawItems) return { products: [], payment_method: 'card', shipping_address: '', recipient_name: '' };
    try {
      const parsed = typeof rawItems === 'string' ? JSON.parse(rawItems) : rawItems;
      if (Array.isArray(parsed)) {
        return { 
          products: parsed, 
          payment_method: 'card', 
          shipping_address: '', 
          recipient_name: '' 
        };
      }
      return {
        products: parsed.products || [],
        payment_method: parsed.payment_method || 'card',
        shipping_address: parsed.shipping_address || '',
        recipient_name: parsed.recipient_name || ''
      };
    } catch (e) {
      console.error('Parsing error:', e);
      return { products: [], payment_method: 'card', shipping_address: '', recipient_name: '' };
    }
  };

  const fetchUserOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setUserOrders(data || []);
      setFilteredOrders(data || []);
      const total = data?.reduce((sum, o) => sum + Number(o.total_amount || 0), 0) || 0;
      setOrderStats({ count: data?.length || 0, total });
    } catch (error) {
      console.error('Error fetching user orders:', error);
    }
  };

  const filterOrders = (status: string) => {
    setActiveFilter(status);
    setShowOrderHistory(true);
    
    if (status === 'all') {
      setFilteredOrders(userOrders);
    } else if (status === 'to_pay') {
      // COD orders that are just 'placed'
      setFilteredOrders(userOrders.filter(o => {
        const itemData = getItemsData(o.items);
        const isCOD = o.payment_method === 'cod' || itemData.payment_method === 'cod';
        return o.status === 'placed' && isCOD;
      }));
    } else if (status === 'to_ship') {
      // Orders being processed
      setFilteredOrders(userOrders.filter(o => o.status === 'processing'));
    } else if (status === 'to_receive') {
      // Shipped orders
      setFilteredOrders(userOrders.filter(o => o.status === 'shipped'));
    } else if (status === 'completed') {
      // Delivered orders
      setFilteredOrders(userOrders.filter(o => o.status === 'delivered'));
    } else {
      setFilteredOrders(userOrders.filter(o => o.status === status));
    }
  };

  React.useEffect(() => {
    if (profile) {
      setNewFullName(profile.full_name || '');
      setNewAvatar(profile.avatar_url || '');
      setNewPhone(profile.phone || '');
      setNewAddress(profile.address || '');
    }
  }, [profile]);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.3, // Lower quality for faster uploads
    });

    if (!result.canceled) {
      setNewAvatar(result.assets[0].uri);
    }
  };

  const uploadImage = async (uri: string) => {
    try {
      // If it's already a web URL, don't re-upload
      if (uri.startsWith('http')) return uri;

      const response = await fetch(uri);
      const blob = await response.blob();
      const arrayBuffer = await new Response(blob).arrayBuffer();

      const fileName = `${user?.id}-${Date.now()}.jpg`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, arrayBuffer, {
          contentType: 'image/jpeg',
          upsert: true
        });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      return uri; // Fallback to original URI if upload fails
    }
  };

  const handleUpdateProfile = async () => {
    try {
      setSaving(true);

      // Upload image first if it's a local URI
      let finalAvatarUrl = newAvatar;
      if (newAvatar && !newAvatar.startsWith('http')) {
        finalAvatarUrl = await uploadImage(newAvatar);
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: newFullName,
          avatar_url: finalAvatarUrl,
          phone: newPhone,
          address: newAddress
        })
        .eq('id', user?.id);

      if (error) throw error;
      await refreshProfile();
      setIsEditing(false);
      Alert.alert('Success', 'Profile updated successfully!');
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    if (Platform.OS === 'web') {
      await signOut();
      return;
    }

    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await signOut();
          }
        },
      ]
    );
  };

  return (
    <LinearGradient
      colors={colors.gradient}
      style={styles.container}
    >
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>Account</Text>
            <View style={styles.headerActions}>
              <TouchableOpacity 
                style={[styles.headerIcon, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => Alert.alert('Notifications', 'You have no new notifications at this time.')}
              >
                <Bell size={20} color={colors.text} />
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.headerIcon, { backgroundColor: '#22C55E' }]}
                onPress={() => setIsEditing(true)}
              >
                <Settings size={20} color="white" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Profile Header */}
          <View style={[styles.profileCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Image
              source={{ uri: profile?.avatar_url || `https://ui-avatars.com/api/?name=${profile?.full_name || user?.email}&background=6366f1&color=fff` }}
              style={styles.avatar}
            />
            <View style={styles.profileInfo}>
              <Text style={[styles.profileName, { color: colors.text }]}>{profile?.full_name || 'Furniture Lover'}</Text>
              <Text style={[styles.profileEmail, { color: colors.textMuted }]}>{user?.email}</Text>

              {/* User Stats Row */}
              <View style={styles.statsRow}>
                <View style={styles.statBox}>
                  <Text style={[styles.statNum, { color: colors.text }]}>{orderStats.count}</Text>
                  <Text style={[styles.statLabel, { color: colors.textMuted }]}>Orders</Text>
                </View>
                <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
                <View style={styles.statBox}>
                  <Text style={[styles.statNum, { color: colors.text }]}>${orderStats.total.toFixed(0)}</Text>
                  <Text style={[styles.statLabel, { color: colors.textMuted }]}>Spent</Text>
                </View>
              </View>

              {role === 'admin' && (
                <View style={[styles.adminTag, { backgroundColor: colors.secondary }]}>
                  <Text style={[styles.adminTagText, { color: colors.primary }]}>Admin</Text>
                </View>
              )}
            </View>
          </View>

          {/* Shopee Style Order Status Row */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>MY PURCHASES</Text>
              <TouchableOpacity onPress={() => filterOrders('all')}>
                <Text style={{ color: colors.primary, fontSize: 12, fontWeight: 'bold' }}>{showOrderHistory ? 'Refresh History' : 'View All History'}</Text>
              </TouchableOpacity>
            </View>
            <View style={[styles.shopeeRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <TouchableOpacity style={[styles.shopeeItem, activeFilter === 'to_pay' && { backgroundColor: colors.secondary + '20' }]} onPress={() => filterOrders('to_pay')}>
                <CreditCard size={24} color={activeFilter === 'to_pay' ? colors.primary : colors.textSecondary} />
                <Text style={[styles.shopeeText, { color: activeFilter === 'to_pay' ? colors.primary : colors.textMuted }]}>To Pay</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.shopeeItem, activeFilter === 'to_ship' && { backgroundColor: colors.secondary + '20' }]} onPress={() => filterOrders('to_ship')}>
                <Clock size={24} color={activeFilter === 'to_ship' ? colors.primary : colors.textSecondary} />
                <Text style={[styles.shopeeText, { color: activeFilter === 'to_ship' ? colors.primary : colors.textMuted }]}>To Ship</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.shopeeItem, activeFilter === 'to_receive' && { backgroundColor: colors.secondary + '20' }]} onPress={() => filterOrders('to_receive')}>
                <Truck size={24} color={activeFilter === 'to_receive' ? colors.primary : colors.textSecondary} />
                <Text style={[styles.shopeeText, { color: activeFilter === 'to_receive' ? colors.primary : colors.textMuted }]}>To Receive</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.shopeeItem, activeFilter === 'completed' && { backgroundColor: colors.secondary + '20' }]} onPress={() => filterOrders('completed')}>
                <Check size={24} color={activeFilter === 'completed' ? colors.primary : colors.textSecondary} />
                <Text style={[styles.shopeeText, { color: activeFilter === 'completed' ? colors.primary : colors.textMuted }]}>Completed</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Dynamic Content: Either Order List or Menu */}
          {showOrderHistory ? (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
                  {activeFilter.toUpperCase().replace('_', ' ')} LIST
                </Text>
                <TouchableOpacity onPress={() => {
                  setShowOrderHistory(false);
                  setActiveFilter('none');
                }}>
                  <Text style={{ color: '#EF4444', fontSize: 12, fontWeight: 'bold' }}>Close History</Text>
                </TouchableOpacity>
              </View>
              
              {filteredOrders.length === 0 ? (
                <View style={[styles.emptyOrders, { backgroundColor: colors.card, borderRadius: 20 }]}>
                  <Package size={40} color={colors.border} />
                  <Text style={[styles.emptyOrdersText, { color: colors.textMuted }]}>No orders in this category</Text>
                </View>
              ) : (
                filteredOrders.map((order) => (
                  <TouchableOpacity 
                    key={order.id} 
                    style={[styles.orderHistoryCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                    onPress={() => {
                      setSelectedOrder(order);
                      setIsOrderModalVisible(true);
                    }}
                  >
                    <View style={styles.orderHistoryHeader}>
                      <View style={[styles.statusTag, {
                        backgroundColor:
                          order.status === 'delivered' ? '#10B98120' :
                            (order.payment_method === 'cod' || getItemsData(order.items).payment_method === 'cod') && order.status === 'placed' ? '#EF444420' :
                              order.status === 'shipped' ? '#8B5CF620' :
                                order.status === 'processing' ? '#F59E0B20' : '#3B82F620'
                      }]}>
                        <Text style={[styles.statusTagText, {
                          color:
                            order.status === 'delivered' ? '#10B981' :
                              (order.payment_method === 'cod' || getItemsData(order.items).payment_method === 'cod') && order.status === 'placed' ? '#EF4444' :
                                order.status === 'shipped' ? '#8B5CF6' :
                                  order.status === 'processing' ? '#F59E0B' : '#3B82F6'
                        }]}>
                          {(order.payment_method === 'cod' || getItemsData(order.items).payment_method === 'cod') && order.status === 'placed' ? 'TO PAY' : order.status?.toUpperCase()}
                        </Text>
                      </View>
                      <Text style={[styles.orderDateText, { color: colors.textMuted }]}>
                        {new Date(order.created_at).toLocaleDateString()}
                      </Text>
                    </View>

                    <View style={styles.orderHistoryInfo}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                        {(() => {
                          const itemData = getItemsData(order.items);
                          const imageUrl = itemData.products[0]?.image_url || 'https://via.placeholder.com/150';
                          const itemName = itemData.products[0]?.name || 'Furniture Item';
                          const totalItems = itemData.products.length;

                          return (
                            <>
                              <Image
                                source={{ uri: imageUrl }}
                                style={styles.orderPreviewImage}
                              />
                              <View>
                                <Text style={[styles.orderIdText, { color: colors.text }]}>Order #{order.id.slice(0, 8)}</Text>
                                <Text style={[styles.itemsCountText, { color: colors.textSecondary }]}>
                                  {itemName} {totalItems > 1 ? ` +${totalItems - 1} more` : ''}
                                </Text>
                              </View>
                            </>
                          );
                        })()}
                      </View>
                      <Text style={[styles.orderAmountText, { color: colors.primary }]}>${order.total_amount}</Text>
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </View>
          ) : isEditing ? (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>EDIT PROFILE</Text>
                <TouchableOpacity onPress={() => setIsEditing(false)}>
                  <Text style={{ color: '#EF4444', fontWeight: 'bold', fontSize: 13 }}>Cancel</Text>
                </TouchableOpacity>
              </View>

              <View style={[styles.editCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.inputItem}>
                  <Text style={[styles.inputLabel, { color: colors.textMuted }]}>Full Name / Username</Text>
                  <TextInput
                    style={[styles.fullInput, { color: colors.text, borderBottomColor: colors.border }]}
                    value={newFullName}
                    onChangeText={setNewFullName}
                    placeholder="Enter your name"
                    placeholderTextColor={colors.textMuted}
                  />
                </View>

                <View style={styles.inputItem}>
                  <Text style={[styles.inputLabel, { color: colors.textMuted }]}>Mobile Number</Text>
                  <TextInput
                    style={[styles.fullInput, { color: colors.text, borderBottomColor: colors.border }]}
                    value={newPhone}
                    onChangeText={setNewPhone}
                    placeholder="+1 234 567 890"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="phone-pad"
                  />
                </View>

                <View style={styles.inputItem}>
                  <Text style={[styles.inputLabel, { color: colors.textMuted }]}>Delivery Address</Text>
                  <TextInput
                    style={[styles.fullInput, { color: colors.text, borderBottomColor: 'transparent' }]}
                    value={newAddress}
                    onChangeText={setNewAddress}
                    placeholder="123 Modern St, City"
                    placeholderTextColor={colors.textMuted}
                    multiline
                  />
                </View>

                <TouchableOpacity
                  style={[styles.saveBtn, { backgroundColor: colors.primary }]}
                  onPress={handleUpdateProfile}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <>
                      <Check size={18} color="white" />
                      <Text style={styles.saveBtnText}>Save Changes</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <>
              {/* Admin Section (Only for Admins) */}
              {role === 'admin' && (
                <View style={styles.section}>
                  <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>MANAGEMENT</Text>
                  <View style={[styles.menuList, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('AdminDashboard')}>
                      <View style={styles.menuLeft}>
                        <LayoutDashboard size={18} color={colors.textSecondary} />
                        <Text style={[styles.menuText, { color: colors.text }]}>Dashboard</Text>
                      </View>
                      <ChevronRight size={16} color={colors.textMuted} />
                    </TouchableOpacity>
                    <View style={[styles.divider, { backgroundColor: colors.border }]} />
                    <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('Inventory')}>
                      <View style={styles.menuLeft}>
                        <Package size={18} color={colors.textSecondary} />
                        <Text style={[styles.menuText, { color: colors.text }]}>Products</Text>
                      </View>
                      <ChevronRight size={16} color={colors.textMuted} />
                    </TouchableOpacity>
                    <View style={[styles.divider, { backgroundColor: colors.border }]} />
                    <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('ActivityLogs')}>
                      <View style={styles.menuLeft}>
                        <ClipboardList size={18} color={colors.textSecondary} />
                        <Text style={[styles.menuText, { color: colors.text }]}>Audit Logs</Text>
                      </View>
                      <ChevronRight size={16} color={colors.textMuted} />
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* General Menu */}
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>ACCOUNT</Text>
                <View style={[styles.menuList, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <TouchableOpacity style={styles.menuItem} onPress={() => setIsEditing(true)}>
                    <View style={styles.menuLeft}>
                      <User size={18} color={colors.textSecondary} />
                      <Text style={[styles.menuText, { color: colors.text }]}>Edit Profile</Text>
                    </View>
                    <ChevronRight size={16} color={colors.textMuted} />
                  </TouchableOpacity>
                  <View style={[styles.divider, { backgroundColor: colors.border }]} />
                  <View style={styles.menuItem}>
                    <View style={styles.menuLeft}>
                      <Moon size={18} color={colors.textSecondary} />
                      <Text style={[styles.menuText, { color: colors.text }]}>Dark Mode</Text>
                    </View>
                    <Switch
                      value={isDark}
                      onValueChange={toggleTheme}
                      trackColor={{ false: colors.border, true: colors.primary }}
                      thumbColor="white"
                    />
                  </View>
                </View>
              </View>
            </>
          )}

          {/* Footer */}
          <TouchableOpacity
            style={[styles.logoutBtn, { backgroundColor: colors.card, borderColor: '#EF4444' }]}
            onPress={handleSignOut}
          >
            <LogOut size={18} color="#EF4444" />
            <Text style={styles.logoutText}>Sign Out</Text>
          </TouchableOpacity>

          <Text style={[styles.versionText, { color: colors.textMuted }]}>App Version 1.0.0</Text>
        </ScrollView>
      </SafeAreaView>

      {/* User Order Details Modal */}
      <Modal visible={isOrderModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Order Summary</Text>
              <TouchableOpacity onPress={() => setIsOrderModalVisible(false)}>
                <X size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            {selectedOrder && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.detailSection}>
                  <Text style={[styles.detailLabel, { color: colors.textMuted }]}>Status & Date</Text>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View style={[styles.statusTag, {
                      backgroundColor:
                        selectedOrder.status === 'delivered' ? '#10B98120' :
                          selectedOrder.status === 'shipped' ? '#8B5CF620' :
                            selectedOrder.status === 'processing' ? '#F59E0B20' : '#3B82F620'
                    }]}>
                      <Text style={[styles.statusTagText, {
                        color:
                          selectedOrder.status === 'delivered' ? '#10B981' :
                            selectedOrder.status === 'shipped' ? '#8B5CF6' :
                              selectedOrder.status === 'processing' ? '#F59E0B' : '#3B82F6'
                      }]}>
                        {selectedOrder.status?.toUpperCase()}
                      </Text>
                    </View>
                    <Text style={[styles.orderDateText, { color: colors.textMuted }]}>
                      {new Date(selectedOrder.created_at).toLocaleDateString()}
                    </Text>
                  </View>
                </View>

                <View style={styles.detailSection}>
                  <Text style={[styles.detailLabel, { color: colors.textMuted }]}>Payment Info</Text>
                  <View style={styles.paymentDetailRow}>
                    <Text style={[styles.detailValue, { color: colors.text }]}>
                      {(selectedOrder.payment_method === 'card' || getItemsData(selectedOrder.items).payment_method === 'card') ? '💳 Credit Card' : '💵 Cash on Delivery'}
                    </Text>
                    <View style={[styles.paymentBadge, { backgroundColor: (selectedOrder.payment_method === 'card' || getItemsData(selectedOrder.items).payment_method === 'card' || selectedOrder.status === 'delivered') ? '#10B98120' : '#EF444420' }]}>
                      <Text style={[styles.paymentBadgeText, { color: (selectedOrder.payment_method === 'card' || getItemsData(selectedOrder.items).payment_method === 'card' || selectedOrder.status === 'delivered') ? '#10B981' : '#EF4444' }]}>
                        {(selectedOrder.payment_method === 'card' || getItemsData(selectedOrder.items).payment_method === 'card' || selectedOrder.status === 'delivered') ? 'PAID' : 'NOT PAID'}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={styles.detailSection}>
                  <Text style={[styles.detailLabel, { color: colors.textMuted }]}>Purchased Items</Text>
                  {(() => {
                    const itemData = getItemsData(selectedOrder.items);
                    return itemData.products?.map((item: any, i: number) => (
                      <View key={i} style={styles.itemRow}>
                        <View style={{ flexDirection: 'row', gap: 12, flex: 1 }}>
                          <Image source={{ uri: item.image_url || 'https://via.placeholder.com/150' }} style={{ width: 40, height: 40, borderRadius: 8 }} />
                          <View>
                            <Text style={[styles.itemName, { color: colors.text }]}>{item.name}</Text>
                            <Text style={[styles.itemQty, { color: colors.textSecondary }]}>Qty: {item.quantity}</Text>
                          </View>
                        </View>
                        <Text style={[styles.itemPrice, { color: colors.text }]}>${item.price * item.quantity}</Text>
                      </View>
                    ));
                  })()}
                </View>

                <View style={styles.detailSection}>
                  <Text style={[styles.detailLabel, { color: colors.textMuted }]}>Shipping to</Text>
                  <View style={[styles.addressBox, { backgroundColor: colors.background }]}>
                    <MapPin size={16} color={colors.textSecondary} />
                    <Text style={[styles.addressText, { color: colors.text }]}>
                      {selectedOrder.shipping_address || getItemsData(selectedOrder.items).shipping_address || 'No address provided'}
                    </Text>
                  </View>
                </View>

                <View style={[styles.totalBox, { borderTopColor: colors.border }]}>
                  <Text style={[styles.totalLabel, { color: colors.text }]}>Grand Total</Text>
                  <Text style={[styles.totalValue, { color: colors.primary }]}>${selectedOrder.total_amount}</Text>
                </View>

                <TouchableOpacity 
                  style={[styles.closeModalBtn, { backgroundColor: colors.primary }]}
                  onPress={() => setIsOrderModalVisible(false)}
                >
                  <Text style={styles.closeModalBtnText}>Close Details</Text>
                </TouchableOpacity>

                {/* Bottom Spacer for Modal */}
                <View style={{ height: 60 }} />
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: {
    padding: 20,
    maxWidth: 500,
    width: '100%',
    alignSelf: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  title: { fontSize: 28, fontWeight: 'bold' },
  headerActions: { flexDirection: 'row', gap: 12 },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 24,
  },
  avatar: { width: 80, height: 80, borderRadius: 40 },
  profileInfo: { marginLeft: 16, flex: 1 },
  profileName: { fontSize: 18, fontWeight: 'bold' },
  profileEmail: { fontSize: 14, marginTop: 2 },
  editRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 4 },
  editInput: { flex: 1, fontSize: 18, fontWeight: 'bold', borderBottomWidth: 1, paddingVertical: 4 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, paddingHorizontal: 4 },
  editCard: { borderRadius: 20, borderWidth: 1, padding: 16 },
  inputItem: { marginBottom: 16 },
  inputLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', marginBottom: 4, letterSpacing: 0.5 },
  fullInput: { fontSize: 15, fontWeight: '600', borderBottomWidth: 1, paddingVertical: 6 },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 12, marginTop: 8 },
  saveBtnText: { color: 'white', fontWeight: 'bold', fontSize: 15 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  pickBtn: { paddingVertical: 2, paddingHorizontal: 8, borderRadius: 6 },
  pickBtnText: { fontSize: 11, fontWeight: 'bold' },
  adminTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 6,
    alignSelf: 'flex-start',
  },
  adminTagText: { fontSize: 10, fontWeight: 'bold' },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 12, fontWeight: 'bold', marginBottom: 10, marginLeft: 4 },
  menuList: { borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  menuLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  menuText: { fontSize: 16 },
  divider: { height: 1, marginHorizontal: 16 },
  versionText: { textAlign: 'center', marginTop: 20, fontSize: 12 },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 8,
    marginTop: 24,
  },
  logoutText: { color: '#EF4444', fontWeight: 'bold', fontSize: 16 },
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginBottom: 8
  },

  // Stats Styles
  statsRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12, gap: 16 },
  statBox: { alignItems: 'flex-start' },
  statNum: { fontSize: 16, fontWeight: '900' },
  statLabel: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', marginTop: 2 },
  statDivider: { width: 1, height: 20, opacity: 0.5 },

  // Order History Styles
  backBtn: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  emptyOrders: {
    paddingVertical: 80,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    borderRadius: 24,
    borderStyle: 'dashed',
    borderWidth: 1,
    marginTop: 10,
  },
  emptyOrdersText: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 16,
    opacity: 0.6,
  },
  orderHistoryCard: { padding: 16, borderRadius: 20, borderWidth: 1, marginBottom: 16 },
  orderHistoryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  statusTag: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusTagText: { fontSize: 10, fontWeight: 'bold' },
  orderDateText: { fontSize: 12 },
  orderHistoryInfo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  orderIdText: { fontSize: 15, fontWeight: 'bold' },
  orderAmountText: { fontSize: 16, fontWeight: '900' },
  orderHistoryDivider: { height: 1, marginBottom: 12, opacity: 0.5 },
  orderHistoryFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  itemsCountText: { fontSize: 13, fontWeight: '600' },
  trackingRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  trackText: { fontSize: 11, fontWeight: '600' },
  shopeeRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 1,
    marginTop: 8,
    overflow: 'hidden',
  },
  shopeeItem: { 
    alignItems: 'center', 
    flex: 1, 
    paddingVertical: 12,
    borderRadius: 12,
  },
  shopeeText: { fontSize: 10, fontWeight: 'bold', marginTop: 8 },
  orderPreviewImage: { width: 50, height: 50, borderRadius: 12, marginRight: 12 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 40, borderTopRightRadius: 40, padding: 32, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 22, fontWeight: 'bold' },
  detailSection: { marginBottom: 24 },
  detailLabel: { fontSize: 13, fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 8 },
  detailValue: { fontSize: 16, fontWeight: '600' },
  paymentDetailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  paymentBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  paymentBadgeText: { fontSize: 10, fontWeight: '800' },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12, alignItems: 'center' },
  itemName: { fontSize: 14, fontWeight: '600' },
  itemQty: { fontSize: 12 },
  itemPrice: { fontWeight: 'bold' },
  addressBox: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 12 },
  addressText: { flex: 1, fontSize: 14 },
  totalBox: { marginTop: 16, paddingTop: 16, borderTopWidth: 1, flexDirection: 'row', justifyContent: 'space-between' },
  totalLabel: { fontSize: 18, fontWeight: 'bold' },
  totalValue: { fontSize: 22, fontWeight: 'bold' },
  closeModalBtn: { marginTop: 24, paddingVertical: 16, borderRadius: 16, alignItems: 'center' },
  closeModalBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
});
