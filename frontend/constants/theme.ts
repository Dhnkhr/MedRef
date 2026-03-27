/**
 * MedRef Design System — Minimalist & Simple
 * Neutral color palette with essential semantic colors.
 */

import { Platform } from 'react-native';

// ─── Color Palette ───────────────────────────────────────────────────────────

const palette = {
  // Primary — Neutral Gray + Simple Blue
  blue500: '#1A8AD4',
  blue600: '#1572B0',
  blue700: '#105A8C',

  // Emergency — Red (essential for medical)
  red500: '#EF4444',
  red600: '#DC2626',
  red700: '#B91C1C',

  // Warning — Muted
  amber500: '#F59E0B',
  amber600: '#D97706',

  // Neutrals (primary palette)
  white: '#FFFFFF',
  gray50: '#FAFAFA',
  gray100: '#F3F3F3',
  gray200: '#E5E5E5',
  gray300: '#D4D4D4',
  gray400: '#A3A3A3',
  gray500: '#737373',
  gray600: '#525252',
  gray700: '#404040',
  gray800: '#262626',
  gray900: '#171717',
  black: '#000000',
};

export const Colors = {
  light: {
    // Core
    text: palette.gray900,
    textSecondary: palette.gray500,
    textTertiary: palette.gray400,
    background: palette.white,
    surface: palette.white,
    surfaceElevated: palette.gray50,
    border: palette.gray200,
    borderLight: palette.gray100,

    // Brand
    tint: palette.blue500,
    primary: palette.blue500,
    primaryLight: '#F0F9FF',
    primaryDark: palette.blue700,
    accent: palette.blue500,
    accentLight: '#F0F9FF',

    // Semantic
    emergency: palette.red500,
    emergencyLight: '#FEF2F2',
    emergencyDark: palette.red700,
    warning: palette.amber500,
    warningLight: '#FFFBEB',
    success: palette.gray500,
    successLight: palette.gray100,

    // Tab bar
    icon: palette.gray400,
    tabIconDefault: palette.gray400,
    tabIconSelected: palette.blue500,
    tabBar: palette.white,
    tabBarBorder: palette.gray200,

    // Cards
    cardBackground: palette.white,
    cardBorder: palette.gray100,
    cardShadow: 'rgba(0, 0, 0, 0.05)',

    // Bed availability
    bedAvailable: palette.gray600,
    bedLimited: palette.amber500,
    bedCritical: palette.red500,
    bedNone: palette.gray300,

    // Gradients
    gradientPrimary: [palette.blue500, palette.blue600],
    gradientEmergency: [palette.red500, palette.red700],
    gradientAccent: [palette.blue500, palette.blue600],
    gradientHeader: [palette.white, palette.gray50],
  },
  dark: {
    // Core
    text: palette.gray50,
    textSecondary: palette.gray400,
    textTertiary: palette.gray500,
    background: palette.black,
    surface: '#1A1A1A',
    surfaceElevated: '#242424',
    border: palette.gray800,
    borderLight: palette.gray700,

    // Brand
    tint: palette.blue500,
    primary: palette.blue500,
    primaryLight: 'rgba(26, 138, 212, 0.1)',
    primaryDark: palette.blue600,
    accent: palette.blue500,
    accentLight: 'rgba(26, 138, 212, 0.1)',

    // Semantic
    emergency: palette.red500,
    emergencyLight: 'rgba(239, 68, 68, 0.1)',
    emergencyDark: palette.red600,
    warning: palette.amber500,
    warningLight: 'rgba(245, 158, 11, 0.1)',
    success: palette.gray400,
    successLight: palette.gray800,

    // Tab bar
    icon: palette.gray500,
    tabIconDefault: palette.gray500,
    tabIconSelected: palette.blue500,
    tabBar: '#1A1A1A',
    tabBarBorder: palette.gray800,

    // Cards
    cardBackground: '#1A1A1A',
    cardBorder: palette.gray800,
    cardShadow: 'rgba(0, 0, 0, 0.3)',

    // Bed availability
    bedAvailable: palette.gray400,
    bedLimited: palette.amber500,
    bedCritical: palette.red500,
    bedNone: palette.gray700,

    // Gradients
    gradientPrimary: [palette.blue600, palette.blue700],
    gradientEmergency: [palette.red600, palette.red700],
    gradientAccent: [palette.blue600, palette.blue700],
    gradientHeader: ['#0A0A0A', '#1A1A1A'],
  },
};

// ─── Typography ──────────────────────────────────────────────────────────────

export const Fonts = Platform.select({
  ios: {
    sans: 'System',
    serif: 'Georgia',
    mono: 'Menlo',
  },
  android: {
    sans: 'Roboto',
    serif: 'serif',
    mono: 'monospace',
  },
  default: {
    sans: 'System',
    serif: 'Georgia',
    mono: 'monospace',
  },
  web: {
    sans: "Inter, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, monospace",
  },
});

export const FontSizes = {
  xs: 11,
  sm: 13,
  base: 15,
  md: 17,
  lg: 20,
  xl: 24,
  '2xl': 30,
  '3xl': 36,
  '4xl': 48,
};

export const FontWeights = {
  normal: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
  extrabold: '800' as const,
};

// ─── Spacing ─────────────────────────────────────────────────────────────────

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  '2xl': 32,
  '3xl': 40,
  '4xl': 48,
  '5xl': 64,
};

// ─── Border Radius ───────────────────────────────────────────────────────────

export const Radius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 18,
  '2xl': 24,
  full: 9999,
};

// ─── Shadows ─────────────────────────────────────────────────────────────────

export const Shadows = {
  sm: {
    boxShadow: '0px 1px 2px rgba(0, 0, 0, 0.03)',
    elevation: 1,
  },
  md: {
    boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.05)',
    elevation: 2,
  },
  lg: {
    boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.08)',
    elevation: 4,
  },
  xl: {
    boxShadow: '0px 8px 16px rgba(0, 0, 0, 0.1)',
    elevation: 6,
  },
};

// ─── Icon Names (SF Symbols / Material) ──────────────────────────────────────

export const TabIcons = {
  home: 'house.fill',
  emergency: 'bolt.heart.fill',    // fallback: 'exclamationmark.triangle.fill'
  documents: 'doc.text.fill',
  beds: 'bed.double.fill',
  history: 'clock.fill',
  profile: 'person.fill',
} as const;
