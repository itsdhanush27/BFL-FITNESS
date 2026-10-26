import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { Colors, BorderRadius, FontSizes } from '../constants/theme';

export type BadgeVariant =
  | 'active'
  | 'success'
  | 'pending'
  | 'warning'
  | 'danger'
  | 'expired'
  | 'past_due'
  | 'neutral'
  | 'primary';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
  style?: ViewStyle;
}

export const Badge: React.FC<BadgeProps> = ({
  label,
  variant = 'neutral',
  size = 'md',
  style,
}) => {
  const getColors = () => {
    switch (variant) {
      case 'active':
      case 'success':
        return { bg: Colors.successLight, text: '#065F46', border: '#A7F3D0' };
      case 'pending':
      case 'warning':
      case 'past_due':
        return { bg: Colors.warningLight, text: '#92400E', border: '#FDE68A' };
      case 'danger':
      case 'expired':
        return { bg: Colors.errorLight, text: '#991B1B', border: '#FECACA' };
      case 'primary':
        return { bg: Colors.primaryLight, text: Colors.primaryDark, border: '#FCA5A5' };
      case 'neutral':
      default:
        return { bg: Colors.borderLight, text: Colors.textSecondary, border: Colors.border };
    }
  };

  const { bg, text, border } = getColors();

  return (
    <View
      style={[
        styles.badge,
        size === 'sm' ? styles.badgeSm : styles.badgeMd,
        { backgroundColor: bg, borderColor: border },
        style,
      ]}
    >
      <Text
        style={[
          styles.text,
          size === 'sm' ? styles.textSm : styles.textMd,
          { color: text },
        ]}
      >
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    alignSelf: 'flex-start',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeSm: {
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeMd: {
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  text: {
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  textSm: {
    fontSize: FontSizes.xs - 1,
  },
  textMd: {
    fontSize: FontSizes.xs,
  },
});
