import React, { useState, useEffect, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { 
  View, Text, SafeAreaView, TouchableOpacity, StyleSheet, 
  Image, ScrollView, Alert, ActivityIndicator, TextInput, Platform 
} from 'react-native';
import { User, Mail, Shield, Camera, ChevronRight, LogOut, Key, Settings, Bell } from 'lucide-react-native';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../../context/ThemeContext';
import { adminService } from '../../services/adminService';
import ImageCropperModal from '../../components/ImageCropperModal';

export default function AdminProfileScreen({ navigation }: any) {
  const { user, profile, role, signOut, refreshProfile } = useAuth();
  const { colors, isDark } = useTheme();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [newUsername, setNewUsername] = useState(profile?.username || '');
  const [cropperVisible, setCropperVisible] = useState(false);
  const [tempImage, setTempImage] = useState('');

  useFocusEffect(
    useCallback(() => {
      if (role === 'admin' && user?.id) {
        adminService.logActivity(user.id, 'ADMIN_PAGE_VIEW', { page: 'Admin Profile' });
      }
    }, [user, role])
  );

  useEffect(() => {
    if (profile?.username) setNewUsername(profile.username);
  }, [profile]);

  const handleUpdateProfile = async () => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from('profiles')
        .update({ username: newUsername })
        .eq('id', user?.id);

      if (error) throw error;
      await refreshProfile();
      Alert.alert('Success', 'Profile updated successfully!');
      setIsEditing(false);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
        base64: true, // Request base64 for reliable mobile uploads
      });

      if (!result.canceled) {
        if (Platform.OS === 'web') {
          setTempImage(result.assets[0].uri);
          setCropperVisible(true);
        } else {
          // Pass both URI and Base64
          uploadAvatar(result.assets[0].uri, result.assets[0].base64);
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const uploadAvatar = async (uri: string, base64?: string | null) => {
    try {
      setUploading(true);
      const filename = `${user?.id}-${Date.now()}.jpg`;
      
      let uploadBody: any;
      
      if (Platform.OS === 'web') {
        const response = await fetch(uri);
        uploadBody = await response.blob();
      } else if (base64) {
        // Use base64 conversion for mobile - very reliable
        const { decode } = require('base64-arraybuffer');
        uploadBody = decode(base64);
      } else {
        // Fallback to fetch blob if no base64
        const response = await fetch(uri);
        uploadBody = await response.blob();
      }

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filename, uploadBody, {
          contentType: 'image/jpeg',
          upsert: true
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filename);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user?.id);

      if (updateError) throw updateError;
      
      // Log the activity
      await adminService.logActivity(user?.id || '', 'UPDATE_PROFILE_IMAGE', {
        user_id: user?.id,
        email: user?.email,
        type: 'admin_profile',
        new_url: publicUrl
      });
      
      await refreshProfile();
      Alert.alert('Success', 'Profile picture updated!');
    } catch (error: any) {
      console.error('Upload Error:', error);
      Alert.alert('Upload Error', error.message || 'Check your internet connection');
    } finally {
      setUploading(false);
    }
  };

  const handleCropComplete = (croppedUri: string) => {
    setCropperVisible(false);
    uploadAvatar(croppedUri);
  };

  const handleSignOut = async () => {
    if (Platform.OS === 'web') {
      await signOut();
      return;
    }

    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out of the admin console?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Sign Out', 
          style: 'destructive',
          onPress: async () => {
            await signOut();
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Account Header */}
        <View style={styles.topHeader}>
          <Text style={[styles.title, { color: colors.text }]}>Account</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity 
              style={[styles.headerIcon, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => Alert.alert('Notifications', 'You have no new notifications.')}
            >
              <Bell size={20} color={colors.text} />
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.headerIcon, { backgroundColor: '#22C55E' }]}
              onPress={() => navigation.navigate('AdminSettings')}
            >
              <Settings size={20} color="white" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Profile Header */}
        <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border, borderBottomWidth: 1 }]}>
          <View style={styles.avatarContainer}>
            <Image 
              source={{ uri: profile?.avatar_url || 'https://ui-avatars.com/api/?name=' + (profile?.username || 'Admin') }} 
              style={[styles.avatar, { borderColor: colors.secondary }]} 
              resizeMode="cover"
            />
            <TouchableOpacity style={[styles.cameraBtn, { backgroundColor: colors.primary }]} onPress={pickImage} disabled={uploading}>
              {uploading ? <ActivityIndicator size="small" color="white" /> : <Camera size={14} color={isDark ? colors.background : 'white'} />}
            </TouchableOpacity>
          </View>
          <Text style={[styles.username, { color: colors.text }]}>{profile?.username || 'Admin User'}</Text>
          <View style={[styles.roleBadge, { backgroundColor: colors.secondary }]}>
            <Shield size={10} color={colors.primary} />
            <Text style={[styles.roleText, { color: colors.primary }]}>Administrator</Text>
          </View>
        </View>

        {/* Info Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Account Information</Text>
            <TouchableOpacity onPress={() => setIsEditing(!isEditing)}>
              <Text style={[styles.editBtnText, { color: colors.primary }]}>{isEditing ? 'Cancel' : 'Edit'}</Text>
            </TouchableOpacity>
          </View>
          
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]}>
            <View style={[styles.row, { borderBottomColor: colors.border }]}>
              <View style={styles.rowContent}>
                <Text style={[styles.rowLabel, { color: colors.textMuted }]}>Username</Text>
                {isEditing ? (
                  <View style={styles.inputContainer}>
                    <TextInput 
                      style={[styles.input, { color: colors.text }]}
                      value={newUsername}
                      onChangeText={setNewUsername}
                      placeholder="Enter username"
                      placeholderTextColor={colors.textMuted}
                      autoFocus
                    />
                    <TouchableOpacity onPress={handleUpdateProfile} disabled={loading}>
                      {loading ? <ActivityIndicator size="small" color={colors.primary} /> : <Text style={[styles.saveText, { color: colors.primary }]}>Save</Text>}
                    </TouchableOpacity>
                  </View>
                ) : (
                  <Text style={[styles.rowValue, { color: colors.text }]}>{profile?.username || 'Not set'}</Text>
                )}
              </View>
            </View>
            <View style={[styles.row, styles.noBorder]}>
              <View style={styles.rowContent}>
                <Text style={[styles.rowLabel, { color: colors.textMuted }]}>Email</Text>
                <Text style={[styles.rowValue, { color: colors.text }]}>{user?.email}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Security Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Security</Text>
          <TouchableOpacity style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]} onPress={() => Alert.alert('Security', 'Password reset email sent!')}>
            <View style={[styles.row, styles.noBorder]}>
              <View style={styles.rowContent}>
                <Text style={[styles.rowLabel, { color: colors.textMuted }]}>Change Password</Text>
                <Text style={[styles.rowSub, { color: colors.text }]}>Update security credentials</Text>
              </View>
              <ChevronRight size={18} color={colors.textMuted} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Actions */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleSignOut}>
          <LogOut size={18} color="#EF4444" />
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>

        <Text style={[styles.version, { color: colors.textMuted }]}>Admin v1.0.4</Text>
      </ScrollView>

      {/* Web Cropper Modal */}
      {Platform.OS === 'web' && (
        <ImageCropperModal
          visible={cropperVisible}
          image={tempImage}
          onClose={() => setCropperVisible(false)}
          onCropComplete={handleCropComplete}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: {
    paddingBottom: 120, // Added space for custom tab bar
    maxWidth: 500,
    width: '100%',
    alignSelf: 'center',
  },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginTop: 8,
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
  header: { alignItems: 'center', paddingVertical: 48, borderBottomLeftRadius: 40, borderBottomRightRadius: 40 },
  avatarContainer: { position: 'relative', marginBottom: 16 },
  avatar: { width: 120, height: 120, borderRadius: 60, borderWidth: 3 },
  cameraBtn: { 
    position: 'absolute', bottom: 4, right: 4, 
    width: 36, height: 36, 
    borderRadius: 18, justifyContent: 'center', alignItems: 'center',
    borderWidth: 3, borderColor: 'white'
  },
  username: { fontSize: 24, fontWeight: 'bold', marginBottom: 8 },
  roleBadge: { 
    flexDirection: 'row', alignItems: 'center', gap: 6, 
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 
  },
  roleText: { fontSize: 11, fontWeight: 'bold', textTransform: 'uppercase' },

  section: { paddingHorizontal: 20, marginTop: 32 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingHorizontal: 4 },
  sectionTitle: { fontSize: 14, fontWeight: 'bold', textTransform: 'uppercase' },
  editBtnText: { fontSize: 14, fontWeight: 'bold' },
  card: { borderRadius: 20, padding: 8 },
  row: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1 },
  noBorder: { borderBottomWidth: 0 },
  rowContent: { flex: 1 },
  rowLabel: { fontSize: 13, marginBottom: 4 },
  rowValue: { fontSize: 17, fontWeight: '600' },
  rowSub: { fontSize: 15, fontWeight: '500' },

  inputContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  input: { fontSize: 17, fontWeight: '600', flex: 1, padding: 0 },
  saveText: { fontSize: 15, fontWeight: 'bold', marginLeft: 16 },

  logoutBtn: { 
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginTop: 32, marginHorizontal: 16, paddingVertical: 16, 
    backgroundColor: '#FEF2F2', borderRadius: 14, borderWidth: 1, borderColor: '#FEE2E2' 
  },
  logoutText: { color: '#EF4444', fontWeight: 'bold', fontSize: 15 },
  version: { textAlign: 'center', marginTop: 20, marginBottom: 40, fontSize: 11 },
});
