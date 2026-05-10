import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { supabase } from '../lib/supabase';

export default function SplashScreen({ navigation }: any) {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Fade in animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1200,
      useNativeDriver: true,
    }).start();

    // After splash delay, check session and route accordingly
    const timer = setTimeout(async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        // No session → show onboarding/login flow
        navigation.replace('Onboarding');
        return;
      }

      // Session exists → check role and go to correct home
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();

      if (profile?.role === 'admin' || session.user.email === 'wendelynmitra900@gmail.com') {
        navigation.replace('AdminMain');
      } else {
        navigation.replace('UserMain');
      }
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.logoContainer, { opacity: fadeAnim }]}>
        <Text style={styles.brandName}>FURNI</Text>
        <Text style={styles.tagline}>LUXURY INTERIORS</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1B2C21',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    alignItems: 'center',
  },
  brandName: {
    fontSize: 48,
    fontWeight: 'bold',
    color: 'white',
    letterSpacing: 8,
  },
  tagline: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 4,
    marginTop: 8,
    fontWeight: '600',
  }
});
