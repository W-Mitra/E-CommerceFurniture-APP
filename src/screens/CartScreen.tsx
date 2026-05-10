import React from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, SafeAreaView } from 'react-native';
import { ChevronLeft, Trash2, Plus, Minus, ShoppingBag, Check } from 'lucide-react-native';
import { useFurnitureStore } from '../store/useFurnitureStore';
import { useTheme } from '../context/ThemeContext';

const IMAGE_POOL = [
  require('../../assets/products/emerald_chair.png'),
  require('../../assets/products/orange_chair.png'),
  require('../../assets/products/chair1.png'),
  require('../../assets/products/chair2.png'),
  require('../../assets/products/chair3.png'),
  require('../../assets/products/wood_chair.png'),
  require('../../assets/products/upholstered_chair.jpg'),
];

export default function CartScreen({ navigation }: any) {
  const { cart, addToCart, removeFromCart, totalPrice, clearCart, toggleSelectItem, toggleSelectAll } = useFurnitureStore();
  const { colors, isDark } = useTheme();
  const total = totalPrice();
  const allSelected = cart.length > 0 && cart.every(item => item.selected);
  const selectedCount = cart.filter(item => item.selected).length;

  const getImage = (index: number) => {
    return IMAGE_POOL[index % IMAGE_POOL.length];
  };

  const renderItem = ({ item, index }: any) => (
    <View style={[styles.cartItem, { backgroundColor: colors.card, borderColor: item.selected ? colors.primary : colors.border, borderWidth: item.selected ? 2 : 1 }]}>
      <TouchableOpacity 
        onPress={() => toggleSelectItem(item.id)}
        style={[styles.selectCircle, { borderColor: item.selected ? colors.primary : colors.border, backgroundColor: item.selected ? colors.primary : 'transparent' }]}
      >
        {item.selected && <Check size={12} color="white" />}
      </TouchableOpacity>
      
      <View style={[styles.imageContainer, { backgroundColor: isDark ? colors.background : '#F8F9F8' }]}>
        <Image 
          source={item.image_url ? { uri: item.image_url } : getImage(index)} 
          style={styles.itemImage} 
        />
      </View>
      <View style={styles.itemInfo}>
        <Text style={[styles.itemName, { color: colors.text }]}>{item.name}</Text>
        <Text style={[styles.itemCategory, { color: colors.textMuted }]}>{item.category}</Text>
        <Text style={[styles.itemPrice, { color: colors.primary }]}>${item.price}</Text>
      </View>
      <View style={styles.quantityRow}>
        <TouchableOpacity 
          onPress={() => removeFromCart(item.id)}
          style={[styles.qtyBtn, { backgroundColor: colors.background, borderColor: colors.border, borderWidth: 1 }]}
        >
          <Minus size={14} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.qtyText, { color: colors.text }]}>{item.quantity}</Text>
        <TouchableOpacity 
          onPress={() => addToCart(item)}
          style={[styles.qtyBtn, { backgroundColor: colors.primary }]}
        >
          <Plus size={14} color={isDark ? colors.background : 'white'} />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backBtn, { backgroundColor: colors.card }]}>
          <ChevronLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Shopping Cart</Text>
        <TouchableOpacity onPress={clearCart} style={[styles.clearBtn, { backgroundColor: colors.secondary }]}>
          <Trash2 size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {cart.length > 0 ? (
        <>
          <View style={styles.selectAllRow}>
            <TouchableOpacity onPress={toggleSelectAll} style={styles.selectAllBtn}>
              <View style={[styles.selectCircle, { borderColor: allSelected ? colors.primary : colors.border, backgroundColor: allSelected ? colors.primary : 'transparent' }]}>
                {allSelected && <Check size={12} color="white" />}
              </View>
              <Text style={[styles.selectAllText, { color: colors.textSecondary }]}>Select All</Text>
            </TouchableOpacity>
            <Text style={[styles.selectedCount, { color: colors.textMuted }]}>{selectedCount} items selected</Text>
          </View>
          <FlatList
            data={cart}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
          />
          <View style={[styles.footer, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
            <View style={styles.totalRow}>
              <Text style={[styles.totalLabel, { color: colors.textMuted }]}>Total Price</Text>
              <Text style={[styles.totalPrice, { color: colors.text }]}>${total.toFixed(2)}</Text>
            </View>
            <TouchableOpacity 
              style={[styles.checkoutBtn, { backgroundColor: colors.primary, opacity: selectedCount > 0 ? 1 : 0.5 }]}
              onPress={() => {
                if (selectedCount > 0) {
                  navigation.navigate('Checkout');
                }
              }}
              disabled={selectedCount === 0}
            >
              <Text style={[styles.checkoutText, { color: isDark ? colors.background : 'white' }]}>Checkout Now</Text>
            </TouchableOpacity>
          </View>
        </>
      ) : (
        <View style={styles.emptyContainer}>
          <ShoppingBag size={80} color={colors.border} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>Your cart is empty</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>Looks like you haven't added anything to your cart yet.</Text>
          <TouchableOpacity 
            style={[styles.shopBtn, { backgroundColor: colors.primary }]}
            onPress={() => navigation.navigate('Catalog')}
          >
            <Text style={[styles.shopText, { color: isDark ? colors.background : 'white' }]}>Start Shopping</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
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
    borderBottomWidth: 1,
  },
  backBtn: { width: 44, height: 44, justifyContent: 'center' },
  title: { fontSize: 20, fontWeight: 'bold' },
  clearBtn: { padding: 10, borderRadius: 12 },
  list: { 
    padding: 16, 
    paddingBottom: 100,
    maxWidth: 600,
    width: '100%',
    alignSelf: 'center',
  },
  cartItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  imageContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  itemImage: { 
    width: '100%', 
    height: '100%', 
    borderRadius: 40,
    transform: [{ scale: 0.9 }]
  },
  itemInfo: { flex: 1, marginLeft: 12 },
  itemName: { fontSize: 15, fontWeight: 'bold', marginBottom: 2 },
  itemCategory: { fontSize: 11, marginBottom: 4 },
  itemPrice: { fontSize: 15, fontWeight: '800' },
  quantityRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  qtyBtn: { width: 28, height: 28, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  qtyText: { fontSize: 15, fontWeight: 'bold', minWidth: 20, textAlign: 'center' },
  footer: {
    padding: 24,
    paddingBottom: 110, // Added significant space for the custom tab bar
    borderTopWidth: 1,
    position: 'absolute',
    bottom: 0,
    width: '100%',
    maxWidth: 600,
    alignSelf: 'center',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  totalLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  totalPrice: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  checkoutBtn: {
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    width: '100%',
  },
  checkoutText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  shopBtn: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 16,
  },
  shopText: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  selectCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  selectAllRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
    maxWidth: 600,
    width: '100%',
    alignSelf: 'center',
  },
  selectAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectAllText: {
    fontSize: 14,
    fontWeight: '600',
  },
  selectedCount: {
    fontSize: 12,
    fontWeight: '500',
  },
});
