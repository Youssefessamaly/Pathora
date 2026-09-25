/**
 * Pathora frozen design system v1.1.
 * Source of truth for colors, radii, spacing, and typography used across the Pathora UI.
 */

export const PathoraColors = {
  ink900: '#16213A',
  ink700: '#2C3A54',
  teal700: '#0D4A43',
  teal600: '#116259',
  teal500: '#147D6F',
  teal400: '#3B9A8C',
  teal100: '#E4F3F0',
  amber600: '#C6821F',
  amber500: '#E8A33D',
  amber100: '#FCEEDA',
  paper: '#FAF8F4',
  surface: '#FFFFFF',
  border: '#E6E2D8',
  borderStrong: '#D6D1C3',
  textSecondary: '#5B6472',
  textTertiary: '#8D93A0',
  success: '#2E9E6D',
  warning: '#B4530A',
  error: '#C1443A',
  info: '#3672A8',
} as const;

export type PathoraColor = keyof typeof PathoraColors;

export const PathoraRadius = {
  8: 8,
  12: 12,
  14: 14,
  20: 20,
  999: 999,
} as const;

export const PathoraSpacing = {
  4: 4,
  8: 8,
  12: 12,
  16: 16,
  20: 20,
  24: 24,
  32: 32,
  40: 40,
  48: 48,
  64: 64,
} as const;

export const PathoraGradients = {
  logoMark: [PathoraColors.teal500, PathoraColors.teal700] as const,
  hero: [PathoraColors.teal600, PathoraColors.teal700, PathoraColors.ink900] as const,
};

export const PathoraFonts = {
  en: {
    regular: 'PlusJakartaSans_400Regular',
    medium: 'PlusJakartaSans_500Medium',
    semiBold: 'PlusJakartaSans_600SemiBold',
    bold: 'PlusJakartaSans_700Bold',
    extraBold: 'PlusJakartaSans_800ExtraBold',
  },
  ar: {
    regular: 'Cairo_400Regular',
    medium: 'Cairo_500Medium',
    semiBold: 'Cairo_600SemiBold',
    bold: 'Cairo_700Bold',
    extraBold: 'Cairo_800ExtraBold',
  },
} as const;
