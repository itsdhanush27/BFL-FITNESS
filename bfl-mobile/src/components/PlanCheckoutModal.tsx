import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontSizes, FontWeights, Spacing, BorderRadius } from '../constants/theme';
import { CoachingPlan, TransactionRecord } from '../types';
import {
  createMobileStripeCheckoutSession,
  verifyAndFulfillMobileCheckoutSession,
  executeMobileStripePayment,
  calculateOneMonthPeriod,
} from '../services/stripeService';

interface PlanCheckoutModalProps {
  visible: boolean;
  onClose: () => void;
  plan: CoachingPlan;
  clientName: string;
  clientEmail: string;
  clientId: string;
  onSuccess: (transaction: TransactionRecord) => void;
}

export const PlanCheckoutModal: React.FC<PlanCheckoutModalProps> = ({
  visible,
  onClose,
  plan,
  clientName,
  clientEmail,
  clientId,
  onSuccess,
}) => {
  const [cardholderName, setCardholderName] = useState(clientName || '');
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkoutMode, setCheckoutMode] = useState<'hosted' | 'card'>('hosted');
  const [pendingSessionId, setPendingSessionId] = useState<string | null>(null);
  const [verifyingSession, setVerifyingSession] = useState(false);

  const { formattedStart, formattedEnd } = calculateOneMonthPeriod(30);

  const formatCardNumber = (text: string) => {
    const cleaned = text.replace(/\D/g, '').slice(0, 16);
    return cleaned.replace(/(.{4})/g, '$1 ').trim();
  };

  const formatExpiry = (text: string) => {
    const cleaned = text.replace(/\D/g, '').slice(0, 4);
    if (cleaned.length > 2) {
      return cleaned.slice(0, 2) + '/' + cleaned.slice(2);
    }
    return cleaned;
  };

  /**
   * Launch official PCI-DSS compliant Stripe Hosted Checkout
   */
  const handleHostedCheckout = async () => {
    setLoading(true);
    try {
      const session = await createMobileStripeCheckoutSession({
        clientId,
        clientName: cardholderName || clientName,
        clientEmail,
        plan,
      });

      setPendingSessionId(session.sessionId);
      setLoading(false);

      const supported = await Linking.canOpenURL(session.url);
      if (supported) {
        await Linking.openURL(session.url);
      } else {
        Alert.alert('Checkout Link', `Please open this link in your browser to complete payment:\n\n${session.url}`);
      }
    } catch (err: any) {
      setLoading(false);
      Alert.alert('Checkout Error', err?.message || 'Failed to initialize secure checkout session.');
    }
  };

  /**
   * Verify completed hosted checkout session and activate 1-month plan
   */
  const handleVerifyHostedCheckout = async () => {
    if (!pendingSessionId) {
      Alert.alert('No Session', 'Please initiate the secure checkout session first.');
      return;
    }

    setVerifyingSession(true);
    try {
      const tx = await verifyAndFulfillMobileCheckoutSession(pendingSessionId, plan);
      setVerifyingSession(false);
      onClose();
      onSuccess(tx);
    } catch (err: any) {
      setVerifyingSession(false);
      Alert.alert(
        'Verification Incomplete',
        'Payment has not been completed yet or is still processing. Please complete checkout on the payment gateway, then tap Verify.'
      );
    }
  };

  /**
   * Fallback direct card payment
   */
  const handleDirectPay = async () => {
    const rawCard = cardNumber.replace(/\D/g, '');
    if (rawCard.length < 15) {
      Alert.alert('Invalid Card', 'Please enter a valid 16-digit card number.');
      return;
    }

    const [expMonth, expYear] = expiry.split('/');
    if (!expMonth || !expYear || expMonth.length !== 2 || expYear.length !== 2) {
      Alert.alert('Invalid Expiry', 'Please enter expiry date in MM/YY format.');
      return;
    }

    if (cvc.trim().length < 3) {
      Alert.alert('Invalid CVC', 'Please enter a 3 or 4 digit CVC security code.');
      return;
    }

    setLoading(true);
    try {
      const tx = await executeMobileStripePayment({
        clientId,
        clientName: cardholderName || clientName,
        clientEmail,
        plan,
        card: {
          cardNumber: rawCard,
          expiryMonth: expMonth,
          expiryYear: expYear,
          cvc: cvc.trim(),
          cardholderName: cardholderName || clientName,
        },
      });

      setLoading(false);
      onClose();
      onSuccess(tx);
    } catch (err: any) {
      setLoading(false);
      const msg = err?.message || '';
      // If Stripe raw card security error occurs, smoothly redirect user to hosted checkout
      if (msg.includes('unsafe') || msg.includes('raw card') || msg.includes('Stripe.js')) {
        Alert.alert(
          'Secure Gateway Required',
          'For your protection, card payments are processed via our 256-bit encrypted hosted payment gateway. Switching to Hosted Checkout...',
          [
            {
              text: 'Proceed to Secure Checkout',
              onPress: () => {
                setCheckoutMode('hosted');
                handleHostedCheckout();
              },
            },
          ]
        );
      } else {
        Alert.alert('Payment Failed', msg || 'Payment failed on secure gateway. Please verify card details.');
      }
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.topNav}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn} disabled={loading || verifyingSession}>
            <Ionicons name="close" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.navTitle}>SECURE CHECKOUT</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Header Card */}
          <View style={styles.headerCard}>
            <View style={styles.liveBadge}>
              <Ionicons name="shield-checkmark" size={14} color="#059669" />
              <Text style={styles.liveBadgeText}>Verified Secure Gateway</Text>
            </View>
            <Text style={styles.headerTitle}>1-Month Coaching Activation</Text>
            <Text style={styles.headerDesc}>
              Complete your payment to activate 30 days of elite programming, biofeedback check-ins & direct coach line.
            </Text>
          </View>

          {/* Plan Summary */}
          <View style={styles.planCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.planCategory}>
                {(plan.category || 'online').toUpperCase().replace(/_/g, ' ')}
              </Text>
              <Text style={styles.planName}>{plan.name}</Text>
              <Text style={styles.planPeriod}>1 Month Access (30 Days)</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.planPrice}>${plan.price}</Text>
              <Text style={styles.planCurrency}>AUD / month</Text>
            </View>
          </View>

          {/* 1-Month Activation Dates Card */}
          <View style={styles.datesCard}>
            <View style={styles.datesHeader}>
              <Ionicons name="calendar-outline" size={16} color={Colors.primary} />
              <Text style={styles.datesTitle}>ACTIVATION CYCLE (1 MONTH)</Text>
            </View>
            <View style={styles.datesRow}>
              <View style={styles.dateCol}>
                <Text style={styles.dateLabel}>START DATE</Text>
                <Text style={styles.dateValue}>{formattedStart}</Text>
              </View>
              <View style={styles.dateCol}>
                <Text style={styles.dateLabel}>EXPIRATION DATE</Text>
                <Text style={[styles.dateValue, { color: Colors.primary }]}>{formattedEnd}</Text>
              </View>
            </View>
          </View>

          {/* Payment Method Selector */}
          <View style={styles.methodSelector}>
            <TouchableOpacity
              style={[styles.methodTab, checkoutMode === 'hosted' && styles.methodTabActive]}
              onPress={() => setCheckoutMode('hosted')}
            >
              <Ionicons
                name="shield-checkmark"
                size={16}
                color={checkoutMode === 'hosted' ? Colors.primary : Colors.textMuted}
              />
              <Text style={[styles.methodTabText, checkoutMode === 'hosted' && styles.methodTabTextActive]}>
                Hosted Checkout (Recommended)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.methodTab, checkoutMode === 'card' && styles.methodTabActive]}
              onPress={() => setCheckoutMode('card')}
            >
              <Ionicons
                name="card-outline"
                size={16}
                color={checkoutMode === 'card' ? Colors.primary : Colors.textMuted}
              />
              <Text style={[styles.methodTabText, checkoutMode === 'card' && styles.methodTabTextActive]}>
                Credit Card
              </Text>
            </TouchableOpacity>
          </View>

          {/* Option 1: Hosted Checkout (PCI Compliant) */}
          {checkoutMode === 'hosted' && (
            <View style={styles.formCard}>
              <Text style={styles.formSectionTitle}>OFFICIAL HOSTED CHECKOUT</Text>
              <Text style={styles.hostedDesc}>
                Pay securely via our encrypted hosted gateway supporting Visa, Mastercard, AMEX, Apple Pay, and Google Pay with zero card exposure on device.
              </Text>

              {pendingSessionId && (
                <View style={styles.pendingSessionBox}>
                  <Ionicons name="information-circle" size={18} color="#059669" />
                  <View style={{ flex: 1, marginLeft: 8 }}>
                    <Text style={styles.pendingSessionTitle}>Checkout in Progress</Text>
                    <Text style={styles.pendingSessionDesc}>
                      Once finished in your browser, tap below to verify and activate your 1-month coaching plan.
                    </Text>
                  </View>
                </View>
              )}

              <TouchableOpacity
                style={[styles.payBtn, loading && styles.payBtnDisabled]}
                onPress={handleHostedCheckout}
                disabled={loading || verifyingSession}
              >
                {loading ? (
                  <ActivityIndicator color={Colors.white} />
                ) : (
                  <>
                    <Ionicons name="lock-closed" size={16} color={Colors.white} />
                    <Text style={styles.payBtnText}>
                      {pendingSessionId ? 'Re-Open Secure Payment Window' : `Proceed to Secure Checkout ($${plan.price} AUD)`}
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              {pendingSessionId && (
                <TouchableOpacity
                  style={[styles.verifyBtn, verifyingSession && styles.payBtnDisabled]}
                  onPress={handleVerifyHostedCheckout}
                  disabled={verifyingSession}
                >
                  {verifyingSession ? (
                    <ActivityIndicator color={Colors.white} />
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle" size={16} color={Colors.white} />
                      <Text style={styles.verifyBtnText}>
                        I Have Completed Payment — Verify & Activate
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              )}

              <Text style={styles.encryptedNotice}>
                ✓ 256-Bit SSL Encrypted • Official Payment Gateway
              </Text>
            </View>
          )}

          {/* Option 2: Direct Card Details */}
          {checkoutMode === 'card' && (
            <View style={styles.formCard}>
              <Text style={styles.formSectionTitle}>CREDIT / DEBIT CARD DETAILS</Text>

              <View style={styles.fieldWrap}>
                <Text style={styles.fieldLabel}>Cardholder Name</Text>
                <TextInput
                  style={styles.input}
                  value={cardholderName}
                  onChangeText={setCardholderName}
                  placeholder="Name on Card"
                  placeholderTextColor={Colors.textTertiary}
                />
              </View>

              <View style={styles.fieldWrap}>
                <Text style={styles.fieldLabel}>Card Number</Text>
                <View style={styles.cardInputRow}>
                  <TextInput
                    style={[styles.input, { flex: 1, paddingLeft: 38 }]}
                    value={cardNumber}
                    onChangeText={(t) => setCardNumber(formatCardNumber(t))}
                    placeholder="4242 •••• •••• 4242"
                    placeholderTextColor={Colors.textTertiary}
                    keyboardType="numeric"
                    maxLength={19}
                  />
                  <Ionicons
                    name="card"
                    size={18}
                    color={Colors.textTertiary}
                    style={styles.cardIcon}
                  />
                </View>
              </View>

              <View style={styles.rowFields}>
                <View style={[styles.fieldWrap, { flex: 1, marginRight: Spacing.sm }]}>
                  <Text style={styles.fieldLabel}>Expiry Date</Text>
                  <TextInput
                    style={styles.input}
                    value={expiry}
                    onChangeText={(t) => setExpiry(formatExpiry(t))}
                    placeholder="MM/YY"
                    placeholderTextColor={Colors.textTertiary}
                    keyboardType="numeric"
                    maxLength={5}
                  />
                </View>

                <View style={[styles.fieldWrap, { flex: 1 }]}>
                  <Text style={styles.fieldLabel}>CVC / CVV</Text>
                  <TextInput
                    style={styles.input}
                    value={cvc}
                    onChangeText={(t) => setCvc(t.replace(/\D/g, '').slice(0, 4))}
                    placeholder="123"
                    placeholderTextColor={Colors.textTertiary}
                    keyboardType="numeric"
                    secureTextEntry
                    maxLength={4}
                  />
                </View>
              </View>

              <TouchableOpacity
                style={[styles.payBtn, loading && styles.payBtnDisabled]}
                onPress={handleDirectPay}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={Colors.white} />
                ) : (
                  <>
                    <Ionicons name="lock-closed" size={16} color={Colors.white} />
                    <Text style={styles.payBtnText}>
                      Pay ${plan.price} AUD & Activate 1 Month
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              <Text style={styles.encryptedNotice}>
                ✓ 256-Bit SSL Encrypted • Verified Secure Gateway
              </Text>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  topNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  closeBtn: {
    padding: Spacing.xs,
  },
  navTitle: {
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.bold,
    color: Colors.textPrimary,
    letterSpacing: 1,
  },
  content: {
    padding: Spacing.base,
    paddingBottom: Spacing.xxxl,
  },
  headerCard: {
    backgroundColor: '#111827',
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(5, 150, 105, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
    alignSelf: 'flex-start',
    marginBottom: Spacing.sm,
  },
  liveBadgeText: {
    color: '#34D399',
    fontSize: 9,
    fontWeight: FontWeights.bold,
    marginLeft: 4,
    letterSpacing: 0.5,
  },
  headerTitle: {
    color: Colors.white,
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.black,
    letterSpacing: 0.5,
  },
  headerDesc: {
    color: '#9CA3AF',
    fontSize: FontSizes.xs,
    marginTop: 4,
    lineHeight: 18,
  },
  planCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.base,
    borderWidth: 2,
    borderColor: '#FECACA',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  planCategory: {
    fontSize: 9,
    fontWeight: FontWeights.extrabold,
    color: Colors.primary,
    letterSpacing: 0.5,
  },
  planName: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.black,
    color: Colors.textPrimary,
    marginTop: 2,
  },
  planPeriod: {
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
    marginTop: 2,
  },
  planPrice: {
    fontSize: FontSizes.xxl,
    fontWeight: FontWeights.black,
    color: Colors.textPrimary,
    fontFamily: 'monospace',
  },
  planCurrency: {
    fontSize: 9,
    color: Colors.textMuted,
  },
  datesCard: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: BorderRadius.xl,
    padding: Spacing.base,
    marginBottom: Spacing.md,
  },
  datesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  datesTitle: {
    fontSize: 10,
    fontWeight: FontWeights.black,
    color: Colors.primary,
    marginLeft: 6,
    letterSpacing: 0.5,
  },
  datesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dateCol: {
    flex: 1,
    backgroundColor: Colors.white,
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    marginHorizontal: 3,
  },
  dateLabel: {
    fontSize: 8,
    color: Colors.textMuted,
    fontWeight: FontWeights.bold,
  },
  dateValue: {
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.bold,
    color: Colors.textPrimary,
    marginTop: 2,
  },
  methodSelector: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: BorderRadius.lg,
    padding: 3,
    marginBottom: Spacing.md,
  },
  methodTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: BorderRadius.md,
  },
  methodTabActive: {
    backgroundColor: Colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  methodTabText: {
    fontSize: 11,
    fontWeight: FontWeights.bold,
    color: Colors.textMuted,
    marginLeft: 6,
  },
  methodTabTextActive: {
    color: Colors.textPrimary,
  },
  formCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.base,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  formSectionTitle: {
    fontSize: 10,
    fontWeight: FontWeights.bold,
    color: Colors.textMuted,
    letterSpacing: 0.5,
    marginBottom: Spacing.sm,
  },
  hostedDesc: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginBottom: Spacing.base,
  },
  pendingSessionBox: {
    flexDirection: 'row',
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: BorderRadius.lg,
    padding: Spacing.sm,
    marginBottom: Spacing.base,
  },
  pendingSessionTitle: {
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.bold,
    color: '#065F46',
  },
  pendingSessionDesc: {
    fontSize: 11,
    color: '#047857',
    marginTop: 2,
  },
  fieldWrap: {
    marginBottom: Spacing.md,
  },
  fieldLabel: {
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.bold,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    fontSize: FontSizes.sm,
    color: Colors.textPrimary,
  },
  cardInputRow: {
    position: 'relative',
    justifyContent: 'center',
  },
  cardIcon: {
    position: 'absolute',
    left: 12,
  },
  rowFields: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  payBtn: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.xs,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  verifyBtn: {
    backgroundColor: '#059669',
    borderRadius: BorderRadius.lg,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.sm,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  verifyBtnText: {
    color: Colors.white,
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.black,
    letterSpacing: 0.5,
    marginLeft: 6,
  },
  payBtnDisabled: {
    opacity: 0.6,
  },
  payBtnText: {
    color: Colors.white,
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.black,
    letterSpacing: 0.5,
    marginLeft: 8,
  },
  encryptedNotice: {
    textAlign: 'center',
    fontSize: 9,
    color: Colors.textTertiary,
    marginTop: Spacing.md,
  },
});
