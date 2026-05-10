import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, SafeAreaView, TouchableOpacity, StyleSheet,
  ScrollView, Dimensions, ActivityIndicator, Image
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { 
  Users, Package, TrendingUp, 
  ChevronRight, LogOut, Bell,
  EyeOff, ShoppingCart, LayoutDashboard, RefreshCcw, ShoppingBag
} from 'lucide-react-native';
import { supabase } from '../../lib/supabase';
import { useTheme, DarkTheme } from '../../context/ThemeContext';
import { useAuth } from '../../hooks/useAuth';
import { useFocusEffect } from '@react-navigation/native';
import { adminService } from '../../services/adminService';

const { width } = Dimensions.get('window');

export default function AdminDashboardScreen({ navigation }: any) {
  const [stats, setStats] = useState({
    users: 0,
    inventory: 0,
    hiddenItems: 0,
    revenue: 0,
    orders: 0
  });
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { colors, isDark, theme } = useTheme();
  const { user, role, signOut } = useAuth();

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

  const logClick = (target: string) => {
    if (role === 'admin' && user?.id) {
      adminService.logActivity(user.id, 'ADMIN_NAV_CLICK', { 
        target, 
        source: 'dashboard_quick_link' 
      });
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchStats(true);
      if (role === 'admin' && user?.id) {
        adminService.logActivity(user.id, 'ADMIN_PAGE_VIEW', { page: 'Dashboard' });
      }
    }, [user, role])
  );

  const fetchStats = async (isInitial = false) => {
    try {
      if (isInitial) setLoading(true);
      else setRefreshing(true);
      
      const { count: userCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
      const { count: productCount } = await supabase.from('furniture').select('*', { count: 'exact', head: true });
      const { count: hiddenCount } = await supabase.from('furniture').select('*', { count: 'exact', head: true }).eq('is_hidden', true);
      const { data: ordersData, count: orderCount } = await supabase.from('orders').select('*, profiles(full_name)', { count: 'exact' }).order('created_at', { ascending: false }).limit(5);

      const { data: allOrders } = await supabase.from('orders').select('*');

      const totalRevenue = allOrders?.reduce((sum, order: any) => {
        const val = Number(order.total_price || order.total_amount || order.amount || 0);
        const itemData = getItemsData(order.items);
        const isPaid = order.payment_method === 'card' || itemData.payment_method === 'card' || order.status === 'delivered';
        return isPaid ? sum + val : sum;
      }, 0) || 0;

      setStats({
        users: userCount || 0,
        inventory: productCount || 0,
        hiddenItems: hiddenCount || 0,
        revenue: totalRevenue,
        orders: orderCount || 0
      });

      setRecentOrders(ordersData || []);
    } catch (error) {
      console.error('Error fetching admin stats:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  if (loading && stats.revenue === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <LinearGradient colors={colors.gradient} style={styles.container}>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <View>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Business Overview</Text>
            <Text style={[styles.headerSubtitle, { color: colors.textMuted }]}>{user?.email}</Text>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity 
              style={[styles.iconBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : colors.card, borderColor: colors.border }]}
              onPress={() => fetchStats(true)}
            >
              <RefreshCcw size={20} color={colors.text} />
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={() => {
                if (user?.id) adminService.logActivity(user.id, 'ADMIN_LOGOUT', { email: user.email });
                signOut();
              }}
              style={[styles.iconBtn, { backgroundColor: '#FEE2E2', borderColor: '#FCA5A5' }]}
            >
              <LogOut size={20} color="#EF4444" />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          {/* Key Metrics */}
          <View style={styles.statsGrid}>
            <TouchableOpacity 
              style={[styles.statCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : colors.card, borderColor: colors.border }]}
              onPress={() => {
                logClick('Inventory');
                navigation.navigate('Inventory');
              }}
            >
              <View style={styles.statIconContainer}>
                <Package size={20} color="#22C55E" />
              </View>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>Inventory</Text>
              <Text style={[styles.statValue, { color: colors.text }]}>{stats.inventory}</Text>
              <View style={styles.statTrend}>
                <TrendingUp size={12} color="#22C55E" />
                <Text style={styles.trendText}>Items in Stock</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.statCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : colors.card, borderColor: colors.border }]}
              onPress={() => {
                logClick('Inventory-Hidden');
                navigation.navigate('Inventory', { filter: 'hidden' });
              }}
            >
              <View style={styles.statIconContainer}>
                <EyeOff size={20} color="#F59E0B" />
              </View>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>Hidden</Text>
              <Text style={[styles.statValue, { color: colors.text }]}>{stats.hiddenItems}</Text>
              <View style={styles.statTrend}>
                <TrendingUp size={12} color="#F59E0B" />
                <Text style={[styles.trendText, { color: '#F59E0B' }]}>Private Items</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.statCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : colors.card, borderColor: colors.border }]}
              onPress={() => {
                logClick('Users');
                navigation.navigate('UserManagement');
              }}
            >
              <View style={styles.statIconContainer}>
                <Users size={20} color="#3B82F6" />
              </View>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>Users</Text>
              <Text style={[styles.statValue, { color: colors.text }]}>{stats.users}</Text>
              <View style={styles.statTrend}>
                <TrendingUp size={12} color="#3B82F6" />
                <Text style={[styles.trendText, { color: '#3B82F6' }]}>Customers</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.statCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : colors.card, borderColor: '#22C55E' }]}
              onPress={() => {
                logClick('Revenue');
                navigation.navigate('Orders');
              }}
            >
              <View style={styles.statIconContainer}>
                <TrendingUp size={20} color="#22C55E" />
              </View>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>Revenue</Text>
              <Text style={[styles.statValue, { color: colors.text }]}>${stats.revenue.toLocaleString()}</Text>
              <View style={styles.statTrend}>
                <ShoppingBag size={12} color="#22C55E" />
                <Text style={styles.trendText}>{stats.orders} Orders</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Recent Orders */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Orders</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Orders')}>
                <Text style={[styles.viewAll, { color: '#22C55E' }]}>View All</Text>
              </TouchableOpacity>
            </View>

            {recentOrders.map((order) => (
              <TouchableOpacity 
                key={order.id} 
                style={[styles.orderCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : colors.card, borderColor: colors.border }]}
              >
                <View style={[styles.orderIcon, { backgroundColor: colors.background }]}>
                  {(() => {
                    const itemData = getItemsData(order.items);
                    const imageUrl = itemData.products[0]?.image_url;
                    return imageUrl ? (
                      <Image source={{ uri: imageUrl }} style={{ width: '100%', height: '100%', borderRadius: 12 }} />
                    ) : (
                      <ShoppingCart size={18} color={colors.primary} />
                    );
                  })()}
                </View>
                <View style={styles.orderInfo}>
                  <Text style={[styles.orderId, { color: colors.text }]}>Order #{order.id.slice(0, 8)}</Text>
                  <Text style={[styles.orderUser, { color: colors.textMuted }]}>{order.profiles?.full_name || 'Anonymous'}</Text>
                </View>
                <View style={styles.orderRight}>
                  <Text style={[styles.orderAmount, { color: colors.text }]}>${order.total_amount}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: '#FEF3C720' }]}>
                    <Text style={[styles.statusText, { color: '#F59E0B' }]}>{order.status?.toUpperCase()}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {/* Management Quick Links */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Management</Text>
            <View style={[styles.menuList, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : colors.card, borderColor: colors.border }]}>
              <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('Inventory')}>
                <View style={styles.menuLeft}>
                  <Package size={18} color={colors.textSecondary} />
                  <Text style={[styles.menuText, { color: colors.text }]}>Inventory Manager</Text>
                </View>
                <ChevronRight size={16} color={colors.textMuted} />
              </TouchableOpacity>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('ActivityLogs')}>
                <View style={styles.menuLeft}>
                  <LayoutDashboard size={18} color={colors.textSecondary} />
                  <Text style={[styles.menuText, { color: colors.text }]}>System Audit Logs</Text>
                </View>
                <ChevronRight size={16} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity 
            style={[styles.logoutBtn, { backgroundColor: isDark ? 'rgba(239,68,68,0.1)' : '#FEE2E2', borderColor: '#EF4444' }]} 
            onPress={signOut}
          >
            <LogOut size={20} color="#EF4444" />
            <Text style={styles.logoutText}>Sign Out Account</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTitle: { fontSize: 24, fontWeight: 'bold' },
  headerSubtitle: { fontSize: 13, marginTop: 2 },
  headerRight: { flexDirection: 'row', gap: 10 },
  iconBtn: { padding: 10, borderRadius: 12, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: 20, paddingBottom: 100 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginBottom: 16 },
  statCard: { 
    flex: 1,
    minWidth: (width - 60) / 2,
    padding: 16, 
    borderRadius: 20, 
    borderWidth: 1,
  },
  statIconContainer: { marginBottom: 12 },
  statLabel: { fontSize: 12, fontWeight: '600', marginBottom: 4 },
  statValue: { fontSize: 20, fontWeight: 'bold', marginBottom: 8 },
  statTrend: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  trendText: { fontSize: 10, fontWeight: 'bold', color: '#22C55E' },
  salesMonitor: {
    marginBottom: 24,
    padding: 20,
    borderRadius: 24,
    borderWidth: 1,
    borderLeftWidth: 4,
  },
  monitorLabel: { fontSize: 11, fontWeight: '800', marginBottom: 6, letterSpacing: 1 },
  monitorValue: { fontWeight: '900' },
  iconCircle: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  
  section: { marginBottom: 32 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold' },
  viewAll: { fontSize: 13, fontWeight: '600' },
  
  orderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  orderIcon: { width: 48, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  orderInfo: { flex: 1, marginLeft: 12 },
  orderId: { fontSize: 14, fontWeight: 'bold' },
  orderUser: { fontSize: 12, marginTop: 2 },
  orderRight: { alignItems: 'flex-end' },
  orderAmount: { fontSize: 15, fontWeight: 'bold', marginBottom: 4 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 9, fontWeight: '800' },

  menuList: { borderRadius: 20, borderWidth: 1, overflow: 'hidden' },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 18,
  },
  menuLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  menuText: { fontSize: 15, fontWeight: '600' },
  divider: { height: 1, marginHorizontal: 16 },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
    borderRadius: 20,
    borderWidth: 1,
    gap: 8,
    marginTop: 8,
  },
  logoutText: { color: '#EF4444', fontWeight: 'bold', fontSize: 16 },
});
