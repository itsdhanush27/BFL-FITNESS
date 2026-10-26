import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, BorderRadius, FontSizes, FontWeights, Spacing } from '../constants/theme';
import { getSubscriptionStatus } from '../types';
import type { UserProfile } from '../types';

interface SubscriptionBannerProps {
  user: UserProfile | null;
  onRenew?: () => void;
}

export const SubscriptionBanner: React.FC<SubscriptionBannerProps> = ({ user, onRenew }) => {
  if (!user) return null;

  const status = getSubscriptionStatus(user);

  // If fully active with no expiration alerts, hide banner
  if (status === 'active') return null;

  const getBannerDetails = () => {
    switch (status) {
      case 'past_due':
        return {
          icon: 'warning' as const,
          iconColor: Colors.warning,
          bg: Colors.warningLight,
          border: '#FDE68A',
          title: 'Payment Past Due',
          message: 'Your payment could not be processed. Please update your payment method to avoid service interruption.',
          actionText: 'Update Billing',
        };
      case 'cancelled':
        return {
          icon: 'information-circle' as const,
          iconColor: Colors.info,
          bg: Colors.infoLight,
          border: '#BFDBFE',
          title: 'Subscription Ending Soon',
          message: user.planExpiresAt
            ? `Your subscription will end on ${new Date(user.planExpiresAt).toLocaleDateString()}.`
            : 'Your subscription cancellation has been requested.',
          actionText: 'Keep Subscription',
        };
      case 'pending_coach_approval':
        return {
          icon: 'time' as const,
          iconColor: Colors.info,
          bg: Colors.infoLight,
          border: '#BFDBFE',
          title: 'Awaiting Coach Review',
          message: 'Your intake form is being reviewed by your coach. Your custom program is in progress!',
          actionText: undefined,
        };
      case 'expired':
      default:
        return {
          icon: 'alert-circle' as const,
          iconColor: Colors.error,
          bg: Colors.errorLight,
          border: '#FECACA',
          title: 'Membership Expired',
          message: 'Renew your subscription to access workouts, check-ins, and direct coach messaging.',
          actionText: 'Renew Plan',
        };
    }
  };

  const details = getBannerDetails();

  return (
    <View style={[styles.container, { backgroundColor: details.bg, borderColor: details.border }]}>
      <View style={styles.contentRow}>
        <Ionicons name={details.icon} size={22} color={details.iconColor} style={styles.icon} />
        <View style={styles.textColumn}>
          <Text style={[styles.title, { color: details.iconColor }]}>{details.title}</Text>
          <Text style={styles.message}>{details.message}</Text>
          {details.actionText && onRenew && (
            <TouchableOpacity onPress={onRenew} style={styles.actionBtn}>
              <Text style={[styles.actionText, { color: details.iconColor }]}>
                {details.actionText} →
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: Spacing.base,
    marginBottom: Spacing.base,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  icon: {
    marginRight: Spacing.sm + 2,
    marginTop: 2,
  },
  textColumn: {
    flex: 1,
  },
  title: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.bold,
    marginBottom: 2,
  },
  message: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  actionBtn: {
    marginTop: Spacing.xs,
    alignSelf: 'flex-start',
  },
  actionText: {
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.bold,
  },
});
