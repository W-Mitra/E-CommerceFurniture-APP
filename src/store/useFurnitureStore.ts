import { create } from 'zustand';
import { supabase } from '../lib/supabase';

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image_url?: string;
  category?: string;
  selected?: boolean;
}

interface FurnitureState {
  cart: CartItem[];
  favorites: string[];
  addToCart: (product: any) => Promise<void>;
  removeFromCart: (id: string) => Promise<void>;
  clearCart: () => Promise<void>;
  totalPrice: () => number;
  toggleFavorite: (id: string) => Promise<void>;
  isFavorite: (id: string) => boolean;
  toggleSelectItem: (id: string) => void;
  toggleSelectAll: () => void;
  removeSelectedFromCart: () => Promise<void>;
  loadPersistentData: () => Promise<void>;
}

export const useFurnitureStore = create<FurnitureState>((set, get) => ({
  cart: [],
  favorites: [],

  // Load everything from Supabase when the app starts or user logs in
  loadPersistentData: async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // 1. Fetch Favorites
      const { data: favs } = await supabase
        .from('favorites')
        .select('product_id')
        .eq('user_id', session.user.id);
      
      if (favs) set({ favorites: favs.map(f => f.product_id) });

      // 2. Fetch Cart
      const { data: cartItems } = await supabase
        .from('cart_items')
        .select('quantity, furniture(*)')
        .eq('user_id', session.user.id);
      
      if (cartItems) {
        // Filter out null furniture items — these occur when a product has been
        // hidden by an admin (RLS blocks the join) or deleted while in the cart.
        const formattedCart = cartItems
          .filter(item => item.furniture !== null)
          .map(item => ({
            ...(item.furniture as any),
            quantity: item.quantity,
            selected: true // Default to selected when loaded
          }));
        set({ cart: formattedCart });
      }
    } catch (error) {
      console.error('Error loading persistent data:', error);
    }
  },

  addToCart: async (product) => {
    const currentCart = get().cart;
    const existingItem = currentCart.find((item) => item.id === product.id);
    const { data: { session } } = await supabase.auth.getSession();

    if (existingItem) {
      const newQuantity = existingItem.quantity + 1;
      set({
        cart: currentCart.map((item) =>
          item.id === product.id ? { ...item, quantity: newQuantity } : item
        ),
      });
      // Sync with Supabase
      if (session) {
        await supabase.from('cart_items')
          .update({ quantity: newQuantity })
          .eq('user_id', session.user.id)
          .eq('product_id', product.id);
      }
    } else {
      set({ cart: [...currentCart, { ...product, quantity: 1, selected: true }] });
      // Sync with Supabase
      if (session) {
        await supabase.from('cart_items')
          .insert({ user_id: session.user.id, product_id: product.id, quantity: 1 });
      }
    }
  },

  removeFromCart: async (id) => {
    const currentCart = get().cart;
    const existingItem = currentCart.find((item) => item.id === id);
    const { data: { session } } = await supabase.auth.getSession();

    if (existingItem && existingItem.quantity > 1) {
      const newQuantity = existingItem.quantity - 1;
      set({
        cart: currentCart.map((item) =>
          item.id === id ? { ...item, quantity: newQuantity } : item
        ),
      });
      if (session) {
        await supabase.from('cart_items')
          .update({ quantity: newQuantity })
          .eq('user_id', session.user.id)
          .eq('product_id', id);
      }
    } else {
      set({ cart: currentCart.filter((item) => item.id !== id) });
      if (session) {
        await supabase.from('cart_items')
          .delete()
          .eq('user_id', session.user.id)
          .eq('product_id', id);
      }
    }
  },

  clearCart: async () => {
    set({ cart: [] });
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      await supabase.from('cart_items').delete().eq('user_id', session.user.id);
    }
  },

  totalPrice: () => {
    return get().cart.reduce((total, item) => {
      if (item.selected) {
        return total + item.price * item.quantity;
      }
      return total;
    }, 0);
  },

  toggleSelectItem: (id: string) => {
    const currentCart = get().cart;
    set({
      cart: currentCart.map((item) =>
        item.id === id ? { ...item, selected: !item.selected } : item
      ),
    });
  },

  removeSelectedFromCart: async () => {
    const currentCart = get().cart;
    const itemsToRemove = currentCart.filter(item => item.selected);
    const itemsToKeep = currentCart.filter(item => !item.selected);
    
    set({ cart: itemsToKeep });
    
    const { data: { session } } = await supabase.auth.getSession();
    if (session && itemsToRemove.length > 0) {
      const idsToRemove = itemsToRemove.map(item => item.id);
      await supabase.from('cart_items')
        .delete()
        .eq('user_id', session.user.id)
        .in('product_id', idsToRemove);
    }
  },

  toggleSelectAll: () => {
    const currentCart = get().cart;
    const allSelected = currentCart.every(item => item.selected);
    set({
      cart: currentCart.map(item => ({ ...item, selected: !allSelected }))
    });
  },

  toggleFavorite: async (id: string) => {
    const currentFavorites = get().favorites;
    const { data: { session } } = await supabase.auth.getSession();

    if (currentFavorites.includes(id)) {
      set({ favorites: currentFavorites.filter(favId => favId !== id) });
      if (session) {
        await supabase.from('favorites').delete().eq('user_id', session.user.id).eq('product_id', id);
      }
    } else {
      set({ favorites: [...currentFavorites, id] });
      if (session) {
        await supabase.from('favorites').insert({ user_id: session.user.id, product_id: id });
      }
    }
  },

  isFavorite: (id: string) => get().favorites.includes(id),
}));
