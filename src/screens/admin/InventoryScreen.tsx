import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, SafeAreaView, FlatList, TouchableOpacity,
  StyleSheet, Image, Alert, ActivityIndicator, Modal,
  TextInput, ScrollView, Platform
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { 
  ChevronLeft, Plus, Trash2, Edit3, 
  Search, X, Camera, Package,
  Eye, EyeOff, ShieldAlert
} from 'lucide-react-native';
import { supabase } from '../../lib/supabase';
import { useTheme, DarkTheme } from '../../context/ThemeContext';
import { useFocusEffect } from '@react-navigation/native';
import { adminService } from '../../services/adminService';
import { useAuth } from '../../hooks/useAuth';
import { furnitureService } from '../../services/furnitureService';
import * as ImagePicker from 'expo-image-picker';
import ImageCropperModal from '../../components/ImageCropperModal';

export default function InventoryScreen({ navigation, route }: any) {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const filter = route?.params?.filter;
  const [modalVisible, setModalVisible] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const { colors, isDark } = useTheme();
  const { user, role } = useAuth();

  useFocusEffect(
    useCallback(() => {
      if (role === 'admin' && user?.id) {
        adminService.logActivity(user.id, 'ADMIN_PAGE_VIEW', { 
          page: filter === 'hidden' ? 'Hidden Inventory' : 'Full Inventory' 
        });
      }
    }, [user, role, filter])
  );

  // Form State
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('Lounge');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [cropperVisible, setCropperVisible] = useState(false);
  const [tempImage, setTempImage] = useState('');

  useEffect(() => {
    fetchProducts();
  }, [filter]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      let data: any[];

      if (filter === 'hidden') {
        // Use dedicated service method — relies only on is_hidden column
        data = await furnitureService.getHidden();
      } else {
        // Admin sees ALL items in inventory (visible and hidden)
        const { data: allData, error } = await supabase
          .from('furniture')
          .select('*')
          .order('created_at', { ascending: false });
        if (error) throw error;
        data = allData || [];
      }

      setProducts(data);
    } catch (error) {
      console.error('Fetch error:', error);
      Alert.alert('Error', 'Could not load inventory');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setName('');
    setPrice('');
    setCategory('Lounge');
    setDescription('');
    setImageUrl('');
    setEditingProduct(null);
  };

  const handleEdit = (product: any) => {
    setEditingProduct(product);
    setName(product.name);
    setPrice(product.price.toString());
    setCategory(product.category);
    setDescription(product.description || '');
    setImageUrl(product.image_url || '');
    setModalVisible(true);
  };

  const saveProduct = async () => {
    if (!name || !price) {
      Alert.alert('Error', 'Please fill in required fields');
      return;
    }

    try {
      setSubmitting(true);
      
      let finalImageUrl = imageUrl;
      // If image is a local file (not starting with http), upload it
      if (imageUrl && !imageUrl.startsWith('http')) {
        finalImageUrl = await furnitureService.uploadImage(imageUrl);
      }

      const isHidden = editingProduct ? (editingProduct.is_hidden ?? false) : false;
      const payload = {
        name,
        price: parseFloat(price),
        category,
        description,
        image_url: finalImageUrl,
        is_hidden: isHidden,
        // Note: 'visible' column does not exist in schema — do not include it
      };

      if (editingProduct) {
        await furnitureService.update(editingProduct.id, payload, user?.id || '');
      } else {
        await furnitureService.add(payload, user?.id || '');
      }

      setModalVisible(false);
      resetForm();
      fetchProducts();
      Alert.alert('Success', `Product ${editingProduct ? 'updated' : 'added'} successfully`);
    } catch (error: any) {
      console.error('Save error:', error);
      Alert.alert('Error', error.message || 'Failed to save product');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, productName: string) => {
    const msg = `Are you sure you want to permanently remove "${productName}" from inventory? This cannot be undone.`;

    const executeDelete = async () => {
      try {
        // Optimistic: remove from list immediately for instant feedback
        setProducts(prev => prev.filter(p => p.id !== id));
        await furnitureService.delete(id, productName, user?.id || '');
        // Refresh to confirm sync with DB
        fetchProducts();
      } catch (error: any) {
        console.error('Delete error:', error);
        Alert.alert('Error', error.message || 'Failed to delete product');
        fetchProducts(); // Revert on error
      }
    };

    if (Platform.OS === 'web') {
      // Alert.alert callbacks are ignored on web — use window.confirm instead
      const confirmed = window.confirm(`Delete Product?\n\n${msg}`);
      if (confirmed) await executeDelete();
    } else {
      Alert.alert(
        'Delete Product',
        msg,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: executeDelete },
        ]
      );
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      if (Platform.OS === 'web') {
        setTempImage(result.assets[0].uri);
        setCropperVisible(true);
      } else {
        setImageUrl(result.assets[0].uri);
      }
    }
  };

  const handleCropComplete = (croppedUri: string) => {
    setImageUrl(croppedUri);
    setCropperVisible(false);
  };

  const toggleVisibility = async (item: any) => {
    // Use ONLY is_hidden — the single source of truth per DB schema
    const isCurrentlyHidden = item.is_hidden === true;
    const nextHiddenStatus = !isCurrentlyHidden;
    const actionLabel = isCurrentlyHidden ? 'Unhide' : 'Hide';
    const actionMsg = isCurrentlyHidden
      ? `"${item.name}" will become VISIBLE to all users in the store.`
      : `"${item.name}" will be HIDDEN from all users. They will not see it.`;

    // ⚠️ Alert.alert callbacks don't fire on React Native Web — use window.confirm instead
    const executeToggle = async () => {
      try {
        if (filter === 'hidden' && isCurrentlyHidden) {
          // Optimistic: remove from hidden list immediately
          setProducts(prev => prev.filter(p => p.id !== item.id));
        } else {
          // Optimistic: flip the flag locally
          setProducts(prev => prev.map(p =>
            p.id === item.id ? { ...p, is_hidden: nextHiddenStatus } : p
          ));
        }

        await furnitureService.toggleVisibility(
          item.id,
          nextHiddenStatus,
          user?.id || '',
          item.name
        );

        // Sync with DB to confirm
        fetchProducts();
      } catch (error: any) {
        console.error('toggleVisibility error:', error);
        Alert.alert('Error', error.message || 'Failed to update visibility');
        fetchProducts(); // Revert on error
      }
    };

    if (Platform.OS === 'web') {
      // On web, Alert.alert callbacks are ignored — use native confirm dialog
      const confirmed = window.confirm(`${actionLabel} Item?\n\n${actionMsg}`);
      if (confirmed) await executeToggle();
    } else {
      // On native (iOS/Android), use the proper Alert with styled buttons
      Alert.alert(
        `${actionLabel} Item?`,
        actionMsg,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: actionLabel,
            style: isCurrentlyHidden ? 'default' : 'destructive',
            onPress: executeToggle,
          },
        ]
      );
    }
  };

  const renderProductItem = ({ item }: any) => {
    // Only check is_hidden — the sole column that exists in the DB schema
    const isHidden = item.is_hidden === true;
    return (
      <View style={[
        styles.productCard,
        { backgroundColor: colors.card, borderColor: isHidden && filter !== 'hidden' ? '#F59E0B' : colors.border }
      ]}>
        <View style={[styles.imageContainer, { backgroundColor: colors.card, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 }]}>
          <Image 
            source={item.image_url ? { uri: item.image_url } : require('../../../assets/products/emerald_chair.png')} 
            style={styles.cardImage}
            resizeMode="cover"
          />
        </View>

        {/* Product Info */}
        <View style={styles.cardContent}>
          <View style={styles.nameRow}>
            <Text style={[styles.cardName, { color: isHidden ? colors.textMuted : colors.text }]} numberOfLines={1}>
              {item.name}
            </Text>
            {isHidden && (
              <View style={styles.hiddenBadge}>
                <EyeOff size={9} color="#D97706" />
                <Text style={styles.hiddenBadgeText}>HIDDEN</Text>
              </View>
            )}
          </View>
          <Text style={[styles.cardCategory, { color: colors.textMuted }]}>{item.category}</Text>
          <Text style={[styles.cardPrice, { color: isHidden ? colors.textMuted : colors.primary }]}>${item.price}</Text>
        </View>

        {/* Actions */}
        <View style={styles.cardActions}>
          {/* Eye Toggle — the core hide/unhide button */}
          <TouchableOpacity 
            style={[
              styles.actionBtn,
              isHidden
                ? styles.actionBtnHidden   // amber = currently hidden, tap to unhide
                : styles.actionBtnVisible  // green = currently visible, tap to hide
            ]}
            onPress={() => toggleVisibility(item)}
          >
            {isHidden
              ? <EyeOff size={16} color="#D97706" />
              : <Eye size={16} color="#16A34A" />}
          </TouchableOpacity>

          {/* Edit & Delete only on full inventory view */}
          {filter !== 'hidden' && (
            <>
              <TouchableOpacity 
                style={[styles.actionBtn, { backgroundColor: colors.secondary }]}
                onPress={() => handleEdit(item)}
              >
                <Edit3 size={16} color={colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.actionBtn, { backgroundColor: '#FEE2E2' }]}
                onPress={() => handleDelete(item.id, item.name)}
              >
                <Trash2 size={16} color="#EF4444" />
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    );
  };

  return (
    <LinearGradient colors={colors.gradient} style={styles.container}>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : colors.card }]}>
            <ChevronLeft size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>
            {filter === 'hidden' ? 'Hidden Items' : 'Inventory'}
          </Text>
          {filter !== 'hidden' && (
            <TouchableOpacity 
              style={[styles.addBtn, { backgroundColor: colors.primary }]}
              onPress={() => {
                resetForm();
                setModalVisible(true);
              }}
            >
              <Plus size={24} color="white" />
            </TouchableOpacity>
          )}
          {filter === 'hidden' && <View style={{ width: 44 }} />}
        </View>

      {/* Hidden Items Summary Banner */}
      {filter === 'hidden' && !loading && (
        <View style={[styles.hiddenBanner, { backgroundColor: '#FEF3C7', borderColor: '#F59E0B' }]}>
          <ShieldAlert size={16} color="#D97706" />
          <Text style={styles.hiddenBannerText}>
            {products.length === 0
              ? 'All items are visible to users'
              : `${products.length} item${products.length !== 1 ? 's' : ''} hidden from users — tap 👁 to unhide`}
          </Text>
        </View>
      )}

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={products}
          renderItem={renderProductItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Eye size={64} color={colors.border} />
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                {filter === 'hidden' ? 'No hidden items — all products are visible to users' : 'No products in inventory'}
              </Text>
            </View>
          }
        />
      )}

      {/* Add/Edit Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {editingProduct ? 'Edit Product' : 'Add New Product'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <X size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <TouchableOpacity style={[styles.imagePicker, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={pickImage}>
                {imageUrl ? (
                  <Image source={{ uri: imageUrl }} style={styles.pickedImage} />
                ) : (
                  <View style={styles.imagePlaceholder}>
                    <Camera size={32} color={colors.textMuted} />
                    <Text style={{ color: colors.textMuted, marginTop: 8 }}>Select Image</Text>
                  </View>
                )}
              </TouchableOpacity>

              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Product Name *</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
                  value={name}
                  onChangeText={setName}
                  placeholder="e.g. Modern Velvet Chair"
                  placeholderTextColor={colors.textMuted}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Price ($) *</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
                  value={price}
                  onChangeText={setPrice}
                  keyboardType="numeric"
                  placeholder="299.99"
                  placeholderTextColor={colors.textMuted}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Category</Text>
                <View style={styles.categoryChips}>
                  {['Lounge', 'Office', 'Dining', 'Bedroom'].map(cat => (
                    <TouchableOpacity
                      key={cat}
                      onPress={() => setCategory(cat)}
                      style={[
                        styles.chip,
                        { backgroundColor: colors.card, borderColor: colors.border },
                        category === cat && { backgroundColor: colors.primary, borderColor: colors.primary }
                      ]}
                    >
                      <Text style={[styles.chipText, { color: colors.textSecondary }, category === cat && { color: 'white' }]}>
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Description</Text>
                <TextInput
                  style={[styles.input, styles.textArea, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
                  value={description}
                  onChangeText={setDescription}
                  multiline
                  numberOfLines={4}
                  placeholder="Describe the product..."
                  placeholderTextColor={colors.textMuted}
                />
              </View>

              <TouchableOpacity 
                style={[styles.saveBtn, { backgroundColor: colors.primary }]}
                onPress={saveProduct}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.saveBtnText}>Save Product</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

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
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: { width: 44, height: 44, justifyContent: 'center' },
  title: { fontSize: 20, fontWeight: 'bold' },
  addBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  list: { 
    padding: 16,
    maxWidth: 1000,
    width: '100%',
    alignSelf: 'center',
  },
  productCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    overflow: 'visible', // Allow shadow to show
  },
  imageContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    backgroundColor: '#EEF0F2', // Premium spotlight background
  },
  cardImage: { 
    width: '100%', 
    height: '100%', 
    borderRadius: 36,
    resizeMode: 'cover',
    transform: [{ scale: 0.85 }]
  },
  cardContent: { flex: 1, marginLeft: 16 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 2 },
  cardName: { fontSize: 17, fontWeight: 'bold' },
  hiddenBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  hiddenBadgeText: { fontSize: 9, fontWeight: '900', color: '#D97706' },
  cardCategory: { fontSize: 11, marginBottom: 4, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  cardPrice: { fontSize: 20, fontWeight: '900' },
  cardActions: { flexDirection: 'row', gap: 6 },
  actionBtn: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  actionBtnHidden: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FEF3C7' },
  actionBtnVisible: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center', backgroundColor: '#DCFCE7' },
  hiddenBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  hiddenBannerText: { fontSize: 12, fontWeight: '600', color: '#D97706', flex: 1 },
  emptyContainer: { alignItems: 'center', marginTop: 100 },
  emptyText: { marginTop: 16, fontSize: 14, fontWeight: '600', textAlign: 'center', paddingHorizontal: 32 },
  
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    height: '85%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: { fontSize: 20, fontWeight: 'bold' },
  imagePicker: {
    height: 180,
    borderRadius: 16,
    borderWidth: 2,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    overflow: 'hidden',
  },
  pickedImage: { width: '100%', height: '100%' },
  imagePlaceholder: { alignItems: 'center' },
  formGroup: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 6 },
  input: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    fontSize: 15,
  },
  textArea: { height: 80, textAlignVertical: 'top' },
  categoryChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, borderWidth: 1 },
  chipText: { fontSize: 13, fontWeight: '600' },
  saveBtn: {
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 32,
  },
  saveBtnText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
});
