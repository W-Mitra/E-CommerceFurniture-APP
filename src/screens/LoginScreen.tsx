import React, { useState } from 'react';
import { 
  View, Text, StyleSheet, TextInput, TouchableOpacity, 
  SafeAreaView, Image, KeyboardAvoidingView, Platform, Alert,
  ActivityIndicator
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Mail, Lock, ArrowRight } from 'lucide-react-native';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../context/ThemeContext';

export default function LoginScreen({ navigation }: any) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const { colors, isDark } = useTheme();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    
    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);

    if (error) Alert.alert('Error', error.message);
  };

  return (
    <LinearGradient colors={colors.gradient} style={styles.container}>
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <View style={styles.scrollContent}>
            <View style={styles.header}>
              <Text style={[styles.welcomeText, { color: colors.text }]}>Welcome Back</Text>
              <Text style={[styles.subText, { color: colors.textSecondary }]}>Sign in to continue shopping for your dream furniture.</Text>
            </View>

            <View style={styles.form}>
              <View style={[styles.inputContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : colors.card, borderColor: colors.border }]}>
                <Mail size={20} color={colors.textMuted} />
                <TextInput 
                  placeholder="Email Address"
                  style={[styles.input, { color: colors.text }]}
                  placeholderTextColor={colors.textMuted}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                />
              </View>

              <View style={[styles.inputContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : colors.card, borderColor: colors.border }]}>
                <Lock size={20} color={colors.textMuted} />
                <TextInput 
                  placeholder="Password"
                  style={[styles.input, { color: colors.text }]}
                  placeholderTextColor={colors.textMuted}
                  secureTextEntry
                  value={password}
                  onChangeText={setPassword}
                />
              </View>

              <TouchableOpacity style={styles.forgotPass}>
                <Text style={[styles.forgotText, { color: colors.text }]}>Forgot Password?</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                onPress={handleLogin}
                style={[styles.loginButton, { backgroundColor: colors.primary }]}
                disabled={loading}
              >
                <Text style={[styles.loginButtonText, { color: isDark ? '#000' : 'white' }]}>{loading ? 'Signing In...' : 'Sign In'}</Text>
                <ArrowRight size={20} color={isDark ? '#000' : 'white'} style={{ marginLeft: 8 }} />
              </TouchableOpacity>

              <View style={styles.footer}>
                <Text style={[styles.footerText, { color: colors.textSecondary }]}>Don't have an account? </Text>
                <TouchableOpacity onPress={() => navigation.navigate('SignUp')}>
                  <Text style={[styles.signUpText, { color: colors.primary }]}>Sign Up</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
    maxWidth: 450,
    alignSelf: 'center',
    width: '100%',
  },
  header: {
    marginBottom: 32,
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subText: {
    fontSize: 14,
    lineHeight: 20,
  },
  form: {
    flex: 1,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 16,
    borderWidth: 1,
  },
  input: {
    flex: 1,
    marginLeft: 12,
    fontSize: 15,
  },
  forgotPass: {
    alignSelf: 'flex-end',
    marginBottom: 32,
  },
  forgotText: {
    fontWeight: '600',
    fontSize: 13,
  },
  loginButton: {
    paddingVertical: 18,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 32,
  },
  footerText: {
    fontSize: 14,
  },
  signUpText: {
    fontWeight: 'bold',
    fontSize: 14,
  }
});
