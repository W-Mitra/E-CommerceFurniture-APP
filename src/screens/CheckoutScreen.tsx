import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, TextInput, Alert, ActivityIndicator, Modal } from 'react-native';
import { ChevronLeft, CreditCard, MapPin, Truck, ChevronRight, Check, User } from 'lucide-react-native';
import { useFurnitureStore } from '../store/useFurnitureStore';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';

export default function CheckoutScreen({ navigation }: any) {
  const { cart: allCart, totalPrice, removeSelectedFromCart } = useFurnitureStore();
  const cart = allCart.filter(item => item.selected);
  const { colors, isDark } = useTheme();
  const { profile, user } = useAuth();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [showAddCard, setShowAddCard] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);
  
  // Card Form State
  const [cardNumber, setCardNumber] = useState('');
  const [cardHolder, setCardHolder] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');

  // Shipping State
  const [recipientName, setRecipientName] = useState(profile?.full_name || '');
  const [shippingAddress, setShippingAddress] = useState('');
  const total = totalPrice();
  const shipping = paymentMethod === 'card' ? 0 : 25;

  const handleOrder = async () => {
    try {
      setOrderError(null);
      setSubmitting(true);
      const finalPrice = total + shipping;

      // Simplify cart items for database storage (no images/complex objects)
      const simplifiedItems = cart.map(item => ({
        id: item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        image_url: item.image_url // Restoring the image for history previews
      }));

      // Save order to Supabase
      const { error } = await supabase
        .from('orders')
        .insert({
          user_id: user?.id,
          total_amount: finalPrice,
          status: 'placed',
          // Cleverly save payment method inside the items JSON to avoid schema errors
          items: {
            products: simplifiedItems,
            payment_method: paymentMethod,
            shipping_address: shippingAddress || 'Default Address',
            recipient_name: recipientName || profile?.full_name || 'Guest'
          }
        });

      if (error) throw error;
      
      await removeSelectedFromCart();
      setShowSuccess(true);
    } catch (error: any) {
      console.error('Order Error:', error);
      setOrderError(error.message || 'Failed to place order. Please check your connection.');
      Alert.alert('Order Failed', error.message || 'Failed to place order');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backBtn, { backgroundColor: colors.card }]}>
          <ChevronLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Checkout</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Progress Bar */}
        <View style={styles.progressRow}>
          {[1, 2, 3].map((s) => (
            <React.Fragment key={s}>
              <View style={[
                styles.step, 
                { backgroundColor: step >= s ? colors.primary : colors.card, borderColor: step >= s ? colors.primary : colors.border }
              ]}>
                {step > s ? <Check size={14} color="white" /> : <Text style={{ color: step >= s ? 'white' : colors.textMuted }}>{s}</Text>}
              </View>
              {s < 3 && <View style={[styles.progressLine, { backgroundColor: step > s ? colors.primary : colors.border }]} />}
            </React.Fragment>
          ))}
        </View>

        {/* Step 1: Shipping */}
        {step === 1 && (
          <View style={styles.stepContent}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Recipient Name</Text>
            <View style={[styles.inputGroup, { backgroundColor: colors.card, borderColor: colors.border, marginBottom: 16 }]}>
              <User size={20} color={colors.primary} />
              <TextInput 
                placeholder="Full Name" 
                value={recipientName}
                onChangeText={setRecipientName}
                placeholderTextColor={colors.textMuted}
                style={[styles.input, { color: colors.text }]}
              />
            </View>

            <Text style={[styles.sectionTitle, { color: colors.text }]}>Shipping Address</Text>
            <View style={[styles.inputGroup, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <MapPin size={20} color={colors.primary} />
              <TextInput 
                placeholder="123 Modern Street, Design City" 
                value={shippingAddress}
                onChangeText={setShippingAddress}
                placeholderTextColor={colors.textMuted}
                style={[styles.input, { color: colors.text }]}
              />
            </View>
            
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Delivery Method</Text>
            <View style={[styles.methodCard, { backgroundColor: colors.card, borderColor: colors.primary }]}>
              <View style={[styles.methodIcon, { backgroundColor: colors.secondary }]}>
                <Truck size={24} color={colors.primary} />
              </View>
              <View style={styles.methodInfo}>
                <Text style={[styles.methodName, { color: colors.text }]}>Standard Delivery</Text>
                <Text style={[styles.methodTime, { color: colors.textMuted }]}>3-5 Business Days</Text>
                <Text style={[styles.methodPricingNote, { color: colors.primary }]}>
                  {paymentMethod === 'card' ? 'Free for Card Payments' : '$25 for Cash on Delivery'}
                </Text>
              </View>
              <Text style={[styles.methodPrice, { color: colors.text }]}>
                {shipping === 0 ? 'FREE' : `$${shipping}`}
              </Text>
            </View>
          </View>
        )}

        {/* Step 2: Payment */}
        {step === 2 && (
          <View style={styles.stepContent}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Payment Method</Text>
            
            {/* Credit Card Option */}
            <TouchableOpacity 
              onPress={() => setPaymentMethod('card')}
              style={[
                styles.selectableCard, 
                { backgroundColor: colors.card, borderColor: paymentMethod === 'card' ? colors.primary : colors.border }
              ]}
            >
              <View style={[styles.paymentCard, { backgroundColor: colors.primary, marginBottom: 0 }]}>
                <View style={styles.cardHeader}>
                  <CreditCard size={32} color="white" />
                  <Text style={styles.cardType}>VISA</Text>
                </View>
                <Text style={styles.cardNumber}>**** **** **** 4242</Text>
                <View style={styles.cardFooter}>
                  <Text style={styles.cardHolder}>DESIGN ENTHUSIAST</Text>
                  <Text style={styles.cardExpiry}>12/26</Text>
                </View>
              </View>
              {paymentMethod === 'card' && (
                <View style={[styles.selectedCheck, { backgroundColor: colors.primary }]}>
                  <Check size={12} color="white" />
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.addCardBtn, { borderColor: colors.border, borderStyle: 'dashed', marginTop: 12 }]}
              onPress={() => setShowAddCard(true)}
            >
              <Text style={[styles.addCardText, { color: colors.textSecondary }]}>+ Add New Card</Text>
            </TouchableOpacity>

            <View style={[styles.summaryDivider, { backgroundColor: colors.border, marginVertical: 24 }]} />

            {/* Cash on Delivery Option */}
            <TouchableOpacity 
              onPress={() => setPaymentMethod('cod')}
              style={[
                styles.selectableRow, 
                { backgroundColor: colors.card, borderColor: paymentMethod === 'cod' ? colors.primary : colors.border }
              ]}
            >
              <View style={[styles.methodIcon, { backgroundColor: colors.secondary }]}>
                <Truck size={20} color={colors.primary} />
              </View>
              <View style={styles.methodInfo}>
                <Text style={[styles.methodName, { color: colors.text }]}>Cash on Delivery</Text>
                <Text style={[styles.methodTime, { color: colors.textMuted }]}>Pay when you receive the order</Text>
              </View>
              {paymentMethod === 'cod' && (
                <View style={[styles.selectedCheckRow, { backgroundColor: colors.primary }]}>
                  <Check size={12} color="white" />
                </View>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Step 3: Review */}
        {step === 3 && (
          <View style={styles.stepContent}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Order Summary</Text>
            <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {cart.map((item) => (
                <View key={item.id} style={styles.summaryItem}>
                  <Text style={[styles.summaryName, { color: colors.text }]}>{item.name} x {item.quantity}</Text>
                  <Text style={[styles.summaryPrice, { color: colors.text }]}>${(item.price * item.quantity).toFixed(2)}</Text>
                </View>
              ))}
              <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
              <View style={styles.summaryTotalRow}>
                <Text style={[styles.summaryTotalLabel, { color: colors.textMuted }]}>Subtotal</Text>
                <Text style={[styles.summaryTotalValue, { color: colors.text }]}>${total.toFixed(2)}</Text>
              </View>
              <View style={styles.summaryTotalRow}>
                <Text style={[styles.summaryTotalLabel, { color: colors.textMuted }]}>Shipping</Text>
                <Text style={[styles.summaryTotalValue, { color: shipping === 0 ? colors.success : colors.text }]}>
                  {shipping === 0 ? 'FREE' : `$${shipping.toFixed(2)}`}
                </Text>
              </View>
              <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
              <View style={styles.summaryTotalRow}>
                <Text style={[styles.summaryFinalLabel, { color: colors.text }]}>Total</Text>
                <Text style={[styles.summaryFinalValue, { color: colors.primary }]}>${(total + shipping).toFixed(2)}</Text>
              </View>
            </View>

            <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 24 }]}>Shipping Information</Text>
            <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                <User size={18} color={colors.primary} />
                <Text style={[styles.infoText, { color: colors.text, marginLeft: 12, fontWeight: 'bold' }]}>
                  {recipientName || 'Not specified'}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                <MapPin size={18} color={colors.primary} />
                <Text style={[styles.infoText, { color: colors.textSecondary, marginLeft: 12 }]}>
                  {shippingAddress || 'No address provided'}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <CreditCard size={18} color={colors.primary} />
                <Text style={[styles.infoText, { color: colors.textSecondary, marginLeft: 12 }]}>
                  Payment: {paymentMethod === 'card' ? 'Credit Card' : 'Cash on Delivery'}
                </Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      <View style={[styles.footer, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
        {orderError && (
          <View style={[styles.errorContainer, { backgroundColor: colors.error + '20', borderColor: colors.error }]}>
            <Text style={[styles.errorText, { color: colors.error }]}>{orderError}</Text>
          </View>
        )}
        <TouchableOpacity 
          style={[styles.mainBtn, { backgroundColor: colors.primary, opacity: submitting ? 0.7 : 1 }]}
          onPress={() => step < 3 ? setStep(step + 1) : handleOrder()}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color={isDark ? colors.background : 'white'} />
          ) : (
            <>
              <Text style={[styles.mainBtnText, { color: isDark ? colors.background : 'white' }]}>
                {step === 3 ? 'Confirm Order' : 'Continue'}
              </Text>
              <ChevronRight size={20} color={isDark ? colors.background : 'white'} />
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Add New Card Modal */}
      <Modal visible={showAddCard} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Add New Card</Text>
              <TouchableOpacity onPress={() => setShowAddCard(false)}>
                <Check size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Card Number</Text>
              <View style={[styles.inputGroup, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <CreditCard size={20} color={colors.primary} />
                <TextInput 
                  placeholder="0000 0000 0000 0000" 
                  value={cardNumber}
                  onChangeText={setCardNumber}
                  keyboardType="numeric"
                  placeholderTextColor={colors.textMuted}
                  style={[styles.input, { color: colors.text }]}
                />
              </View>

              <Text style={[styles.label, { color: colors.textSecondary }]}>Card Holder Name</Text>
              <View style={[styles.inputGroup, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <User size={20} color={colors.primary} />
                <TextInput 
                  placeholder="e.g. John Doe" 
                  value={cardHolder}
                  onChangeText={setCardHolder}
                  placeholderTextColor={colors.textMuted}
                  style={[styles.input, { color: colors.text }]}
                />
              </View>

              <View style={{ flexDirection: 'row', gap: 16 }}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.label, { color: colors.textSecondary }]}>Expiry Date</Text>
                  <TextInput 
                    placeholder="MM/YY" 
                    value={expiry}
                    onChangeText={setExpiry}
                    placeholderTextColor={colors.textMuted}
                    style={[styles.input, styles.smallInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.label, { color: colors.textSecondary }]}>CVV</Text>
                  <TextInput 
                    placeholder="000" 
                    value={cvv}
                    onChangeText={setCvv}
                    keyboardType="numeric"
                    secureTextEntry
                    placeholderTextColor={colors.textMuted}
                    style={[styles.input, styles.smallInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
                  />
                </View>
              </View>

              <TouchableOpacity 
                style={[styles.saveBtn, { backgroundColor: colors.primary }]}
                onPress={() => {
                  if (cardNumber && cardHolder && expiry && cvv) {
                    setShowAddCard(false);
                    Alert.alert('Success', 'Card added successfully!');
                  } else {
                    Alert.alert('Error', 'Please fill in all card details');
                  }
                }}
              >
                <Text style={styles.saveBtnText}>Save Card</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Order Success Modal */}
      <Modal visible={showSuccess} animationType="fade" transparent={true}>
        <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.9)' }]}>
          <View style={[styles.successModal, { backgroundColor: colors.background }]}>
            <View style={[styles.successIcon, { backgroundColor: colors.success }]}>
              <Check size={40} color="white" />
            </View>
            <Text style={[styles.successTitle, { color: colors.text }]}>Successfully Placed Order!</Text>
            <Text style={[styles.successSub, { color: colors.textMuted }]}>
              Thank you for your purchase. We have received your order and are processing it.
            </Text>
            
            <TouchableOpacity 
              style={[styles.trackBtn, { backgroundColor: colors.primary }]}
              onPress={() => {
                setShowSuccess(false);
                navigation.navigate('UserMain', { 
                  screen: 'Profile', 
                  params: { showHistory: true } 
                });
              }}
            >
              <Text style={[styles.trackBtnText, { color: isDark ? colors.background : 'white' }]}>Track My Order</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={() => {
                setShowSuccess(false);
                navigation.navigate('UserMain', { screen: 'Catalog' });
              }}
            >
              <Text style={[styles.continueText, { color: colors.textMuted }]}>Continue Shopping</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  scroll: { 
    padding: 16, 
    paddingBottom: 120,
    maxWidth: 600,
    width: '100%',
    alignSelf: 'center',
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  step: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  progressLine: {
    width: 32,
    height: 2,
    marginHorizontal: 6,
  },
  stepContent: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    marginTop: 4,
  },
  inputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 20,
  },
  input: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
  },
  methodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    borderWidth: 2,
  },
  methodIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  methodInfo: {
    flex: 1,
    marginLeft: 12,
  },
  methodName: {
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  methodTime: {
    fontSize: 12,
  },
  methodPricingNote: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  methodPrice: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  paymentCard: {
    padding: 20,
    borderRadius: 20,
    height: 180,
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardType: {
    color: 'white',
    fontSize: 18,
    fontWeight: '900',
    fontStyle: 'italic',
  },
  cardNumber: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cardHolder: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
    fontWeight: 'bold',
  },
  cardExpiry: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
    fontWeight: 'bold',
  },
  addCardBtn: {
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 2,
    alignItems: 'center',
  },
  addCardText: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  selectableCard: {
    borderRadius: 24,
    borderWidth: 2,
    padding: 2,
    overflow: 'hidden',
    position: 'relative'
  },
  selectedCheck: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    borderWidth: 2,
    borderColor: 'white'
  },
  selectableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 2,
    position: 'relative'
  },
  selectedCheckRow: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center', // Centered
    alignItems: 'center', // Centered
  },
  modalContent: {
    height: '70%',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 16,
  },
  smallInput: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    fontSize: 15,
  },
  saveBtn: {
    marginTop: 32,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveBtnText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  successModal: {
    width: '90%', // Slightly wider for mobile
    padding: 32,
    borderRadius: 32,
    alignItems: 'center',
    maxWidth: 400,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12,
  },
  successSub: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 32,
  },
  trackBtn: {
    width: '100%',
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  trackBtnText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  continueText: {
    fontSize: 14,
    fontWeight: '600',
  },
  summaryCard: {
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
  },
  summaryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  summaryName: {
    fontSize: 14,
    fontWeight: '500',
  },
  infoText: {
    fontSize: 14,
    flex: 1,
  },
  summaryPrice: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  summaryDivider: {
    height: 1,
    marginVertical: 12,
  },
  summaryTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  summaryTotalLabel: {
    fontSize: 13,
  },
  summaryTotalValue: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  summaryFinalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  summaryFinalValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  footer: {
    padding: 24,
    paddingBottom: 110, // Added space for custom tab bar
    borderTopWidth: 1,
    position: 'absolute',
    bottom: 0,
    width: '100%',
    maxWidth: 600,
    alignSelf: 'center',
  },
  mainBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderRadius: 16,
    gap: 8,
    width: '100%',
  },
  mainBtnText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  errorContainer: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 13,
    textAlign: 'center',
    fontWeight: '600',
  },
});
