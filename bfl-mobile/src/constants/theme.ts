/**
 * BFL Fitness Mobile — Design System Constants
 * Matches the web app's visual identity: red/neutral palette, bold typography, premium feel.
 */

export const Colors = {
  // Primary brand
  primary: '#DC2626',       // red-600
  primaryDark: '#B91C1C',   // red-700
  primaryLight: '#FEE2E2',  // red-100
  primaryAccent: '#EF4444', // red-500

  // Neutrals
  white: '#FFFFFF',
  background: '#FAFAFA',    // neutral-50
  card: '#FFFFFF',
  border: '#E5E5E5',        // neutral-200
  borderLight: '#F5F5F5',   // neutral-100
  
  // Text
  textPrimary: '#171717',   // neutral-900
  textSecondary: '#525252',  // neutral-600
  textTertiary: '#A3A3A3',  // neutral-400
  textMuted: '#737373',     // neutral-500
  textInverse: '#FFFFFF',

  // Semantic
  success: '#10B981',       // emerald-500
  successLight: '#D1FAE5',  // emerald-100
  warning: '#F59E0B',       // amber-500
  warningLight: '#FEF3C7',  // amber-100
  error: '#EF4444',         // red-500
  errorLight: '#FEE2E2',    // red-100
  info: '#3B82F6',          // blue-500
  infoLight: '#DBEAFE',     // blue-100

  // Dark surfaces (for modals, overlays)
  darkBg: '#171717',        // neutral-900
  darkCard: '#262626',      // neutral-800
  darkBorder: '#404040',    // neutral-700

  // Gradients (applied as LinearGradient colors)
  gradientPrimary: ['#DC2626', '#B91C1C'] as [string, string],
  gradientDark: ['#171717', '#262626'] as [string, string],
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 40,
  section: 48,
} as const;

export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  full: 9999,
} as const;

export const FontSizes = {
  xs: 10,
  sm: 12,
  base: 14,
  md: 16,
  lg: 18,
  xl: 20,
  xxl: 24,
  xxxl: 30,
  hero: 36,
} as const;

export const FontWeights = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
  extrabold: '800' as const,
  black: '900' as const,
};

export const Shadows = {
  xs: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
  redGlow: {
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
} as const;

export const HitSlop = {
  sm: { top: 8, bottom: 8, left: 8, right: 8 },
  md: { top: 12, bottom: 12, left: 12, right: 12 },
  lg: { top: 16, bottom: 16, left: 16, right: 16 },
} as const;
