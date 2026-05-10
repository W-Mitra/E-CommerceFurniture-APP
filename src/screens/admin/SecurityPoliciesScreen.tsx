import React, { useState, useEffect, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { 
  View, Text, SafeAreaView, ScrollView, StyleSheet, 
  TouchableOpacity, Switch, Alert, Platform, ActivityIndicator 
} from 'react-native';
import { 
  ShieldCheck, Lock, Eye, Key, 
  Smartphone, FileText, ChevronLeft, AlertCircle 
} from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../hooks/useAuth';
import { adminService } from '../../services/adminService';
import { supabase } from '../../lib/supabase';
export default function SecurityPoliciesScreen({ navigation }: any) {
  const { user, role } = useAuth();
  const { colors, isDark } = useTheme();

  useFocusEffect(
    useCallback(() => {
      if (role === 'admin' && user?.id) {
        adminService.logActivity(user.id, 'ADMIN_PAGE_VIEW', { page: 'Security Policies' });
      }
    }, [user, role])
  );

  const [policies, setPolicies] = useState({
    twoFactor: true,
    autoLogout: false,
    biometricAuth: true,
    strictPasswords: true,
    dataEncryption: true,
    auditLogging: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchPolicies();
  }, []);

  const fetchPolicies = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'security_policies')
        .single();
      
      if (error && error.code !== 'PGRST116') throw error; // PGRST116 is empty result
      if (data?.value) {
        setPolicies(data.value);
      }
    } catch (error: any) {
      console.error('Fetch policies error:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSavePolicies = async () => {
    try {
      setSaving(true);
      const { error } = await supabase
        .from('app_settings')
        .upsert({ 
          key: 'security_policies', 
          value: policies,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      if (user?.id) {
        await adminService.logActivity(user.id, 'SECURITY_POLICY_UPDATE', policies);
      }

      Alert.alert('Success', 'Security policies updated and logged. ✨');
    } catch (error: any) {
      Alert.alert('Error', 'Failed to save policies: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const togglePolicy = (key: keyof typeof policies, label: string) => {
    setPolicies(prev => ({ ...prev, [key]: !prev[key] }));
    // Accessibility announcement could go here for screen readers
  };

  const PolicyCard = ({ 
    icon: Icon, 
    title, 
    description, 
    value, 
    onToggle, 
    isLast = false 
  }: any) => (
    <View 
      style={[
        styles.policyRow, 
        { borderBottomColor: colors.border },
        isLast && { borderBottomWidth: 0 }
      ]}
      accessible={true}
      accessibilityRole="switch"
      accessibilityLabel={`${title}. ${description}`}
      accessibilityState={{ checked: value }}
    >
      <View style={[styles.iconBox, { backgroundColor: colors.secondary }]}>
        <Icon size={22} color={colors.primary} />
      </View>
      <View style={styles.policyInfo}>
        <Text style={[styles.policyTitle, { color: colors.text }]}>{title}</Text>
        <Text style={[styles.policyDesc, { color: colors.textSecondary }]}>{description}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: isDark ? '#374151' : '#E5E7EB', true: colors.primary }}
        thumbColor={Platform.OS === 'ios' ? undefined : (value ? 'white' : '#F3F4F6')}
      />
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Custom Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()} 
          style={[styles.backBtn, { backgroundColor: colors.card }]}
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <ChevronLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]} accessibilityRole="header">Security Policies</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Security Status Banner */}
        <View style={[styles.statusBanner, { backgroundColor: colors.secondary }]}>
          <View style={styles.statusHeader}>
            <ShieldCheck size={24} color={colors.primary} />
            <Text style={[styles.statusTitle, { color: colors.primary }]}>
              System Health: {loading ? 'Checking...' : 'Optimal'}
            </Text>
          </View>
          <Text style={[styles.statusDesc, { color: colors.textSecondary }]}>
            {loading 
              ? 'Retrieving latest security protocols from server...' 
              : 'Your administrative security protocols are active and protecting store data.'}
          </Text>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
        ) : (
          <>
            {/* Authentication Section */}
            <Text style={[styles.sectionHeader, { color: colors.textMuted }]} accessibilityRole="header">Access Control</Text>
            <View style={[styles.card, { backgroundColor: colors.card }]}>
              <PolicyCard
                icon={Smartphone}
                title="Two-Factor Auth (2FA)"
                description="Requires an OTP code during admin login."
                value={policies.twoFactor}
                onToggle={() => togglePolicy('twoFactor', 'Two-Factor Authentication')}
              />
              <PolicyCard
                icon={Key}
                title="Biometric Login"
                description="Use FaceID or Fingerprint to unlock admin tools."
                value={policies.biometricAuth}
                onToggle={() => togglePolicy('biometricAuth', 'Biometric Login')}
              />
              <PolicyCard
                icon={Lock}
                title="Auto-Logout"
                description="Log out automatically after 15 mins of inactivity."
                value={policies.autoLogout}
                onToggle={() => togglePolicy('autoLogout', 'Auto-Logout')}
                isLast={true}
              />
            </View>

            {/* Data Security Section */}
            <Text style={[styles.sectionHeader, { color: colors.textMuted }]} accessibilityRole="header">Data & Privacy</Text>
            <View style={[styles.card, { backgroundColor: colors.card }]}>
              <PolicyCard
                icon={ShieldCheck}
                title="Data Encryption"
                description="Encrypt all customer PII at rest and in transit."
                value={policies.dataEncryption}
                onToggle={() => togglePolicy('dataEncryption', 'Data Encryption')}
              />
              <PolicyCard
                icon={FileText}
                title="Advanced Auditing"
                description="Log every single change made to the inventory."
                value={policies.auditLogging}
                onToggle={() => togglePolicy('auditLogging', 'Advanced Auditing')}
              />
              <PolicyCard
                icon={Eye}
                title="Mask Sensitive Data"
                description="Hide full emails and phone numbers in lists."
                value={policies.strictPasswords}
                onToggle={() => togglePolicy('strictPasswords', 'Sensitive Data Masking')}
                isLast={true}
              />
            </View>

            {/* Info Box */}
            <View style={[styles.infoBox, { backgroundColor: isDark ? colors.background : '#F0F9FF' }]}>
              <AlertCircle size={20} color="#3B82F6" />
              <Text style={[styles.infoText, { color: isDark ? colors.textSecondary : '#1E40AF' }]}>
                Compliance Tip: Regularly rotate your admin credentials and review activity logs to maintain PCI-DSS compliance.
              </Text>
            </View>

            <TouchableOpacity 
              style={[styles.saveBtn, { backgroundColor: colors.primary, opacity: saving ? 0.7 : 1 }]}
              onPress={handleSavePolicies}
              disabled={saving}
              accessibilityRole="button"
              accessibilityLabel="Save security policies"
            >
              {saving ? (
                <ActivityIndicator color={isDark ? colors.background : 'white'} />
              ) : (
                <Text style={[styles.saveBtnText, { color: isDark ? colors.background : 'white' }]}>Save Policy Changes</Text>
              )}
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { 
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 24, paddingVertical: 16, borderBottomWidth: 1
  },
  backBtn: { padding: 8, borderRadius: 12 },
  headerTitle: { fontSize: 20, fontWeight: 'bold' },

  scrollContent: { paddingHorizontal: 24, paddingBottom: 60 },
  
  statusBanner: { padding: 20, borderRadius: 24, marginTop: 24, marginBottom: 32 },
  statusHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  statusTitle: { fontSize: 16, fontWeight: 'bold' },
  statusDesc: { fontSize: 13, lineHeight: 18 },

  sectionHeader: { fontSize: 13, fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 12, marginLeft: 4 },
  card: { borderRadius: 24, padding: 8, marginBottom: 32 },
  
  policyRow: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1 },
  iconBox: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  policyInfo: { flex: 1, marginRight: 12 },
  policyTitle: { fontSize: 15, fontWeight: 'bold', marginBottom: 2 },
  policyDesc: { fontSize: 12, lineHeight: 16 },

  infoBox: { 
    flexDirection: 'row', gap: 12, padding: 16, 
    borderRadius: 20, marginBottom: 32, borderWidth: 1, borderColor: '#3B82F633' 
  },
  infoText: { flex: 1, fontSize: 12, lineHeight: 18 },

  saveBtn: { 
    paddingVertical: 18, borderRadius: 20, 
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1, shadowRadius: 10, elevation: 5
  },
  saveBtnText: { fontSize: 16, fontWeight: 'bold' }
});
