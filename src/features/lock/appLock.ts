// App lock (IDEAS I7): fingerprint / face / device PIN via expo-local-authentication.
// The on/off flag is device-local (SecureStore): a lock protects this phone, not the account.
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { Alert } from 'react-native';
import { create } from 'zustand';

import { log } from '@/lib/debugLog';

const KEY = 'app_lock_enabled';
/** Coming back within this long doesn't re-lock (switching apps to copy an amount, etc.). */
export const LOCK_AFTER_MS = 30_000;

interface LockState {
  loaded: boolean;
  enabled: boolean;
  locked: boolean;
  /** Why the last unlock failed (shown under the Unlock button); null after a cancel or success. */
  message: string | null;
}

export const useAppLock = create<LockState>()(() => ({
  loaded: false,
  enabled: false,
  locked: false,
  message: null,
}));

/** Cold start: locked straight away when the lock is on, so content never flashes. */
export async function loadAppLock() {
  try {
    const enabled = (await SecureStore.getItemAsync(KEY)) === '1';
    useAppLock.setState({ loaded: true, enabled, locked: enabled });
  } catch (e) {
    log.error('load app lock failed', e);
    useAppLock.setState({ loaded: true });
  }
}

export function lockNow() {
  if (useAppLock.getState().enabled) useAppLock.setState({ locked: true });
}

/** Shows the system prompt (biometric, or the device PIN/pattern as fallback). Null = success. */
async function authenticate(promptMessage: string): Promise<string | null> {
  try {
    const r = await LocalAuthentication.authenticateAsync({ promptMessage, cancelLabel: 'Cancel' });
    return r.success ? null : r.error;
  } catch (e) {
    log.error('authenticate failed', e);
    return 'unknown';
  }
}

export async function unlock() {
  useAppLock.setState({ message: null });
  // The phone's screen lock was removed after the app lock was turned on: no check can ever
  // pass, so staying locked would shut the user out of their own data for good.
  const level = await LocalAuthentication.getEnrolledLevelAsync().catch(() => null);
  if (level === LocalAuthentication.SecurityLevel.NONE) {
    useAppLock.setState({ enabled: false, locked: false });
    await SecureStore.setItemAsync(KEY, '0').catch((e) => log.error('save app lock failed', e));
    Alert.alert(
      'App lock turned off',
      'This phone no longer has a screen lock. Set one in Android Settings, then turn the app lock on again in Profile.',
    );
    return;
  }
  const error = await authenticate('Unlock Voice Expense');
  if (!error) return useAppLock.setState({ locked: false });
  // Cancelling is a choice, not a failure: no message.
  if (error === 'user_cancel' || error === 'system_cancel' || error === 'app_cancel') return;
  log.warn('unlock failed', { error });
  useAppLock.setState({
    message:
      error === 'lockout'
        ? 'Too many attempts. Wait a little, then tap Unlock.'
        : "Couldn't check your fingerprint or screen lock. Tap Unlock to try again.",
  });
}

export type EnableResult = 'ok' | 'no-lock-set' | 'cancelled';

/**
 * Turning the lock on needs a device lock to exist and one successful check, so it can't lock you
 * out; turning it off needs a check as well.
 */
export async function setAppLockEnabled(on: boolean): Promise<EnableResult> {
  if (on) {
    const level = await LocalAuthentication.getEnrolledLevelAsync().catch(
      () => LocalAuthentication.SecurityLevel.NONE,
    );
    if (level === LocalAuthentication.SecurityLevel.NONE) return 'no-lock-set';
  }
  // Turning it off asks too, so someone holding an unlocked phone can't quietly disable it.
  if (await authenticate(`Confirm to turn ${on ? 'on' : 'off'} the app lock`)) return 'cancelled';
  useAppLock.setState({ enabled: on, locked: false });
  await SecureStore.setItemAsync(KEY, on ? '1' : '0').catch((e) =>
    log.error('save app lock failed', e),
  );
  return 'ok';
}
