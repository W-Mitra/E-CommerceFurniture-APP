import React, { useState, useEffect, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { View, Text, SafeAreaView, TouchableOpacity, StyleSheet, Switch, ScrollView } from 'react-native';
import { Bell, Eye, Moon, Globe, Shield, Smartphone, ChevronRight } from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../hooks/useAuth';
import { adminService } from '../../services/adminService';

export default function AdminSettingsScreen({ navigation }: any) {
  const { user, role } = useAuth();
  const { theme, isDark, colors, toggleTheme } = useTheme();

  useFocusEffect(
    useCallback(() => {
      if (role === 'admin' && user?.id) {
        adminService.logActivity(user.id, 'ADMIN_PAGE_VIEW', { page: 'Admin Settings' });
      }
    }, [user, role])
  );

  const [settings, setSettings] = useState({
    pushNotifications: true,
    emailAlerts: true,
    storeVisibility: true,
    analytics: true,
  });

  const toggleSetting = (key: keyof typeof settings) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const SettingRow = ({ icon: Icon, label, sub, value, onToggle }: any) => (
    <View style={[styles.row, { borderBottomColor: colors.border }]}>
      <View style={[styles.rowIcon, { backgroundColor: colors.secondary }]}>
        <Icon size={20} color={colors.primary} />
      </View>
      <View style={styles.rowContent}>
        <Text style={[styles.rowLabel, { color: colors.text }]}>{label}</Text>
        {sub && <Text style={[styles.rowSub, { color: colors.textMuted }]}>{sub}</Text>}
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: '#E5E7EB', true: colors.primary }}
        thumbColor="white"
      />
    </View>
  );

  const LinkRow = ({ icon: Icon, label, sub, onPress }: any) => (
    <TouchableOpacity 
      style={[styles.row, { borderBottomColor: colors.border }]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <View style={[styles.rowIcon, { backgroundColor: colors.secondary }]}>
        <Icon size={20} color={colors.primary} />
      </View>
      <View style={styles.rowContent}>
        <Text style={[styles.rowLabel, { color: colors.text }]}>{label}</Text>
        {sub && <Text style={[styles.rowSub, { color: colors.textMuted }]}>{sub}</Text>}
      </View>
      <ChevronRight size={20} color={colors.textMuted} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Settings</Text>
        <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>System-wide configuration</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Notifications</Text>
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <SettingRow 
            icon={Bell} 
            label="Push Notifications" 
            sub="Receive alerts for new orders" 
            value={settings.pushNotifications}
            onToggle={() => toggleSetting('pushNotifications')}
          />
          <SettingRow 
            icon={Globe} 
            label="Email Summary" 
            sub="Weekly performance reports" 
            value={settings.emailAlerts}
            onToggle={() => toggleSetting('emailAlerts')}
          />
        </View>

        <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Store Management</Text>
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <SettingRow 
            icon={Eye} 
            label="Store Visibility" 
            sub="Toggle public access to catalog" 
            value={settings.storeVisibility}
            onToggle={() => toggleSetting('storeVisibility')}
          />
          <LinkRow 
            icon={Shield} 
            label="Security Policies" 
            sub="Manage data protection rules"
            onPress={() => navigation.navigate('SecurityPolicies')}
          />
        </View>

        <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Appearance & App</Text>
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <SettingRow 
            icon={Moon} 
            label="Dark Mode" 
            sub="Easier on your eyes at night" 
            value={isDark}
            onToggle={toggleTheme}
          />
          <SettingRow 
            icon={Smartphone} 
            label="Usage Analytics" 
            sub="Help us improve the admin tools" 
            value={settings.analytics}
            onToggle={() => toggleSetting('analytics')}
          />
        </View>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.textMuted }]}>Device ID: AD-99-4B-12</Text>
          <Text style={[styles.footerText, { color: colors.textMuted }]}>Last Sync: Just Now</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 24 },
  headerTitle: { fontSize: 32, fontWeight: 'bold' },
  headerSubtitle: { fontSize: 14 },
  
  scrollContent: { paddingHorizontal: 24, paddingBottom: 100 },
  sectionTitle: { fontSize: 14, fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 12, marginTop: 24, marginLeft: 4 },
  card: { borderRadius: 24, padding: 8 },
  row: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1 },
  rowIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  rowContent: { flex: 1 },
  rowLabel: { fontSize: 16, fontWeight: 'bold' },
  rowSub: { fontSize: 12, marginTop: 2 },
  
  footer: { marginTop: 40, alignItems: 'center' },
  footerText: { fontSize: 12, marginBottom: 4 },
});
