import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, SafeAreaView, Dimensions } from 'react-native';
import { ArrowRight } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';

const { width } = Dimensions.get('window');

const slides = [
  {
    id: '1',
    title: 'Minimalist Furniture For Your Home',
    description: 'Discover the best modern furniture for your interior design.',
    image: require('../../assets/products/emerald_chair.png'),
  },
  {
    id: '2',
    title: 'High Quality Craftsmanship',
    description: 'We use only the finest materials for our furniture.',
    image: require('../../assets/products/orange_chair.png'),
  },
  {
    id: '3',
    title: 'Fast & Secure Delivery',
    description: 'Your furniture will be delivered safely to your doorstep.',
    image: require('../../assets/products/delivery_onboarding.png'),
  },
];

export default function OnboardingScreen({ navigation }: any) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const { isDark, colors } = useTheme();

  const next = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      navigation.replace('Login');
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.imageContainer}>
        <View style={styles.backgroundCircle} />
        <Image source={slides[currentSlide].image} style={styles.image} resizeMode="cover" />
      </View>
      
      <View style={styles.content}>
        <View style={styles.pagination}>
          {slides.map((_, i) => (
            <View 
              key={i} 
              style={[
                styles.dot, 
                { backgroundColor: i === currentSlide ? colors.primary : colors.border },
                i === currentSlide && { width: 30 }
              ]} 
            />
          ))}
        </View>

        <Text style={[styles.title, { color: colors.text }]}>{slides[currentSlide].title}</Text>
        <Text style={[styles.description, { color: colors.textMuted }]}>{slides[currentSlide].description}</Text>

        <TouchableOpacity 
          style={[styles.button, { backgroundColor: colors.primary }]} 
          onPress={next}
        >
          <Text style={[styles.buttonText, { color: isDark ? colors.background : 'white' }]}>
            {currentSlide === slides.length - 1 ? 'Get Started' : 'Next'}
          </Text>
          <ArrowRight size={20} color={isDark ? colors.background : 'white'} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  imageContainer: {
    height: '55%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 40,
  },
  backgroundCircle: {
    position: 'absolute',
    width: width > 500 ? 380 : width * 0.8,
    height: width > 500 ? 380 : width * 0.8,
    borderRadius: width > 500 ? 190 : (width * 0.8) / 2,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    opacity: 0.9,
  },
  image: {
    width: width > 500 ? 380 : width * 0.8,
    height: width > 500 ? 380 : width * 0.8,
    borderRadius: width > 500 ? 190 : (width * 0.8) / 2,
    overflow: 'hidden',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
    maxWidth: 550,
    alignSelf: 'center',
    width: '100%',
  },
  pagination: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  dot: {
    height: 6,
    width: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 12,
    lineHeight: 32,
  },
  description: {
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 24,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 14,
    gap: 10,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: 'bold',
  },
});
