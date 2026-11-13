import { useColorScheme } from 'react-native';

const light = {
  background: '#F7F8F7',
  surface: '#FFFFFF',
  surfaceAlt: '#EEF1F0',
  border: '#DCE1DF',
  text: '#101413',
  textMuted: '#5B6663',
  primary: '#0F766E',
  primaryText: '#FFFFFF',
  inflow: '#15803D',
  review: '#B45309',
  danger: '#B91C1C',
  overlay: 'rgba(0,0,0,0.35)',
};

const dark: typeof light = {
  background: '#0B0F0E',
  surface: '#151B1A',
  surfaceAlt: '#1E2625',
  border: '#2A3432',
  text: '#ECF1EF',
  textMuted: '#9AA6A3',
  primary: '#2DD4BF',
  primaryText: '#04201D',
  inflow: '#4ADE80',
  review: '#FBBF24',
  danger: '#F87171',
  overlay: 'rgba(0,0,0,0.6)',
};

export type Colors = typeof light;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const radius = { sm: 8, md: 12, lg: 20, pill: 999 } as const;
/** Minimum touch target (dp), per the accessibility spec. */
export const MIN_TOUCH = 48;
/** Bottom tab bar height above the safe-area inset (overlays sit above it). */
export const TAB_BAR_HEIGHT = 68;

export const type = {
  hero: { fontSize: 40, fontWeight: '700' as const, letterSpacing: -0.5 },
  title: { fontSize: 22, fontWeight: '700' as const },
  body: { fontSize: 16, fontWeight: '400' as const },
  bodyStrong: { fontSize: 16, fontWeight: '600' as const },
  small: { fontSize: 13, fontWeight: '400' as const },
  label: { fontSize: 13, fontWeight: '600' as const, letterSpacing: 0.3 },
};

export function useTheme(): Colors {
  return useColorScheme() === 'dark' ? dark : light;
}
