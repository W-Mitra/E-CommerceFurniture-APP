import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, SafeAreaView, FlatList, TouchableOpacity,
  StyleSheet, TextInput, Image, Dimensions, ActivityIndicator,
  ScrollView
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Search, Heart, ShoppingBag, SlidersHorizontal, Bell } from 'lucide-react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useFurnitureStore } from '../store/useFurnitureStore';
import { furnitureService } from '../services/furnitureService';
import { useTheme } from '../context/ThemeContext';

const { width } = Dimensions.get('window');
const COLUMN_WIDTH = (width - 64) / 2;

// Fallback images pool
const IMAGE_POOL = [
  require('../../assets/products/emerald_chair.png'),
  require('../../assets/products/orange_chair.png'),
  require('../../assets/products/chair1.png'),
  require('../../assets/products/chair2.png'),
  require('../../assets/products/chair3.png'),
  require('../../assets/products/wood_chair.png'),
  require('../../assets/products/upholstered_chair.jpg'),
];

export default function CatalogScreen() {
  const navigation = useNavigation<any>();
  const { colors, isDark } = useTheme();
  const [products, setProducts] = useState<any[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');

  const { toggleFavorite, isFavorite } = useFurnitureStore();

  useFocusEffect(
    useCallback(() => {
      fetchProducts();
    }, [])
  );

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const data = await furnitureService.getVisible();
      
      if (!data || data.length === 0) {
        // Fallback to demos if DB is empty
        const demos = [
          { id: '1', name: 'Orris Chair', price: 320, category: 'Lounge' },
          { id: '2', name: 'Elvo Armchair', price: 500, category: 'Lounge' },
          { id: '3', name: 'Mollis Sofa', price: 320, category: 'Lounge' },
          { id: '4', name: 'Kivi Chair', price: 245, category: 'Office' },
        ].map((p, i) => ({ ...p, imageIndex: i }));
        setProducts(demos);
        setFilteredProducts(demos);
      } else {
        const processed = data.map((p, i) => ({ ...p, imageIndex: i }));
        setProducts(processed);
        setFilteredProducts(processed);
      }
    } catch (error) {
      console.error('Fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (text: string) => {
    setSearch(text);
    const filtered = products.filter(p => 
      p.name.toLowerCase().includes(text.toLowerCase()) &&
      (activeCategory === 'All' || p.category === activeCategory)
    );
    setFilteredProducts(filtered);
  };

  const handleCategory = (cat: string) => {
    setActiveCategory(cat);
    const filtered = products.filter(p => 
      p.name.toLowerCase().includes(search.toLowerCase()) &&
      (cat === 'All' || p.category === cat)
    );
    setFilteredProducts(filtered);
  };

  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});

  const renderProduct = ({ item, index }: any) => {
    const hasError = imageErrors[item.id];
    const imageSource = (item.image_url && !hasError) 
      ? { uri: item.image_url } 
      : IMAGE_POOL[item.imageIndex % IMAGE_POOL.length];

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('ProductDetails', { product: item, productIndex: item.imageIndex })}
        activeOpacity={0.9}
      >
        <View style={[styles.imageContainer, { backgroundColor: isDark ? colors.card : '#F8F9F8' }]}>
          <Image
            source={imageSource}
            style={styles.productImage}
            resizeMode="cover"
            onError={() => {
              if (item.image_url) {
                setImageErrors(prev => ({ ...prev, [item.id]: true }));
              }
            }}
          />
          <View style={[styles.badge, { backgroundColor: isDark ? colors.secondary : 'rgba(255,255,255,0.9)' }]}>
            <Text style={[styles.badgeText, { color: colors.primary }]}>New</Text>
          </View>
          <TouchableOpacity
            onPress={() => toggleFavorite(item.id)}
            style={[styles.favoriteBtn, { backgroundColor: colors.card }]}
          >
            <Heart
              size={18}
              color={isFavorite(item.id) ? '#EF4444' : colors.text}
              fill={isFavorite(item.id) ? '#EF4444' : 'transparent'}
            />
          </TouchableOpacity>
        </View>
        <View style={styles.cardInfo}>
          <Text style={[styles.productCategory, { color: colors.textMuted }]}>{item.category}</Text>
          <Text style={[styles.productName, { color: colors.text }]} numberOfLines={1}>{item.name}</Text>
          <Text style={[styles.productPrice, { color: colors.primary }]}>${item.price}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <LinearGradient
      colors={colors.gradient}
      style={styles.container}
    >
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <View>
            <Text style={[styles.discover, { color: colors.textMuted }]}>Discover</Text>
            <Text style={[styles.title, { color: colors.text }]}>Furniture</Text>
          </View>
          <TouchableOpacity style={[styles.bellBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : colors.card, borderColor: colors.border }]}>
            <Bell size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

      <View style={styles.searchRow}>
        <View style={[styles.searchContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : colors.card, borderColor: colors.border }]}>
          <Search size={20} color={colors.textMuted} />
          <TextInput
            placeholder="Search unique furniture..."
            placeholderTextColor={colors.textMuted}
            style={[styles.searchInput, { color: colors.text }]}
            value={search}
            onChangeText={handleSearch}
          />
        </View>
        <TouchableOpacity style={[styles.filterBtn, { backgroundColor: colors.primary }]}>
          <SlidersHorizontal size={20} color={isDark ? colors.background : 'white'} />
        </TouchableOpacity>
      </View>

      <View style={styles.categoryRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
          {['All', 'Lounge', 'Office', 'Dining', 'Bedroom'].map(cat => (
            <TouchableOpacity
              key={cat}
              onPress={() => handleCategory(cat)}
              style={[
                styles.catChip, 
                { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : colors.card, borderColor: colors.border },
                activeCategory === cat && { backgroundColor: colors.primary, borderColor: colors.primary }
              ]}
            >
              <Text style={[
                styles.catChipText, 
                { color: colors.textSecondary },
                activeCategory === cat && { color: isDark ? colors.background : 'white' }
              ]}>
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          key={width > 1200 ? 'four-column' : (width > 600 ? 'three-column' : 'two-column')}
          data={filteredProducts}
          numColumns={width > 1200 ? 4 : (width > 600 ? 3 : 2)}
          renderItem={renderProduct}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          columnWrapperStyle={styles.columnWrapper}
          showsVerticalScrollIndicator={false}
        />
      )}
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 16, paddingTop: 16, marginBottom: 16,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'
  },
  discover: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1 },
  title: { fontSize: 24, fontWeight: 'bold' },
  bellBtn: { padding: 10, borderRadius: 12, borderWidth: 1 },
  
  searchRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 10, marginBottom: 16 },
  searchContainer: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 10, borderRadius: 14,
    borderWidth: 1
  },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 15 },
  filterBtn: { padding: 12, borderRadius: 14 },
 
  categoryRow: { marginBottom: 16 },
  categoryScroll: { paddingHorizontal: 16, gap: 8 },
  catChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, borderWidth: 1 },
  catChipText: { fontSize: 13, fontWeight: '600' },
 
  listContent: { paddingHorizontal: 16, paddingBottom: 120 },
  columnWrapper: { justifyContent: 'center', gap: 24, marginBottom: 24 },
  card: { 
    width: width > 1200 ? 240 : (width > 800 ? 220 : (width > 600 ? 200 : COLUMN_WIDTH)), 
    maxWidth: 260,
  },
  imageContainer: { 
    width: '100%',
    aspectRatio: 1,
    borderRadius: COLUMN_WIDTH, 
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#EEF0F2', // Premium spotlight background
  },
  productImage: { 
    width: '100%', 
    height: '100%', 
    borderRadius: COLUMN_WIDTH,
    transform: [{ scale: 0.85 }] // Professional padding within circle
  },
  badge: { position: 'absolute', top: 6, left: 6, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  badgeText: { fontSize: 8, fontWeight: 'bold' },
  favoriteBtn: { position: 'absolute', top: 6, right: 6, padding: 5, borderRadius: 8 },
  
  cardInfo: { marginTop: 6 },
  productCategory: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase', marginBottom: 2, letterSpacing: 0.5 },
  productName: { fontSize: 16, fontWeight: 'bold', marginBottom: 2 },
  productPrice: { fontSize: 16, fontWeight: '900' },
});
