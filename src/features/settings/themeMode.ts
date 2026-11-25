// Light / Dark / Device theme (DECISIONS #30). Stored on this phone (SecureStore), not in Firestore:
// it must apply before sign-in, and the Firestore contract stays unchanged.
// Appearance.setColorScheme makes useColorScheme() follow the choice, so useTheme(), the navigation
// theme and native alerts all switch with no other code changes.
import * as SecureStore from 'expo-secure-store';
import { Appearance } from 'react-native';
import { create } from 'zustand';

import { log } from '@/lib/debugLog';

export type ThemeMode = 'light' | 'dark' | 'system';

const KEY = 'theme_mode';

export const useThemeMode = create<{ mode: ThemeMode; loaded: boolean }>()(() => ({
  mode: 'system',
  loaded: false,
}));

/** 'unspecified' clears the override, so the app follows the phone again. */
const apply = (mode: ThemeMode) =>
  Appearance.setColorScheme(mode === 'system' ? 'unspecified' : mode);

/** Call once at start-up, while the splash is still up, so the wrong theme never flashes. */
export async function loadThemeMode() {
  try {
    const saved = await SecureStore.getItemAsync(KEY);
    const mode: ThemeMode = saved === 'light' || saved === 'dark' ? saved : 'system';
    apply(mode);
    useThemeMode.setState({ mode, loaded: true });
  } catch (e) {
    log.error('load theme failed', e);
    useThemeMode.setState({ loaded: true });
  }
}

export function setThemeMode(mode: ThemeMode) {
  apply(mode);
  useThemeMode.setState({ mode });
  SecureStore.setItemAsync(KEY, mode).catch((e) => log.error('save theme failed', e));
}
