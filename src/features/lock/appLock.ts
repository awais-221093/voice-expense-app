// App lock (IDEAS I7): fingerprint / face / device PIN via expo-local-authentication.
// The on/off flag is device-local (SecureStore): a lock protects this phone, not the account.
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';

import { log } from '@/lib/debugLog';

const KEY = 'app_lock_enabled';
/** Coming back within this long doesn't re-lock (switching apps to copy an amount, etc.). */
export const LOCK_AFTER_MS = 30_000;

interface LockState {
  loaded: boolean;
  enabled: boolean;
  locked: boolean;
}

export const useAppLock = create<LockState>()(() => ({
  loaded: false,
  enabled: false,
  locked: false,
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

/** Shows the system prompt (biometric, or the device PIN/pattern as fallback). */
async function authenticate(promptMessage: string): Promise<boolean> {
  try {
    const r = await LocalAuthentication.authenticateAsync({ promptMessage, cancelLabel: 'Cancel' });
    return r.success;
  } catch (e) {
    log.error('authenticate failed', e);
    return false;
  }
}

export async function unlock() {
  if (await authenticate('Unlock Voice Expense')) useAppLock.setState({ locked: false });
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
  if (!(await authenticate(`Confirm to turn ${on ? 'on' : 'off'} the app lock`)))
    return 'cancelled';
  useAppLock.setState({ enabled: on, locked: false });
  await SecureStore.setItemAsync(KEY, on ? '1' : '0').catch((e) =>
    log.error('save app lock failed', e),
  );
  return 'ok';
}
