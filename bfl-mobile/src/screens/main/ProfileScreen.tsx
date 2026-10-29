import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { Header } from '../../components/Header';
import { Card } from '../../components/Card';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { Colors, FontSizes, FontWeights, Spacing, BorderRadius } from '../../constants/theme';
import { getSubscriptionStatus, CoachingPlan, TransactionRecord } from '../../types';
import { subscribeToClientTransactions } from '../../services/stripeService';
import { ReceiptModal } from '../../components/ReceiptModal';
import { PlanCheckoutModal } from '../../components/PlanCheckoutModal';

export const ProfileScreen: React.FC = () => {
  const { user, signOut } = useAuth();
  const subStatus = getSubscriptionStatus(user);

  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [selectedReceipt, setSelectedReceipt] = useState<TransactionRecord | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);

  // Subscribe to real-time client transaction records
  useEffect(() => {
    if (!user?.uid) return;
    const unsub = subscribeToClientTransactions(user.uid, (records) => {
      setTransactions(records);
    });
    return () => unsub();
  }, [user?.uid]);

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out of BFL Fitness?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          try {
            await signOut();
          } catch (err) {
            console.error('[ProfileScreen] SignOut error:', err);
          }
        },
      },
    ]);
  };

  const getStatusBadgeVariant = () => {
    switch (subStatus) {
      case 'active':
        return 'active';
      case 'past_due':
        return 'warning';
      case 'expired':
        return 'danger';
      case 'pending_coach_approval':
        return 'pending';
      default:
        return 'neutral';
    }
  };

  const formatDate = (isoStr?: string) => {
    if (!isoStr) return 'N/A';
    try {
      return new Date(isoStr).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return isoStr;
    }
  };

  const getDaysRemaining = (expiryDate?: string) => {
    if (!expiryDate) return 0;
    const diff = new Date(expiryDate).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  const daysLeft = getDaysRemaining(user?.planExpiresAt);

  // Fallback transaction if user has an active plan but no recorded doc yet
  const effectiveTransactions = [...transactions];
  if (effectiveTransactions.length === 0 && subStatus === 'active') {
    effectiveTransactions.push({
      id: `tx_${user?.uid?.slice(0, 8) || 'active'}`,
      clientId: user?.uid || '',
      clientName: user?.displayName || 'Athlete',
      clientEmail: user?.email || '',
      planId: user?.activePlanId || 'plan_online_monthly',
      planName: user?.activePlanName || 'Online Coaching (Monthly)',
      amount: user?.activePlanPrice || 350,
      currency: 'AUD',
      status: 'succeeded',
      paymentMethod: 'Credit / Debit Card',
      createdAt: user?.packageStartedAt || new Date().toISOString(),
      cardLast4: '4242',
      cardBrand: 'Visa',
      invoiceNumber: `BFL-INV-${new Date().getFullYear()}-${user?.uid?.slice(-4).toUpperCase() || '1042'}`,
      billingPeriodStart: user?.packageStartedAt || new Date().toISOString(),
      billingPeriodEnd: user?.planExpiresAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      durationDays: 30,
    });
  }

  const defaultCheckoutPlan: CoachingPlan = {
    id: user?.activePlanId || 'plan_online_monthly',
    name: user?.activePlanName?.split('(')[0]?.trim() || 'Online Coaching (Monthly)',
    price: user?.activePlanPrice || 350,
    period: '/ month',
    tagline: 'Full customized nutrition, workout split, and weekly audits',
    features: ['Weekly check-ins', 'Nutrition blueprint', 'Workout routines', 'Coach messaging'],
    category: 'online',
    billingCycle: 'monthly',
    idealFor: 'Athletes seeking comprehensive monthly online coaching',
    spotsLeft: 5,
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header title="ACCOUNT" subtitle="Profile & Membership" />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* User Card */}
        <Card style={styles.userCard}>
          <View style={styles.avatarWrap}>
            <Text style={styles.avatarInitial}>
              {(user?.displayName?.[0] || user?.email?.[0] || 'A').toUpperCase()}
            </Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{user?.displayName || 'Athlete'}</Text>
            <Text style={styles.userEmail}>{user?.email}</Text>
            <View style={styles.badgeRow}>
              <Badge
                label={user?.role?.toUpperCase() || 'CLIENT'}
                variant="neutral"
                size="sm"
                style={{ marginRight: 6 }}
              />
              <Badge
                label={subStatus.replace(/_/g, ' ').toUpperCase()}
                variant={getStatusBadgeVariant()}
                size="sm"
              />
            </View>
          </View>
        </Card>

        {/* Subscription & Plan Activation Card */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>MEMBERSHIP & SUBSCRIPTION</Text>
        </View>

        <Card style={styles.membershipCard}>
          <View style={styles.membershipRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.membershipLabel}>Coaching Tier</Text>
              <Text style={styles.membershipPlan}>{user?.activePlanName || 'Online Coaching (Monthly)'}</Text>
            </View>
            <Badge label={subStatus.toUpperCase()} variant={getStatusBadgeVariant()} />
          </View>

          {/* Plan Start & End Dates Display */}
          <View style={styles.periodBox}>
            <View style={styles.periodHeader}>
              <Ionicons name="calendar" size={14} color={Colors.primary} />
              <Text style={styles.periodHeaderText}>
                {user?.billingCycle === 'hourly'
                  ? '1-ON-1 COACHING SESSION'
                  : user?.billingCycle === 'weekly'
                  ? 'WEEKLY BILLING CYCLE (7 DAYS)'
                  : user?.billingCycle === 'custom'
                  ? `CUSTOM DURATION (${user?.packageDurationDays || 30} DAYS)`
                  : 'MONTHLY BILLING CYCLE'}
              </Text>
            </View>
            <View style={styles.datesGrid}>
              <View style={styles.dateCol}>
                <Text style={styles.dateLabel}>ACTIVATION DATE</Text>
                <Text style={styles.dateValue}>
                  {user?.packageStartedAt ? formatDate(user.packageStartedAt) : 'Recently Started'}
                </Text>
              </View>
              <View style={styles.dateCol}>
                <Text style={styles.dateLabel}>EXPIRATION DATE</Text>
                <Text style={[styles.dateValue, { color: Colors.primary }]}>
                  {user?.planExpiresAt ? formatDate(user.planExpiresAt) : 'Active Period'}
                </Text>
              </View>
            </View>
            {user?.billingCycle === 'hourly' ? (
              <Text style={styles.daysRemainingText}>
                {subStatus === 'expired'
                  ? 'Session credit used — book next session to continue'
                  : `${Math.max(0, (user?.sessionCredits || 1) - (user?.usedSessionCredits || 0))} Session Credit Remaining (${daysLeft} days left in booking window)`}
              </Text>
            ) : (
              <Text style={styles.daysRemainingText}>
                {subStatus === 'expired' ? 'Plan has expired' : `${daysLeft} Days Remaining in Current Cycle`}
              </Text>
            )}
          </View>

          {/* Renew / Upgrade Button */}
          <TouchableOpacity
            style={styles.renewBtn}
            onPress={() => setShowCheckoutModal(true)}
          >
            <Ionicons name="card" size={16} color={Colors.white} />
            <Text style={styles.renewBtnText}>
              {subStatus === 'expired' ? 'Re-Enroll Subscription' : 'Renew / Upgrade Plan'}
            </Text>
          </TouchableOpacity>

          <View style={styles.divider} />

          <View style={styles.coachRow}>
            <View style={styles.coachIconWrap}>
              <Ionicons name="person" size={18} color={Colors.primary} />
            </View>
            <View style={styles.coachInfo}>
              <Text style={styles.coachLabel}>Assigned Head Coach</Text>
              <Text style={styles.coachName}>Coach Mass Narimanian</Text>
            </View>
          </View>
        </Card>

        {/* Payment History & Tax Invoices Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>PAYMENT HISTORY & TAX INVOICES</Text>
        </View>

        <Card style={styles.invoicesCard}>
          {effectiveTransactions.length === 0 ? (
            <View style={styles.emptyInvoices}>
              <Ionicons name="receipt-outline" size={28} color={Colors.textTertiary} />
              <Text style={styles.emptyInvoicesText}>No payment history yet</Text>
            </View>
          ) : (
            effectiveTransactions.map((tx, idx) => (
              <View key={tx.id || idx}>
                {idx > 0 && <View style={styles.invoiceDivider} />}
                <View style={styles.invoiceRow}>
                  <View style={{ flex: 1 }}>
                    <View style={styles.invoiceMetaRow}>
                      <Text style={styles.invoiceNumText}>
                        {tx.invoiceNumber || `BFL-INV-${tx.id.slice(-6).toUpperCase()}`}
                      </Text>
                      <View style={styles.paidBadge}>
                        <Text style={styles.paidBadgeText}>PAID</Text>
                      </View>
                    </View>
                    <Text style={styles.invoicePlanText}>{tx.planName}</Text>
                    <Text style={styles.invoiceDateText}>
                      Period: {formatDate(tx.billingPeriodStart)} → {formatDate(tx.billingPeriodEnd)}
                    </Text>
                  </View>

                  <View style={styles.invoiceRightCol}>
                    <Text style={styles.invoiceAmountText}>
                      ${tx.amount} {tx.currency || 'AUD'}
                    </Text>
                    <TouchableOpacity
                      style={styles.viewReceiptBtn}
                      onPress={() => {
                        setSelectedReceipt(tx);
                        setShowReceiptModal(true);
                      }}
                    >
                      <Ionicons name="document-text-outline" size={12} color={Colors.primary} />
                      <Text style={styles.viewReceiptBtnText}>Receipt</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))
          )}
        </Card>

        {/* Account Options */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>APP PREFERENCES</Text>
        </View>

        <Card style={styles.optionsCard}>
          <TouchableOpacity style={styles.optionRow}>
            <View style={styles.optionLeft}>
              <Ionicons name="notifications-outline" size={20} color={Colors.textSecondary} />
              <Text style={styles.optionText}>Push Notifications</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={Colors.textTertiary} />
          </TouchableOpacity>

          <View style={styles.optionDivider} />

          <TouchableOpacity style={styles.optionRow}>
            <View style={styles.optionLeft}>
              <Ionicons name="shield-checkmark-outline" size={20} color={Colors.textSecondary} />
              <Text style={styles.optionText}>Stripe Security & Privacy</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={Colors.textTertiary} />
          </TouchableOpacity>
        </Card>

        {/* Sign Out Button */}
        <Button
          title="Sign Out"
          onPress={handleSignOut}
          variant="outline"
          size="lg"
          icon="log-out-outline"
          fullWidth
          style={styles.signOutBtn}
        />

        <Text style={styles.versionText}>BFL Fitness Mobile • v1.0.0 (Secure Gateway)</Text>
      </ScrollView>

      {/* Official Receipt Modal */}
      <ReceiptModal
        visible={showReceiptModal}
        onClose={() => setShowReceiptModal(false)}
        transaction={selectedReceipt}
      />

      {/* Plan Checkout Modal */}
      <PlanCheckoutModal
        visible={showCheckoutModal}
        onClose={() => setShowCheckoutModal(false)}
        plan={defaultCheckoutPlan}
        clientName={user?.displayName || 'Athlete'}
        clientEmail={user?.email || 'athlete@bflfitness.com'}
        clientId={user?.uid || ''}
        onSuccess={(tx) => {
          setSelectedReceipt(tx);
          setShowReceiptModal(true);
        }}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.xxxl,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    padding: Spacing.lg,
  },
  avatarWrap: {
    width: 60,
    height: 60,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.darkBg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.primary,
    marginRight: Spacing.base,
  },
  avatarInitial: {
    fontSize: FontSizes.xxl,
    fontWeight: FontWeights.extrabold,
    color: Colors.white,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.extrabold,
    color: Colors.textPrimary,
  },
  userEmail: {
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
    marginTop: 2,
  },
  badgeRow: {
    flexDirection: 'row',
    marginTop: Spacing.sm,
  },
  sectionHeader: {
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.bold,
    color: Colors.textMuted,
    letterSpacing: 1,
  },
  membershipCard: {
    backgroundColor: Colors.white,
    padding: Spacing.base,
  },
  membershipRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  membershipLabel: {
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
    fontWeight: FontWeights.medium,
  },
  membershipPlan: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.bold,
    color: Colors.textPrimary,
    marginTop: 2,
  },
  periodBox: {
    marginTop: Spacing.md,
    padding: Spacing.md,
    backgroundColor: '#FEF2F2',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  periodHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  periodHeaderText: {
    fontSize: 9,
    fontWeight: FontWeights.black,
    color: Colors.primary,
    marginLeft: 4,
    letterSpacing: 0.5,
  },
  datesGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  dateCol: {
    flex: 1,
    backgroundColor: Colors.white,
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    marginHorizontal: 2,
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
  daysRemainingText: {
    fontSize: 10,
    color: Colors.textMuted,
    fontWeight: FontWeights.bold,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
  renewBtn: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.md,
  },
  renewBtnText: {
    color: Colors.white,
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.bold,
    marginLeft: 6,
    letterSpacing: 0.5,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginVertical: Spacing.md,
  },
  coachRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  coachIconWrap: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  coachInfo: {
    flex: 1,
  },
  coachLabel: {
    fontSize: FontSizes.xs - 1,
    color: Colors.textMuted,
  },
  coachName: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.bold,
    color: Colors.textPrimary,
  },
  invoicesCard: {
    backgroundColor: Colors.white,
    padding: Spacing.base,
  },
  emptyInvoices: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
  },
  emptyInvoicesText: {
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
    marginTop: 6,
  },
  invoiceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
  },
  invoiceDivider: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginVertical: Spacing.sm,
  },
  invoiceMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  invoiceNumText: {
    fontSize: 10,
    fontWeight: FontWeights.bold,
    color: Colors.textPrimary,
    fontFamily: 'monospace',
  },
  paidBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    marginLeft: 6,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  paidBadgeText: {
    color: '#059669',
    fontSize: 8,
    fontWeight: FontWeights.black,
  },
  invoicePlanText: {
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.bold,
    color: Colors.textPrimary,
    marginTop: 2,
  },
  invoiceDateText: {
    fontSize: 9,
    color: Colors.textMuted,
    marginTop: 2,
  },
  invoiceRightCol: {
    alignItems: 'flex-end',
    marginLeft: Spacing.md,
  },
  invoiceAmountText: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.black,
    color: Colors.textPrimary,
    fontFamily: 'monospace',
  },
  viewReceiptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.md,
    marginTop: 4,
  },
  viewReceiptBtnText: {
    color: Colors.primary,
    fontSize: 10,
    fontWeight: FontWeights.bold,
    marginLeft: 3,
  },
  optionsCard: {
    backgroundColor: Colors.white,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.base,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionText: {
    fontSize: FontSizes.sm,
    color: Colors.textPrimary,
    marginLeft: Spacing.md,
    fontWeight: FontWeights.medium,
  },
  optionDivider: {
    height: 1,
    backgroundColor: Colors.borderLight,
  },
  signOutBtn: {
    marginTop: Spacing.xl,
  },
  versionText: {
    textAlign: 'center',
    fontSize: FontSizes.xs,
    color: Colors.textTertiary,
    marginTop: Spacing.lg,
  },
});
