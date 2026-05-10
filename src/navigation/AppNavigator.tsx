import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Heart, ShoppingBag, User, LayoutDashboard, Package, ClipboardList } from 'lucide-react-native';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../context/ThemeContext';

// User Screens
import CatalogScreen from '../screens/CatalogScreen';
import ProductDetailsScreen from '../screens/ProductDetailsScreen';
import FavoritesScreen from '../screens/FavoritesScreen';
import CartScreen from '../screens/CartScreen';
import ProfileScreen from '../screens/ProfileScreen';
import CheckoutScreen from '../screens/CheckoutScreen';
import LoginScreen from '../screens/LoginScreen';
import SignUpScreen from '../screens/SignUpScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import SplashScreen from '../screens/SplashScreen';

// Admin Screens
import AdminDashboardScreen from '../screens/admin/AdminDashboardScreen';
import InventoryScreen from '../screens/admin/InventoryScreen';
import OrdersManagementScreen from '../screens/admin/OrdersManagementScreen';
import UserManagementScreen from '../screens/admin/UserManagementScreen';
import ActivityLogsScreen from '../screens/admin/ActivityLogsScreen';
import AdminProfileScreen from '../screens/admin/AdminProfileScreen';
import AdminSettingsScreen from '../screens/admin/AdminSettingsScreen';
import SecurityPoliciesScreen from '../screens/admin/SecurityPoliciesScreen';
import { useFurnitureStore } from '../store/useFurnitureStore';
import { Settings } from 'lucide-react-native';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

import { adminService } from '../services/adminService';

// ─── Custom Tab Bar with Hover Animation ──────────────────────────────────────
function CustomTabBar({ state, descriptors, navigation }: any) {
  const [hoverAnim] = useState(new Animated.Value(60)); // Tucked down by default
  const { user, role } = useAuth();

  const showBar = () => {
    Animated.spring(hoverAnim, {
      toValue: 0,
      useNativeDriver: true,
      friction: 6,
      tension: 40,
    }).start();
  };

  const hideBar = () => {
    Animated.spring(hoverAnim, {
      toValue: 60,
      useNativeDriver: true,
      friction: 6,
      tension: 40,
    }).start();
  };

  return (
    <View
      style={styles.tabBarContainer}
      // @ts-ignore - Web only hover events
      onMouseEnter={showBar}
      onMouseLeave={hideBar}
    >
      <Animated.View style={[styles.customTabBar, { transform: [{ translateY: hoverAnim }] }]}>
        {state.routes.map((route: any, index: number) => {
          const { options } = descriptors[route.key];

          // Skip rendering for hidden tabs (those with tabBarButton: () => null)
          if (options.tabBarButton && typeof options.tabBarButton === 'function' && options.tabBarButton() === null) {
            return null;
          }

          const isFocused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });

            // Log navigation for admins
            if (role === 'admin' && user?.id) {
              adminService.logActivity(user.id, 'ADMIN_NAV_CLICK', {
                target: route.name,
                source: 'tab_bar'
              });
            }

            if (!isFocused && !event.defaultPrevented) navigation.navigate(route.name);
          };

          const Icon = options.tabBarIcon;

          return (
            <TouchableOpacity key={index} onPress={onPress} style={styles.tabItem}>
              {Icon && Icon({ color: isFocused ? '#FFFFFF' : 'rgba(255,255,255,0.4)' })}
              {isFocused && <View style={styles.activeDot} />}
            </TouchableOpacity>
          );
        })}
      </Animated.View>
    </View>
  );
}

// ─── User Tab Navigator ────────────────────────────────────────────────────────
function UserTabs() {
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="Catalog" component={CatalogScreen} options={{ tabBarIcon: ({ color }) => <ShoppingBag size={24} color={color} /> }} />
      <Tab.Screen name="Favorites" component={FavoritesScreen} options={{ tabBarIcon: ({ color }) => <Heart size={24} color={color} /> }} />
      <Tab.Screen name="Cart" component={CartScreen} options={{ tabBarIcon: ({ color }) => <ShoppingBag size={24} color={color} /> }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ tabBarIcon: ({ color }) => <User size={24} color={color} /> }} />
    </Tab.Navigator>
  );
}

// ─── Admin Tab Navigator ───────────────────────────────────────────────────────
function AdminTabs() {
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="AdminDashboard" component={AdminDashboardScreen} options={{ tabBarIcon: ({ color }) => <LayoutDashboard size={24} color={color} /> }} />
      <Tab.Screen name="Inventory" component={InventoryScreen} options={{ tabBarIcon: ({ color }) => <Package size={24} color={color} /> }} />
      <Tab.Screen name="Orders" component={OrdersManagementScreen} options={{ tabBarIcon: ({ color }) => <ShoppingBag size={24} color={color} /> }} />
      <Tab.Screen name="ActivityLogs" component={ActivityLogsScreen} options={{ tabBarIcon: ({ color }) => <ClipboardList size={24} color={color} /> }} />
      <Tab.Screen name="AdminProfile" component={AdminProfileScreen} options={{ tabBarIcon: ({ color }) => <User size={24} color={color} /> }} />
      <Tab.Screen name="AdminSettings" component={AdminSettingsScreen} options={{ tabBarIcon: ({ color }) => <Settings size={24} color={color} /> }} />
      {/* Hidden tab screens — navigated to programmatically, no tab icon */}
      <Tab.Screen name="UserManagement" component={UserManagementScreen} options={{ tabBarButton: () => null }} />
      <Tab.Screen name="SecurityPolicies" component={SecurityPoliciesScreen} options={{ tabBarButton: () => null }} />
    </Tab.Navigator>
  );
}

// ─── Root Navigator — always starts at Splash ─────────────────────────────────
export default function AppNavigator() {
  const { session } = useAuth();
  const { colors } = useTheme();
  const { loadPersistentData } = useFurnitureStore();

  useEffect(() => {
    if (session) {
      loadPersistentData();
    }
  }, [session]);

  return (
    // All screens live in a single flat stack.
    // SplashScreen handles the routing decision after checking the session.
    <Stack.Navigator
      initialRouteName="Splash"
      screenOptions={{ headerShown: false, animation: 'none' }}
    >
      {/* ── Entry ─────────────────────────────────────────────── */}
      <Stack.Screen name="Splash" component={SplashScreen} />
      <Stack.Screen name="Onboarding" component={OnboardingScreen} />

      {/* ── Auth ──────────────────────────────────────────────── */}
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="SignUp" component={SignUpScreen} />

      {/* ── User App ──────────────────────────────────────────── */}
      <Stack.Screen name="UserMain" component={UserTabs} />
      <Stack.Screen name="ProductDetails" component={ProductDetailsScreen} />
      <Stack.Screen name="Checkout" component={CheckoutScreen} />

      {/* ── Admin App ─────────────────────────────────────────── */}
      <Stack.Screen name="AdminMain" component={AdminTabs} />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  loadingScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  // Custom Tab Bar Styles
  tabBarContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 100, // Balanced height to catch hover without blocking form fields
    justifyContent: 'flex-end',
    alignItems: 'center',
    backgroundColor: 'transparent',
    paddingBottom: 25,
    zIndex: 9999,
  },
  customTabBar: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.95)',
    width: '90%',
    height: 70,
    borderRadius: 35,
    justifyContent: 'space-around',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 15,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'white',
    marginTop: 4,
    position: 'absolute',
    bottom: 12,
  },
});