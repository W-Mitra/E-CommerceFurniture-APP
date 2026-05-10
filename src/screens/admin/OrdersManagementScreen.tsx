import React, { useState, useEffect, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View, Text, SafeAreaView, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert, Modal, ScrollView, Image
} from 'react-native';
import { ShoppingBag, ChevronRight, MapPin, Calendar, CheckCircle2, Clock, Truck, X } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../lib/supabase';
import { useTheme, DarkTheme } from '../../context/ThemeContext';
import { useAuth } from '../../hooks/useAuth';
import { adminService } from '../../services/adminService';

const STATUS_COLORS: any = {
  placed: '#3B82F6',
  processing: '#F59E0B',
  shipped: '#8B5CF6',
  delivered: '#10B981',
};
export default function OrdersManagementScreen() {
  const { user, role } = useAuth();
  const { colors, isDark, theme } = useTheme();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [adminEmail, setAdminEmail] = useState('');

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

  useFocusEffect(
    React.useCallback(() => {
      if (role === 'admin' && user?.id) {
        adminService.logActivity(user.id, 'ADMIN_PAGE_VIEW', { page: 'Orders Management' });
      }
    }, [user, role])
  );

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setAdminEmail(data.user?.email || ''));
    fetchOrders();

    // Subscribe to Realtime changes for maximum accuracy
    const ordersChannel = supabase
      .channel('admin-orders-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        () => fetchOrders()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ordersChannel);
    };
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('orders')
        .select('*, profiles(full_name, phone)') 
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error: any) {
      console.error('Fetch Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (orderId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId);

      if (error) throw error;
      
      fetchOrders();
      setIsModalVisible(false);
      Alert.alert('Updated', `Order status changed to ${newStatus}`);
    } catch (error) {
      Alert.alert('Error', 'Failed to update status');
    }
  };

  const renderOrderItem = ({ item }: any) => (
    <TouchableOpacity 
      style={[styles.orderCard, { backgroundColor: colors.card, borderColor: colors.border }]} 
      onPress={() => { setSelectedOrder(item); setIsModalVisible(true); }}
    >
      <View style={styles.orderHeader}>
        <View style={[styles.statusBadge, { backgroundColor: (STATUS_COLORS[item.status] || '#94A3B8') + '20' }]}>
          <Text style={[styles.statusText, { color: STATUS_COLORS[item.status] || '#94A3B8' }]}>
            {(item.status || 'placed').toUpperCase()}
          </Text>
        </View>
        <Text style={[styles.orderDate, { color: colors.textMuted }]}>
          {new Date(item.created_at).toLocaleDateString()}
        </Text>
      </View>
      
      <View style={styles.orderBody}>
        <View style={styles.orderMainInfo}>
          {(() => {
            const itemData = getItemsData(item.items);
            const imageUrl = itemData.products[0]?.image_url;
            return (
              <View style={[styles.orderPreviewContainer, { backgroundColor: colors.background }]}>
                {imageUrl ? (
                  <Image source={{ uri: imageUrl }} style={styles.orderPreviewImage} />
                ) : (
                  <ShoppingBag size={18} color={colors.primary} />
                )}
              </View>
            );
          })()}
          <View>
            <Text style={[styles.customerEmail, { color: colors.text }]}>{item.profiles?.full_name || 'Anonymous'}</Text>
            <Text style={[styles.orderItemsPreview, { color: colors.textMuted }]}>
              {(() => {
                const itemData = getItemsData(item.items);
                const firstItem = itemData.products[0]?.name || 'Furniture Item';
                const count = itemData.products.length;
                return count > 1 ? `${firstItem} +${count - 1} more` : firstItem;
              })()}
            </Text>
          </View>
        </View>
        <Text style={[styles.orderAmount, { color: colors.text }]}>
          ${Number(item.total_price || item.total_amount || item.amount || 0).toLocaleString()}
        </Text>
      </View>

      <View style={[styles.orderFooter, { borderTopColor: colors.border }]}>
        <View style={styles.paymentInfo}>
          <Text style={[styles.paymentMethod, { color: colors.textSecondary }]}>
            {(item.payment_method === 'cod' || getItemsData(item.items).payment_method === 'cod') ? '💵 COD' : '💳 Card'}
          </Text>
          <View style={[styles.paymentBadge, { backgroundColor: (item.payment_method === 'card' || getItemsData(item.items).payment_method === 'card' || item.status === 'delivered') ? '#10B98120' : '#EF444420' }]}>
            <Text style={[styles.paymentBadgeText, { color: (item.payment_method === 'card' || getItemsData(item.items).payment_method === 'card' || item.status === 'delivered') ? '#10B981' : '#EF4444' }]}>
              {(item.payment_method === 'card' || getItemsData(item.items).payment_method === 'card' || item.status === 'delivered') ? 'PAID' : 'NOT PAID'}
            </Text>
          </View>
        </View>
        <ChevronRight size={18} color={colors.textMuted} />
      </View>
    </TouchableOpacity>
  );

  return (
    <LinearGradient colors={colors.gradient} style={styles.container}>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <View>
            <Text style={[styles.headerTitle, { color: colors.text }]}>User Orders</Text>
            <Text style={[styles.debugEmail, { color: colors.textMuted }]}>Real-time Sales Monitoring</Text>
          </View>
          <TouchableOpacity 
            onPress={fetchOrders} 
            style={[styles.refreshBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : colors.card, borderColor: colors.border }]}
          >
            <Text style={[styles.refreshText, { color: colors.primary }]}>↻ Refresh</Text>
          </TouchableOpacity>
        </View>

        {/* Total Sales Monitor Card */}
        <View style={[styles.salesMonitor, { backgroundColor: colors.primary }]}>
          <View>
            <Text style={styles.monitorLabel}>Total Sales Revenue</Text>
            <Text style={styles.monitorValue}>
              ${orders.reduce((sum, o) => {
                const val = Number(o.total_price || o.total_amount || o.amount || 0);
                const itemData = getItemsData(o.items);
                const isPaid = o.payment_method === 'card' || itemData.payment_method === 'card' || o.status === 'delivered';
                return isPaid ? sum + val : sum;
              }, 0).toLocaleString()}
            </Text>
          </View>
          <ShoppingBag size={40} color="rgba(255,255,255,0.3)" />
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 50 }} />
        ) : (
          <FlatList
            data={orders}
            renderItem={renderOrderItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <ShoppingBag size={60} color={colors.border} />
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>No orders placed yet</Text>
              </View>
            }
          />
        )}

      {/* Order Details Modal */}
      <Modal visible={isModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Order Details</Text>
              <TouchableOpacity onPress={() => setIsModalVisible(false)}>
                <X size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            {selectedOrder && (() => {
              try {
                const itemData = getItemsData(selectedOrder.items);
                return (
                  <ScrollView showsVerticalScrollIndicator={false}>
                    <View style={styles.detailSection}>
                      <Text style={[styles.detailLabel, { color: colors.textMuted }]}>Buyer Contact</Text>
                      <Text style={[styles.detailValue, { color: colors.text }]}>{selectedOrder.profiles?.full_name || 'No Name'}</Text>
                      <Text style={[styles.detailSubValue, { color: colors.textSecondary }]}>{selectedOrder.profiles?.phone || 'No Phone'}</Text>
                    </View>

                    <View style={styles.detailSection}>
                      <Text style={[styles.detailLabel, { color: colors.textMuted }]}>Payment Details</Text>
                      <View style={styles.paymentDetailRow}>
                        <Text style={[styles.detailValue, { color: colors.text }]}>
                          {(selectedOrder.payment_method === 'card' || itemData.payment_method === 'card') ? 'Credit Card' : 'Cash on Delivery'}
                        </Text>
                        <View style={[styles.paymentBadge, { backgroundColor: (selectedOrder.payment_method === 'card' || itemData.payment_method === 'card' || selectedOrder.status === 'delivered') ? '#10B98120' : '#EF444420' }]}>
                          <Text style={[styles.paymentBadgeText, { color: (selectedOrder.payment_method === 'card' || itemData.payment_method === 'card' || selectedOrder.status === 'delivered') ? '#10B981' : '#EF4444' }]}>
                            {(selectedOrder.payment_method === 'card' || itemData.payment_method === 'card' || selectedOrder.status === 'delivered') ? 'PAID' : 'NOT PAID'}
                          </Text>
                        </View>
                      </View>
                    </View>

                    <View style={styles.detailSection}>
                      <Text style={[styles.detailLabel, { color: colors.textMuted }]}>Shipping Address</Text>
                      <View style={[styles.addressBox, { backgroundColor: colors.background }]}>
                        <MapPin size={16} color={colors.textSecondary} />
                        <Text style={[styles.addressText, { color: colors.text }]}>
                          {selectedOrder.shipping_address || itemData.shipping_address || 'No address provided'}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.detailSection}>
                      <Text style={[styles.detailLabel, { color: colors.textMuted }]}>Update Status</Text>
                      <View style={styles.statusRow}>
                        {['placed', 'processing', 'shipped', 'delivered'].map((s) => (
                          <TouchableOpacity
                            key={s}
                            style={[
                              styles.statusBtn,
                              { borderColor: colors.border },
                              selectedOrder.status === s && { backgroundColor: STATUS_COLORS[s], borderColor: STATUS_COLORS[s] }
                            ]}
                            onPress={() => updateStatus(selectedOrder.id, s)}
                          >
                            <Text style={[styles.statusBtnText, { color: colors.textSecondary }, selectedOrder.status === s && { color: 'white' }]}>
                              {s}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>

                    <View style={styles.detailSection}>
                      <Text style={[styles.detailLabel, { color: colors.textMuted }]}>Items</Text>
                      {itemData.products?.map((item: any, i: number) => (
                        <View key={i} style={styles.itemRow}>
                          <Text style={[styles.itemName, { color: colors.textSecondary }]}>{item.name} x{item.quantity}</Text>
                          <Text style={[styles.itemPrice, { color: colors.text }]}>${item.price * item.quantity}</Text>
                        </View>
                      ))}
                    </View>

                    <View style={[styles.totalBox, { borderTopColor: colors.border }]}>
                      <Text style={[styles.totalLabel, { color: colors.text }]}>Total Order Value</Text>
                      <Text style={[styles.totalValue, { color: colors.primary }]}>${selectedOrder.total_amount}</Text>
                    </View>
                  </ScrollView>
                );
              } catch (e) {
                return (
                  <View style={{ padding: 20, alignItems: 'center' }}>
                    <Text style={{ color: colors.text }}>Unable to load order details</Text>
                    <TouchableOpacity onPress={() => setIsModalVisible(false)} style={{ marginTop: 20 }}>
                      <Text style={{ color: colors.primary }}>Close</Text>
                    </TouchableOpacity>
                  </View>
                );
              }
            })()}
          </View>
        </View>
      </Modal>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 24, paddingVertical: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { fontSize: 28, fontWeight: 'bold' },
  debugEmail: { fontSize: 12, marginTop: 4 },
  refreshBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  refreshText: { fontSize: 12, fontWeight: 'bold' },
  
  salesMonitor: {
    marginHorizontal: 24,
    marginBottom: 20,
    padding: 24,
    borderRadius: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  monitorLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 14, fontWeight: '600', marginBottom: 4 },
  monitorValue: { color: 'white', fontSize: 32, fontWeight: '900' },
  
  listContent: { paddingHorizontal: 24, paddingBottom: 100 },
  orderCard: { borderRadius: 20, padding: 16, marginBottom: 16, borderWidth: 1 },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 10, fontWeight: 'bold' },
  orderDate: { fontSize: 12 },
  orderBody: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  orderMainInfo: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  orderPreviewContainer: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  orderPreviewImage: { width: '100%', height: '100%' },
  orderItemsPreview: { fontSize: 11, marginTop: 2 },
  customerEmail: { fontSize: 15, fontWeight: '600' },
  orderAmount: { fontSize: 16, fontWeight: 'bold' },
  orderFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, paddingTop: 12 },
  itemCount: { fontSize: 13 },

  emptyState: { alignItems: 'center', marginTop: 100 },
  emptyText: { marginTop: 16, fontSize: 16 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 40, borderTopRightRadius: 40, padding: 32, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 22, fontWeight: 'bold' },
  
  detailSection: { marginBottom: 24 },
  detailLabel: { fontSize: 13, fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 8 },
  detailValue: { fontSize: 16, fontWeight: '600' },
  detailSubValue: { fontSize: 14, marginTop: 2 },
  addressBox: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 12 },
  addressText: { flex: 1, fontSize: 14 },
  
  statusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statusBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1 },
  statusBtnText: { fontSize: 12, fontWeight: 'bold', textTransform: 'capitalize' },
  
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  itemName: { fontSize: 14 },
  itemPrice: { fontWeight: 'bold' },
  
  totalBox: { marginTop: 16, paddingTop: 16, borderTopWidth: 1, flexDirection: 'row', justifyContent: 'space-between' },
  totalLabel: { fontSize: 18, fontWeight: 'bold' },
  totalValue: { fontSize: 22, fontWeight: 'bold' },
  paymentInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  paymentMethod: { fontSize: 12, fontWeight: '600' },
  paymentBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  paymentBadgeText: { fontSize: 10, fontWeight: '800' },
  paymentDetailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
