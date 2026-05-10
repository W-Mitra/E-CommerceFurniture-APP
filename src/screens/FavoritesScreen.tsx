import React, { useState, useEffect } from 'react';
import {
  View, Text, SafeAreaView, FlatList, TouchableOpacity,
  StyleSheet, Dimensions, Image
} from 'react-native';
import { useFurnitureStore } from '../store/useFurnitureStore';
import { furnitureService } from '../services/furnitureService';
import { Heart, ShoppingBag, Trash2 } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';

const { width } = Dimensions.get('window');

export default function FavoritesScreen({ navigation }: any) {
  const { favorites, toggleFavorite, addToCart } = useFurnitureStore();
  const { colors, isDark } = useTheme();
  const [favoriteProducts, setFavoriteProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFavoriteProducts();
  }, [favorites]);

  const fetchFavoriteProducts = async () => {
    try {
      const allProducts = await furnitureService.getVisible();
      const filtered = (allProducts || []).filter((p: any) => favorites.includes(p.id));
      setFavoriteProducts(filtered);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

const IMAGE_POOL = [
  require('../../assets/products/emerald_chair.png'),
  require('../../assets/products/orange_chair.png'),
  require('../../assets/products/chair1.png'),
  require('../../assets/products/chair2.png'),
  require('../../assets/products/chair3.png'),
  require('../../assets/products/wood_chair.png'),
  require('../../assets/products/chair4.png'),
  require('../../assets/products/chair5.png'),
  require('../../assets/products/chair6.png'),
  require('../../assets/products/chair7.png'),
];

const getImage = (index: number) => IMAGE_POOL[index % IMAGE_POOL.length];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Favorites</Text>
        <View style={[styles.headerBadge, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Heart size={16} color={colors.primary} />
          <Text style={[styles.badgeText, { color: colors.text }]}>{favorites.length}</Text>
        </View>
      </View>

      {favoriteProducts.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={[styles.emptyIconContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Heart size={48} color={colors.textMuted} opacity={0.3} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No Favorites Yet</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>Tap the heart icon on any furniture to save it here.</Text>
          <TouchableOpacity
            style={[styles.shopButton, { backgroundColor: colors.primary }]}
            onPress={() => navigation.navigate('Catalog')}
          >
            <Text style={[styles.shopButtonText, { color: isDark ? colors.background : 'white' }]}>Browse Catalog</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={favoriteProducts}
          contentContainerStyle={styles.listContent}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          renderItem={({ item, index }) => (
            <TouchableOpacity
              style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => navigation.navigate('ProductDetails', { product: item })}
            >
              <View style={[styles.cardImage, { backgroundColor: isDark ? colors.background : '#F0F2F0' }]}>
                <Image
                  source={item.image_url ? { uri: item.image_url } : getImage(index)}
                  style={styles.itemImage}
                  resizeMode="cover"
                />
              </View>
              <View style={styles.cardInfo}>
                <Text style={[styles.cardName, { color: colors.text }]}>{item?.name || 'Furniture'}</Text>
                <Text style={[styles.cardPrice, { color: colors.primary }]}>${item?.price || 0}</Text>
                <TouchableOpacity
                  onPress={() => addToCart(item)}
                  style={[styles.addToCartBtn, { backgroundColor: colors.primary }]}
                >
                  <ShoppingBag size={14} color={isDark ? colors.background : 'white'} />
                  <Text style={[styles.addToCartText, { color: isDark ? colors.background : 'white' }]}>Add to Cart</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                onPress={() => toggleFavorite(item.id)}
                style={[styles.removeBtn, { backgroundColor: isDark ? colors.background : '#FEF2F2' }]}
              >
                <Trash2 size={18} color="#EF4444" />
              </TouchableOpacity>
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    maxWidth: 600,
    width: '100%',
    alignSelf: 'center',
  },
  headerTitle: { fontSize: 24, fontWeight: 'bold' },
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    gap: 6,
  },
  badgeText: { fontWeight: 'bold', fontSize: 12 },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
  emptyIconContainer: {
    width: 70, height: 70,
    borderRadius: 40, justifyContent: 'center', alignItems: 'center',
    marginBottom: 20, borderWidth: 1,
  },
  emptyTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 6 },
  emptySubtitle: { fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  shopButton: {
    paddingHorizontal: 24, paddingVertical: 16,
    borderRadius: 20,
  },
  shopButtonText: { fontWeight: 'bold', fontSize: 15 },
  listContent: { 
    paddingHorizontal: 16, 
    paddingBottom: 120,
    maxWidth: 1000,
    width: '100%',
    alignSelf: 'center',
  },
  card: {
    borderRadius: 20, padding: 12,
    marginBottom: 12, flexDirection: 'row', alignItems: 'center',
    borderWidth: 1,
  },
  cardImage: {
    width: 80, height: 80,
    borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginRight: 12,
    overflow: 'hidden',
  },
  itemImage: {
    width: '100%',
    height: '100%',
    borderRadius: 40,
    transform: [{ scale: 0.9 }],
  },
  cardInfo: { flex: 1 },
  cardName: { fontSize: 15, fontWeight: 'bold', marginBottom: 2 },
  cardPrice: { fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
  addToCartBtn: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, alignSelf: 'flex-start', gap: 6,
  },
  addToCartText: { fontSize: 11, fontWeight: 'bold' },
  removeBtn: {
    padding: 8, borderRadius: 12, marginLeft: 6,
  },
});
