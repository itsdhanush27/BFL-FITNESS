import React from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Share,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontSizes, FontWeights, Spacing, BorderRadius } from '../constants/theme';
import type { TransactionRecord } from '../types';

interface ReceiptModalProps {
  visible: boolean;
  onClose: () => void;
  transaction: TransactionRecord | null;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  visible,
  onClose,
  transaction,
}) => {
  if (!transaction) return null;

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

  const invoiceNumber = transaction.invoiceNumber || `BFL-INV-${transaction.id.slice(-6).toUpperCase()}`;
  const startDate = formatDate(transaction.billingPeriodStart || transaction.createdAt);
  const endDate = formatDate(transaction.billingPeriodEnd);

  const handleShareReceipt = async () => {
    try {
      const receiptText = `
★ BFL FITNESS — OFFICIAL TAX INVOICE & RECEIPT ★
Invoice #: ${invoiceNumber}
Date: ${formatDate(transaction.createdAt)}
Status: PAID (Verified)

Athlete: ${transaction.clientName} (${transaction.clientEmail})
Plan: ${transaction.planName}
1-Month Coaching Period: ${startDate} – ${endDate} (30 Days)

Amount Paid: $${transaction.amount} ${transaction.currency || 'AUD'}
Payment Method: ${transaction.paymentMethod} (Card •••• ${transaction.cardLast4 || '4242'})
Payment Reference: ${transaction.stripeChargeId || transaction.id}

Head Coach: Coach Mass Narimanian
Support: support@bflfitness.com
      `.trim();

      await Share.share({
        message: receiptText,
        title: `BFL Fitness Receipt - ${invoiceNumber}`,
      });
    } catch (err) {
      console.error('[ReceiptModal] Share error:', err);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header Bar */}
        <View style={styles.topNav}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.navTitle}>OFFICIAL RECEIPT</Text>
          <TouchableOpacity onPress={handleShareReceipt} style={styles.shareBtn}>
            <Ionicons name="share-outline" size={22} color={Colors.primary} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Receipt Document Container */}
          <View style={styles.docCard}>
            {/* Dark Brand Header */}
            <View style={styles.brandHeader}>
              <View style={styles.redStrip} />
              <View style={styles.brandRow}>
                <View>
                  <Text style={styles.brandTitle}>BFL FITNESS</Text>
                  <Text style={styles.brandSubtitle}>BUILD FOR LIFE • HIGH PERFORMANCE COACHING</Text>
                </View>
                <View style={styles.badgeWrap}>
                  <Text style={styles.statusBadgeText}>PAID</Text>
                </View>
              </View>
              <Text style={styles.invoiceNumText}>INVOICE: {invoiceNumber}</Text>
            </View>

            <View style={styles.docBody}>
              {/* Payment Status & Date Bar */}
              <View style={styles.metaRow}>
                <View style={styles.metaCol}>
                  <Text style={styles.metaLabel}>PAYMENT DATE</Text>
                  <Text style={styles.metaValue}>{formatDate(transaction.createdAt)}</Text>
                </View>
                <View style={[styles.metaCol, { alignItems: 'flex-end' }]}>
                  <Text style={styles.metaLabel}>GATEWAY</Text>
                  <Text style={styles.metaValue}>Verified Secure Gateway</Text>
                </View>
              </View>

              {/* Billed To */}
              <View style={styles.infoBox}>
                <Text style={styles.sectionHeading}>BILLED TO (ATHLETE)</Text>
                <Text style={styles.clientNameText}>{transaction.clientName}</Text>
                <Text style={styles.clientEmailText}>{transaction.clientEmail}</Text>
                <Text style={styles.clientIdText}>Client ID: {transaction.clientId}</Text>
              </View>

              {/* 1-Month Plan Activation Dates Box */}
              <View style={styles.activationCard}>
                <View style={styles.activationHeader}>
                  <Ionicons name="calendar" size={16} color={Colors.primary} />
                  <Text style={styles.activationTitle}>1-MONTH PLAN ACTIVATION DATES</Text>
                </View>
                <View style={styles.datesGrid}>
                  <View style={styles.dateBlock}>
                    <Text style={styles.dateBlockLabel}>START DATE</Text>
                    <Text style={styles.dateBlockValue}>{startDate}</Text>
                  </View>
                  <View style={styles.dateBlock}>
                    <Text style={styles.dateBlockLabel}>EXPIRATION DATE</Text>
                    <Text style={[styles.dateBlockValue, { color: Colors.primary }]}>{endDate}</Text>
                  </View>
                </View>
                <Text style={styles.activationDuration}>Duration: 1 Month (30 Days Active Access)</Text>
              </View>

              {/* Line Items */}
              <View style={styles.itemTable}>
                <View style={styles.tableHeader}>
                  <Text style={styles.thItem}>ITEM & DESCRIPTION</Text>
                  <Text style={styles.thAmount}>AMOUNT</Text>
                </View>
                <View style={styles.tableRow}>
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <Text style={styles.planNameText}>{transaction.planName}</Text>
                    <Text style={styles.planDescText}>
                      • 1 Month Coaching Access (Workouts & Nutrition)
                    </Text>
                    <Text style={styles.planDescText}>
                      • Progressive Overload Logging & Coach Communication
                    </Text>
                  </View>
                  <Text style={styles.amountText}>
                    ${transaction.amount} {transaction.currency || 'AUD'}
                  </Text>
                </View>
              </View>

              {/* Total & Summary */}
              <View style={styles.summaryBox}>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Subtotal</Text>
                  <Text style={styles.summaryVal}>${transaction.amount} {transaction.currency || 'AUD'}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>GST / Tax (Inclusive)</Text>
                  <Text style={styles.summaryVal}>$0.00</Text>
                </View>
                <View style={styles.divider} />
                <View style={styles.summaryRow}>
                  <Text style={styles.totalLabel}>TOTAL PAID</Text>
                  <Text style={styles.totalVal}>${transaction.amount} {transaction.currency || 'AUD'}</Text>
                </View>
              </View>

              {/* Payment Method Details */}
              <View style={styles.paymentMethodCard}>
                <View style={styles.pmRow}>
                  <Ionicons name="card-outline" size={18} color={Colors.textPrimary} />
                  <Text style={styles.pmTitle}>
                    {transaction.paymentMethod} • Ending in •••• {transaction.cardLast4 || '4242'}
                  </Text>
                </View>
                <Text style={styles.pmRefText}>
                  Transaction ID: {transaction.stripeChargeId || transaction.id}
                </Text>
              </View>

              {/* Signature / Certification */}
              <View style={styles.signatureBox}>
                <View style={styles.sigLine} />
                <Text style={styles.sigName}>Coach Mass Narimanian</Text>
                <Text style={styles.sigTitle}>Founder & Head Coach • BFL Fitness</Text>
                <View style={styles.authRow}>
                  <Ionicons name="checkmark-circle" size={14} color={Colors.success} />
                  <Text style={styles.authText}>Authenticated via 256-Bit Encrypted Gateway</Text>
                </View>
              </View>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F3F4F6',
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
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.bold,
    color: Colors.textPrimary,
    letterSpacing: 1,
  },
  shareBtn: {
    padding: Spacing.xs,
  },
  content: {
    padding: Spacing.base,
    paddingBottom: Spacing.xxxl,
  },
  docCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.borderLight,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  brandHeader: {
    backgroundColor: '#121214',
    padding: Spacing.lg,
  },
  redStrip: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: Colors.primary,
  },
  brandRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  brandTitle: {
    color: Colors.white,
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.black,
    letterSpacing: 1,
  },
  brandSubtitle: {
    color: '#9CA3AF',
    fontSize: 9,
    marginTop: 2,
    fontWeight: FontWeights.medium,
  },
  badgeWrap: {
    backgroundColor: '#059669',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusBadgeText: {
    color: Colors.white,
    fontSize: 10,
    fontWeight: FontWeights.extrabold,
    letterSpacing: 0.5,
  },
  invoiceNumText: {
    color: '#D1D5DB',
    fontSize: FontSizes.xs,
    fontFamily: 'monospace',
    marginTop: Spacing.md,
  },
  docBody: {
    padding: Spacing.lg,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  metaCol: {},
  metaLabel: {
    fontSize: 9,
    color: Colors.textMuted,
    fontWeight: FontWeights.bold,
    letterSpacing: 0.5,
  },
  metaValue: {
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.bold,
    color: Colors.textPrimary,
    marginTop: 2,
  },
  infoBox: {
    marginTop: Spacing.md,
    padding: Spacing.md,
    backgroundColor: '#F9FAFB',
    borderRadius: BorderRadius.lg,
  },
  sectionHeading: {
    fontSize: 9,
    fontWeight: FontWeights.bold,
    color: Colors.textMuted,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  clientNameText: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.bold,
    color: Colors.textPrimary,
  },
  clientEmailText: {
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
    marginTop: 1,
  },
  clientIdText: {
    fontSize: 10,
    color: Colors.textTertiary,
    marginTop: 2,
    fontFamily: 'monospace',
  },
  activationCard: {
    marginTop: Spacing.md,
    padding: Spacing.md,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: BorderRadius.lg,
  },
  activationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  activationTitle: {
    fontSize: 10,
    fontWeight: FontWeights.extrabold,
    color: Colors.primary,
    marginLeft: 6,
    letterSpacing: 0.5,
  },
  datesGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dateBlock: {
    flex: 1,
    backgroundColor: Colors.white,
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    marginHorizontal: 3,
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  dateBlockLabel: {
    fontSize: 8,
    color: Colors.textMuted,
    fontWeight: FontWeights.bold,
  },
  dateBlockValue: {
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.bold,
    color: Colors.textPrimary,
    marginTop: 2,
  },
  activationDuration: {
    fontSize: 10,
    color: Colors.textMuted,
    marginTop: Spacing.xs,
    textAlign: 'center',
    fontWeight: FontWeights.medium,
  },
  itemTable: {
    marginTop: Spacing.md,
  },
  tableHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#1F2937',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: BorderRadius.md,
  },
  thItem: {
    color: Colors.white,
    fontSize: 9,
    fontWeight: FontWeights.bold,
  },
  thAmount: {
    color: Colors.white,
    fontSize: 9,
    fontWeight: FontWeights.bold,
  },
  tableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  planNameText: {
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.bold,
    color: Colors.textPrimary,
  },
  planDescText: {
    fontSize: 9,
    color: Colors.textMuted,
    marginTop: 2,
  },
  amountText: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.black,
    color: Colors.textPrimary,
  },
  summaryBox: {
    marginTop: Spacing.md,
    padding: Spacing.md,
    backgroundColor: '#F9FAFB',
    borderRadius: BorderRadius.lg,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 2,
  },
  summaryLabel: {
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
  },
  summaryVal: {
    fontSize: FontSizes.xs,
    color: Colors.textPrimary,
    fontWeight: FontWeights.bold,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginVertical: Spacing.xs,
  },
  totalLabel: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.black,
    color: Colors.textPrimary,
  },
  totalVal: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.black,
    color: Colors.primary,
  },
  paymentMethodCard: {
    marginTop: Spacing.md,
    padding: Spacing.md,
    backgroundColor: '#F9FAFB',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  pmRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pmTitle: {
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.bold,
    color: Colors.textPrimary,
    marginLeft: 6,
  },
  pmRefText: {
    fontSize: 9,
    color: Colors.textTertiary,
    marginTop: 4,
    fontFamily: 'monospace',
  },
  signatureBox: {
    marginTop: Spacing.lg,
    alignItems: 'center',
  },
  sigLine: {
    width: 140,
    height: 1,
    backgroundColor: Colors.borderLight,
    marginBottom: 6,
  },
  sigName: {
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.bold,
    color: Colors.textPrimary,
  },
  sigTitle: {
    fontSize: 9,
    color: Colors.textMuted,
  },
  authRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  authText: {
    fontSize: 9,
    color: Colors.success,
    fontWeight: FontWeights.bold,
    marginLeft: 4,
  },
});
