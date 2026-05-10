import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

type ThemeType = 'light' | 'dark';

interface ThemeContextType {
  theme: ThemeType;
  isDark: boolean;
  colors: any;
  toggleTheme: () => void;
}

export const LightTheme = {
  background: '#FFFFFF',
  gradient: ['#FFFFFF', '#F0FDF4'], // Pure White to Mint Green
  card: '#FFFFFF',
  cardGlass: 'rgba(255, 255, 255, 0.7)',
  text: '#1B2C21',
  textSecondary: '#4B5563',
  textMuted: '#9CA3AF',
  border: '#E5E7EB',
  primary: '#1B2C21',
  secondary: '#F0FDF4',
  accent: '#F9FAFB',
  error: '#EF4444',
  success: '#10B981',
} as const;

export const DarkTheme = {
  background: '#050B07', // Deepest forest
  gradient: ['#050B07', '#0D1A12'], // [Midnight Green, Forest Green]
  card: '#121C15', // Rich dark green card
  cardGlass: 'rgba(18, 28, 21, 0.8)', // Translucent glass effect
  text: '#F8F9F8',
  textSecondary: '#A3B3A9',
  textMuted: '#6B7A70',
  border: '#1B2B21',
  primary: '#22C55E', // Vibrant green accent
  secondary: '#1A2A20',
  accent: '#2D3A31',
  error: '#F87171',
  success: '#4ADE80',
} as const;

const ThemeContext = createContext<ThemeContextType>({
  theme: 'light',
  isDark: false,
  colors: LightTheme,
  toggleTheme: () => {},
});

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const systemScheme = useColorScheme();
  const [theme, setTheme] = useState<ThemeType>(systemScheme || 'light');

  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem('app_theme');
      if (savedTheme) {
        setTheme(savedTheme as ThemeType);
      } else if (systemScheme) {
        setTheme(systemScheme);
      }
    } catch (error) {
      console.error('Error loading theme:', error);
    }
  };

  const toggleTheme = async () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    try {
      await AsyncStorage.setItem('app_theme', newTheme);
    } catch (error) {
      console.error('Error saving theme:', error);
    }
  };

  const colors = theme === 'light' ? LightTheme : DarkTheme;

  return (
    <ThemeContext.Provider value={{ 
      theme, 
      isDark: theme === 'dark', 
      colors, 
      toggleTheme 
    }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
