import React, { useState, useEffect, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View, Text, SafeAreaView, FlatList, StyleSheet,
  ActivityIndicator, TouchableOpacity, Alert, Platform
} from 'react-native';
import { User as UserIcon, Calendar, ChevronLeft, RefreshCw, AlertCircle, Trash2 } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../lib/supabase';
import { useTheme, DarkTheme } from '../../context/ThemeContext';
import { useAuth } from '../../hooks/useAuth';
import { adminService } from '../../services/adminService';
import { deleteUserSecure } from '../../lib/secureApi';

export default function UserManagementScreen({ navigation }: any) {
  const { user, role } = useAuth();
  const { colors, isDark } = useTheme();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (role === 'admin' && user?.id) {
        adminService.logActivity(user.id, 'ADMIN_PAGE_VIEW', { page: 'User Management' });
      }
    }, [user, role])
  );

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
      
    } catch (error: any) {
      console.error('Fetch Error:', error);
      Alert.alert('Database Error', 'Could not load users. Check your connection or policies.');
    } finally {
      setLoading(false);
    }
  };

  const deleteUser = async (userId: string, email: string) => {
    const msg = `Are you sure you want to permanently delete ${email}?\n\nThis cannot be undone.`;

    const executeDelete = async () => {
      try {
        // Use the secure Edge Function — requires service_role, verifies admin
        const { error } = await deleteUserSecure(userId);
        if (error) throw new Error(error);

        // Optimistic UI update
        setUsers(prev => prev.filter(u => u.id !== userId));

        if (Platform.OS === 'web') {
          window.alert('User account permanently removed.');
        } else {
          Alert.alert('Deleted', 'User account permanently removed.');
        }
        fetchUsers();
      } catch (error: any) {
        console.error('Delete Error:', error);
        if (Platform.OS === 'web') {
          window.alert('Delete Failed: ' + (error.message ?? 'Could not delete user.'));
        } else {
          Alert.alert('Delete Failed', error.message ?? 'Could not delete user.');
        }
      }
    };

    if (Platform.OS === 'web') {
      // Alert.alert callbacks don't work on web — use window.confirm instead
      const confirmed = window.confirm(msg);
      if (confirmed) await executeDelete();
    } else {
      Alert.alert(
        'Remove User',
        msg,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: executeDelete },
        ]
      );
    }
  };

  const syncMyProfile = async () => {
    try {
      setSyncing(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Sync Failed', 'No active session found.');
        return;
      }

      const { error } = await supabase.from('profiles').upsert({
        id: user.id,
        email: user.email,
        role: user.email === 'wendelynmitra900@gmail.com' ? 'admin' : 'user',
        full_name: 'Administrator',
        created_at: new Date().toISOString()
      });

      if (error) throw error;
      
      Alert.alert('Success', 'Profile synced! The list will now update.');
      fetchUsers();
    } catch (error: any) {
      console.error('Sync Error:', error);
      Alert.alert('Sync Failed', 'Error: ' + error.message);
    } finally {
      setSyncing(false);
    }
  };

  const renderUserItem = ({ item }: any) => (
    <View style={[styles.userCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.avatarBox, { backgroundColor: colors.secondary }]}>
        <UserIcon size={24} color={colors.primary} />
      </View>
      <View style={styles.userInfo}>
        <Text style={[styles.userEmail, { color: colors.text }]}>{item.email}</Text>
        <View style={styles.metaRow}>
          <Calendar size={12} color={colors.textMuted} />
          <Text style={[styles.userDate, { color: colors.textMuted }]}>Joined {new Date(item.created_at).toLocaleDateString()}</Text>
        </View>
      </View>
      
      {item.email !== 'wendelynmitra900@gmail.com' && (
        <TouchableOpacity 
          style={styles.deleteBtn} 
          onPress={() => deleteUser(item.id, item.email)}
        >
          <Trash2 size={18} color={colors.error} />
        </TouchableOpacity>
      )}

      <View style={[styles.roleBadge, { backgroundColor: item.role === 'admin' ? colors.secondary : colors.background, borderColor: colors.border, borderWidth: 1 }]}>
        <Text style={[styles.roleText, { color: item.role === 'admin' ? colors.primary : colors.textSecondary }]}>
          {(item.role || 'user').toUpperCase()}
        </Text>
      </View>
    </View>
  );

  return (
    <LinearGradient colors={colors.gradient} style={styles.container}>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={[styles.header, { borderBottomColor: 'rgba(255,255,255,0.1)' }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : colors.card }]}>
            <ChevronLeft size={24} color={colors.text} />
          </TouchableOpacity>
          <View>
            <Text style={[styles.headerTitle, { color: colors.text }]}>User Management</Text>
            <Text style={[styles.userCountLabel, { color: colors.textMuted }]}>{users.length} Users Found</Text>
          </View>
          <TouchableOpacity onPress={fetchUsers} style={[styles.iconBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : colors.card }]}>
            <RefreshCw size={20} color={colors.text} />
          </TouchableOpacity>
        </View>

        {users.length === 0 && !loading && (
          <View style={[styles.infoBanner, { backgroundColor: 'rgba(255,255,255,0.05)' }]}>
            <AlertCircle size={20} color={colors.primary} />
            <Text style={[styles.infoText, { color: colors.primary }]}>Missing profiles? Sync your current session.</Text>
            <TouchableOpacity style={[styles.syncBtn, { backgroundColor: colors.primary }]} onPress={syncMyProfile} disabled={syncing}>
              <Text style={[styles.syncBtnText, { color: '#000' }]}>{syncing ? 'Syncing...' : 'Sync Profile'}</Text>
            </TouchableOpacity>
          </View>
        )}

        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 50 }} />
        ) : (
          <FlatList
            data={users}
            renderItem={renderUserItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <UserIcon size={60} color={colors.border} />
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>No users in the system.</Text>
              </View>
            }
          />
        )}
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 24, paddingVertical: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1 },
  backBtn: { padding: 8, borderRadius: 12 },
  iconBtn: { padding: 8, borderRadius: 12 },
  headerTitle: { fontSize: 20, fontWeight: 'bold' },
  userCountLabel: { fontSize: 12, marginTop: 2 },
  infoBanner: { margin: 24, padding: 16, borderRadius: 16, alignItems: 'center', gap: 12 },
  infoText: { fontSize: 13, fontWeight: '500' },
  syncBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 },
  syncBtnText: { fontWeight: 'bold', fontSize: 13 },
  listContent: { padding: 24 },
  userCard: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 20, marginBottom: 12, borderWidth: 1 },
  avatarBox: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  userInfo: { flex: 1 },
  userEmail: { fontSize: 15, fontWeight: 'bold', marginBottom: 4 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  userDate: { fontSize: 12 },
  deleteBtn: { padding: 10, marginRight: 10 },
  roleBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  roleText: { fontSize: 9, fontWeight: 'bold' },
  emptyState: { alignItems: 'center', marginTop: 100 },
  emptyText: { marginTop: 16, fontSize: 16 },
});
