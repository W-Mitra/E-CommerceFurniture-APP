import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, SafeAreaView, FlatList, StyleSheet,
  TouchableOpacity, ActivityIndicator
} from 'react-native';
import { 
  Shield, ChevronLeft, Clock, User,
  Eye, EyeOff, Plus, Edit3, Trash2, RefreshCw
} from 'lucide-react-native';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../context/ThemeContext';
import { useFocusEffect } from '@react-navigation/native';

// ── Action config map ────────────────────────────────────────────
const ACTION_CONFIG: Record<string, { label: string; icon: any; color: string }> = {
  HIDE_PRODUCT:   { label: 'Item Hidden',    icon: EyeOff,    color: '#F59E0B' },
  SHOW_PRODUCT:   { label: 'Item Unhidden',  icon: Eye,       color: '#22C55E' },
  ADDED_ITEM:     { label: 'Item Added',     icon: Plus,      color: '#3B82F6' },
  EDITED_ITEM:    { label: 'Item Edited',    icon: Edit3,     color: '#6366F1' },
  DELETE_PRODUCT: { label: 'Item Deleted',   icon: Trash2,    color: '#EF4444' },
  DELETED_USER:   { label: 'User Deleted',   icon: Trash2,    color: '#EF4444' },
};

const DEFAULT_ACTION = { label: 'Admin Action', icon: Shield, color: '#6B7280' };

import { useAuth } from '../../hooks/useAuth';
import { adminService } from '../../services/adminService';

export default function ActivityLogsScreen({ navigation }: any) {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { colors, isDark } = useTheme();
  const { user, role } = useAuth();

  useFocusEffect(
    useCallback(() => {
      fetchLogs();
      if (role === 'admin' && user?.id) {
        adminService.logActivity(user.id, 'ADMIN_PAGE_VIEW', { page: 'Audit Logs' });
      }
    }, [user, role])
  );

  useEffect(() => {
    // Real-time subscription: refresh logs whenever a new one is inserted
    const channel = supabase
      .channel('activity-logs-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'activity_logs' },
        () => fetchLogs()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('activity_logs')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLogs(data || []);
    } catch (error) {
      console.error('Error fetching logs:', error);
    } finally {
      setLoading(false);
    }
  };

  // ── Parse the details field (may be JSON string or object) ───
  const parseDetails = (raw: any): Record<string, any> => {
    if (!raw) return {};
    if (typeof raw === 'string') {
      try { return JSON.parse(raw); } catch { return { raw }; }
    }
    return raw;
  };

  // ── Render each log card ─────────────────────────────────────
  const renderLogItem = ({ item }: any) => {
    const cfg = ACTION_CONFIG[item.action] ?? DEFAULT_ACTION;
    const ActionIcon = cfg.icon;
    const details = parseDetails(item.details);
    const productName = details.name || details.productName || null;
    const statusText = details.status || null;

    return (
      <View style={[styles.logCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {/* Header row */}
        <View style={styles.logHeader}>
          <View style={[styles.iconBox, { backgroundColor: cfg.color + '18' }]}>
            <ActionIcon size={20} color={cfg.color} />
          </View>
          <View style={styles.logMeta}>
            <Text style={[styles.actionLabel, { color: cfg.color }]}>{cfg.label}</Text>
            <Text style={[styles.actionRaw, { color: colors.textMuted }]}>{item.action}</Text>
          </View>
          <View style={styles.timeBox}>
            <Clock size={11} color={colors.textMuted} />
            <Text style={[styles.timeText, { color: colors.textMuted }]}>
              {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
        </View>

        {/* Details card */}
        <View style={[styles.detailsBox, { backgroundColor: isDark ? colors.background : '#F8FAF8' }]}>
          {productName && (
            <View style={styles.detailRow}>
              <Text style={[styles.detailKey, { color: colors.textMuted }]}>Product</Text>
              <Text style={[styles.detailVal, { color: colors.text }]} numberOfLines={1}>
                {productName}
              </Text>
            </View>
          )}
          {statusText && (
            <View style={styles.detailRow}>
              <Text style={[styles.detailKey, { color: colors.textMuted }]}>Status</Text>
              <View style={[styles.statusPill, { backgroundColor: cfg.color + '20' }]}>
                <Text style={[styles.statusPillText, { color: cfg.color }]}>{statusText}</Text>
              </View>
            </View>
          )}
          <View style={styles.detailRow}>
            <Text style={[styles.detailKey, { color: colors.textMuted }]}>Date</Text>
            <Text style={[styles.detailVal, { color: colors.textSecondary }]}>
              {new Date(item.created_at).toLocaleDateString([], { 
                day: 'numeric', month: 'short', year: 'numeric',
                hour: '2-digit', minute: '2-digit'
              })}
            </Text>
          </View>
        </View>

        {/* Footer */}
        <View style={[styles.footer, { borderTopColor: colors.border }]}>
          <User size={11} color={colors.textMuted} />
          <Text style={[styles.adminText, { color: colors.textMuted }]}>
            Admin ID: {item.admin_id?.slice(0, 8) ?? 'N/A'}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()}
          style={[styles.backBtn, { backgroundColor: colors.card }]}
        >
          <ChevronLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Audit Logs</Text>
        <TouchableOpacity 
          style={[styles.refreshBtn, { backgroundColor: colors.card }]}
          onPress={fetchLogs}
          disabled={loading}
        >
          <RefreshCw size={18} color={loading ? colors.textMuted : colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Live count pill */}
      {!loading && (
        <View style={[styles.countBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Shield size={13} color={colors.primary} />
          <Text style={[styles.countText, { color: colors.text }]}>
            {logs.length} recorded action{logs.length !== 1 ? 's' : ''}
          </Text>
          <View style={[styles.liveDot, { backgroundColor: '#22C55E' }]} />
          <Text style={[styles.liveText, { color: '#22C55E' }]}>Live</Text>
        </View>
      )}

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={logs}
          renderItem={renderLogItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Shield size={48} color={colors.border} />
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>No activity logs found</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'
  },
  backBtn: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  refreshBtn: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: 'bold' },

  countBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  countText: { fontSize: 13, fontWeight: '600', flex: 1 },
  liveDot: { width: 6, height: 6, borderRadius: 3 },
  liveText: { fontSize: 11, fontWeight: '700' },

  listContent: { 
    padding: 16, 
    paddingBottom: 50,
    maxWidth: 600,
    width: '100%',
    alignSelf: 'center',
  },
  logCard: {
    borderRadius: 16, padding: 14, marginBottom: 12, borderWidth: 1,
  },
  logHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 10 },
  iconBox: { width: 38, height: 38, borderRadius: 11, justifyContent: 'center', alignItems: 'center' },
  logMeta: { flex: 1 },
  actionLabel: { fontSize: 14, fontWeight: '800' },
  actionRaw: { fontSize: 10, fontWeight: '600', marginTop: 1 },
  timeBox: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  timeText: { fontSize: 11 },

  detailsBox: { borderRadius: 10, padding: 10, gap: 6, marginBottom: 10 },
  detailRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  detailKey: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.3 },
  detailVal: { fontSize: 12, fontWeight: '600', flexShrink: 1, textAlign: 'right' },
  statusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusPillText: { fontSize: 11, fontWeight: '700' },

  footer: { 
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingTop: 8, borderTopWidth: 1 
  },
  adminText: { fontSize: 11 },
  emptyContainer: { alignItems: 'center', marginTop: 100 },
  emptyText: { marginTop: 16, fontSize: 14 },
});
