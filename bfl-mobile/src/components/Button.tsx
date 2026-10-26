import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  TextStyle,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, BorderRadius, FontSizes, FontWeights, Spacing, Shadows } from '../constants/theme';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  iconPosition?: 'left' | 'right';
  style?: ViewStyle;
  textStyle?: TextStyle;
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  icon,
  iconPosition = 'left',
  style,
  textStyle,
  fullWidth = false,
}) => {
  const isGradient = variant === 'primary' && !disabled;

  const getContainerStyle = (): ViewStyle => {
    const sizeStyle =
      size === 'sm'
        ? styles.sizeSm
        : size === 'lg'
        ? styles.sizeLg
        : styles.sizeMd;

    let variantStyle: ViewStyle = {};
    if (disabled) {
      variantStyle = styles.disabled;
    } else {
      switch (variant) {
        case 'secondary':
          variantStyle = styles.secondary;
          break;
        case 'outline':
          variantStyle = styles.outline;
          break;
        case 'danger':
          variantStyle = styles.danger;
          break;
        case 'ghost':
          variantStyle = styles.ghost;
          break;
        case 'primary':
        default:
          variantStyle = styles.primary;
          break;
      }
    }

    return {
      ...styles.base,
      ...sizeStyle,
      ...variantStyle,
      ...(fullWidth && { width: '100%' }),
      ...style,
    };
  };

  const getTextColor = (): string => {
    if (disabled) return Colors.textTertiary;
    switch (variant) {
      case 'outline':
      case 'ghost':
        return Colors.primary;
      case 'secondary':
        return Colors.textPrimary;
      case 'danger':
      case 'primary':
      default:
        return Colors.white;
    }
  };

  const content = (
    <View style={styles.innerRow}>
      {loading ? (
        <ActivityIndicator
          size="small"
          color={getTextColor()}
          style={styles.spinner}
        />
      ) : (
        <>
          {icon && iconPosition === 'left' && (
            <Ionicons
              name={icon}
              size={size === 'sm' ? 16 : 18}
              color={getTextColor()}
              style={styles.iconLeft}
            />
          )}
          <Text
            style={[
              styles.text,
              size === 'sm' && styles.textSm,
              size === 'lg' && styles.textLg,
              { color: getTextColor() },
              textStyle,
            ]}
          >
            {title}
          </Text>
          {icon && iconPosition === 'right' && (
            <Ionicons
              name={icon}
              size={size === 'sm' ? 16 : 18}
              color={getTextColor()}
              style={styles.iconRight}
            />
          )}
        </>
      )}
    </View>
  );

  if (isGradient) {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={disabled || loading}
        activeOpacity={0.85}
        style={[
          {
            borderRadius: BorderRadius.md,
            overflow: 'hidden',
            ...(fullWidth && { width: '100%' }),
          },
          Shadows.redGlow,
          style,
        ]}
      >
        <LinearGradient
          colors={Colors.gradientPrimary}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.base, size === 'sm' ? styles.sizeSm : size === 'lg' ? styles.sizeLg : styles.sizeMd]}
        >
          {content}
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      style={getContainerStyle()}
    >
      {content}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  innerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sizeSm: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  sizeMd: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  sizeLg: {
    paddingVertical: Spacing.base,
    paddingHorizontal: Spacing.xl,
  },
  primary: {
    backgroundColor: Colors.primary,
    ...Shadows.sm,
  },
  secondary: {
    backgroundColor: Colors.borderLight,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  danger: {
    backgroundColor: Colors.error,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  disabled: {
    backgroundColor: Colors.borderLight,
    borderColor: Colors.border,
    borderWidth: 1,
  },
  text: {
    fontSize: FontSizes.base,
    fontWeight: FontWeights.bold,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  textSm: {
    fontSize: FontSizes.sm,
  },
  textLg: {
    fontSize: FontSizes.md,
  },
  iconLeft: {
    marginRight: Spacing.sm,
  },
  iconRight: {
    marginLeft: Spacing.sm,
  },
  spinner: {
    marginVertical: 2,
  },
});
