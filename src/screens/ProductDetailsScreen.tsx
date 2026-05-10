import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, SafeAreaView, ScrollView, Dimensions, Alert, Platform } from 'react-native';
import { ChevronLeft, Heart, ShoppingBag, Star, Share2, ShieldCheck, Truck, RefreshCw } from 'lucide-react-native';
import { useFurnitureStore } from '../store/useFurnitureStore';
import { useTheme } from '../context/ThemeContext';

const { width } = Dimensions.get('window');

const IMAGE_POOL = [
  require('../../assets/products/emerald_chair.png'),
  require('../../assets/products/orange_chair.png'),
  require('../../assets/products/chair1.png'),
  require('../../assets/products/chair2.png'),
  require('../../assets/products/chair3.png'),
  require('../../assets/products/wood_chair.png'),
  require('../../assets/products/upholstered_chair.jpg'),
];

export default function ProductDetailsScreen({ route, navigation }: any) {
  const { product, productIndex = 0 } = route.params;
  const { toggleFavorite, isFavorite, addToCart } = useFurnitureStore();
  const { colors, isDark } = useTheme();
  const imageSource = product.image_url ? { uri: product.image_url } : IMAGE_POOL[productIndex % IMAGE_POOL.length];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={{ flex: 1 }}>
        <ScrollView 
          showsVerticalScrollIndicator={false} 
          contentContainerStyle={styles.scrollContent}
          style={{ flex: 1 }}
        >
          {/* Image Section */}
          <View style={[styles.imageSection, { backgroundColor: colors.secondary }]}>
            <View style={styles.header}>
              <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.headerBtn, { backgroundColor: colors.card }]}>
                <ChevronLeft size={24} color={colors.text} />
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={() => {
                  Alert.alert('Share', 'Sharing this product with your friends...');
                }}
                style={[styles.headerBtn, { backgroundColor: colors.card }]}
              >
                <Share2 size={20} color={colors.text} />
              </TouchableOpacity>
            </View>
            
            <Image source={imageSource} style={styles.image as any} resizeMode="cover" />
            
            <TouchableOpacity 
              onPress={() => toggleFavorite(product.id)}
              style={[styles.favoriteBtn, { backgroundColor: colors.card }]}
            >
              <Heart 
                size={24} 
                color={isFavorite(product.id) ? '#EF4444' : colors.text} 
                fill={isFavorite(product.id) ? '#EF4444' : 'transparent'}
              />
            </TouchableOpacity>
          </View>
  
          {/* Content Section */}
          <View style={styles.content}>
            <View style={styles.categoryRow}>
              <Text style={[styles.category, { color: colors.primary }]}>{product.category}</Text>
              <View style={styles.ratingRow}>
                <Star size={16} color="#F59E0B" fill="#F59E0B" />
                <Text style={[styles.rating, { color: colors.text }]}>4.8 (120 Reviews)</Text>
              </View>
            </View>
  
            <Text style={[styles.name, { color: colors.text }]}>{product.name}</Text>
            <Text style={[styles.price, { color: colors.primary }]}>${product.price}</Text>
  
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
  
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Description</Text>
            <Text style={[styles.description, { color: colors.textSecondary }]}>
              {product.description || "Experience unparalleled comfort with this masterfully crafted furniture piece. Designed for both style and ergonomics, it features premium materials and a timeless minimalist aesthetic that complements any modern interior."}
            </Text>
  
            {/* Features */}
            <View style={styles.featuresRow}>
              <View style={styles.featureItem}>
                <View style={[styles.featureIcon, { backgroundColor: colors.secondary }]}><Truck size={20} color={colors.primary} /></View>
                <Text style={[styles.featureText, { color: colors.textSecondary }]}>Fast Shipping</Text>
              </View>
              <View style={styles.featureItem}>
                <View style={[styles.featureIcon, { backgroundColor: colors.secondary }]}><ShieldCheck size={20} color={colors.primary} /></View>
                <Text style={[styles.featureText, { color: colors.textSecondary }]}>Lifetime Warranty</Text>
              </View>
              <View style={styles.featureItem}>
                <View style={[styles.featureIcon, { backgroundColor: colors.secondary }]}><RefreshCw size={20} color={colors.primary} /></View>
                <Text style={[styles.featureText, { color: colors.textSecondary }]}>Easy Returns</Text>
              </View>
            </View>
  
            <View style={{ height: 20 }} />

            {/* Inline Bottom Action */}
            <View style={[styles.bottomAction, { backgroundColor: colors.card, marginBottom: 40 }]}>
              <TouchableOpacity 
                style={[styles.addBtnOutline, { borderColor: colors.primary }]}
                onPress={() => {
                  addToCart(product);
                  Alert.alert('Added to Cart', `${product.name} has been added to your cart.`);
                }}
              >
                <ShoppingBag size={20} color={colors.primary} />
              </TouchableOpacity>
      
              <TouchableOpacity 
                style={[styles.buyNowBtn, { backgroundColor: colors.primary }]}
                onPress={() => {
                  addToCart(product);
                  navigation.navigate('Checkout');
                }}
              >
                <Text style={[styles.buyNowText, { color: isDark ? colors.background : 'white' }]}>Buy Now</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
  

      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1,
  },
  scrollContent: {
    maxWidth: 600,
    width: '100%',
    alignSelf: 'center',
    paddingBottom: 20,
  },
  imageSection: {
    height: 360,
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    paddingTop: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 20,
    position: 'absolute',
    top: Platform.OS === 'ios' ? 20 : 25, // Increased to avoid cut-off by notch/status bar
    zIndex: 10,
  },
  headerBtn: {
    padding: 8,
    borderRadius: 10,
  },
  image: {
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'white', // Fallback
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  favoriteBtn: {
    position: 'absolute',
    bottom: -20,
    right: 32,
    padding: 12,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  content: {
    padding: 32,
    paddingTop: 32,
    maxWidth: 600,
    width: '100%',
    alignSelf: 'center',
  },
  categoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  category: {
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rating: {
    fontSize: 12,
    fontWeight: '600',
  },
  name: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  price: {
    fontSize: 22,
    fontWeight: '800',
  },
  divider: {
    height: 1,
    marginVertical: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  description: {
    fontSize: 15,
    lineHeight: 24,
    marginBottom: 24,
  },
  featuresRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  featureItem: {
    alignItems: 'center',
    gap: 8,
  },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureText: {
    fontSize: 11,
    fontWeight: '600',
  },
  bottomAction: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    marginBottom: 20, // Lifted but safe
    marginHorizontal: 16,
    borderRadius: 30,
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: 500,
    width: '90%',
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 15,
    elevation: 10,
    backgroundColor: 'transparent', // Inline handled
  },
  buyNowBtn: {
    flex: 1,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  buyNowText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  addBtnOutline: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
