import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';
import { AppState, Modal, StyleSheet, View } from 'react-native';

import { AppText, Button } from '@/components/ui';
import { LOCK_AFTER_MS, loadAppLock, lockNow, unlock, useAppLock } from '@/features/lock/appLock';
import { spacing, useTheme } from '@/theme';

/**
 * Covers the whole app (including open sheets) while locked. Re-locks after LOCK_AFTER_MS in the
 * background. Mount once while signed in.
 */
export function AppLockGate() {
  const c = useTheme();
  const { loaded, locked, message } = useAppLock();
  const leftAt = useRef<number | null>(null);

  useEffect(() => {
    void loadAppLock();
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'background') leftAt.current = Date.now();
      else if (s === 'active' && leftAt.current !== null) {
        if (Date.now() - leftAt.current >= LOCK_AFTER_MS) lockNow();
        leftAt.current = null;
      }
    });
    return () => sub.remove();
  }, []);

  // Prompt as soon as the lock appears, so unlocking is usually one touch.
  useEffect(() => {
    if (locked) void unlock();
  }, [locked]);

  // Until the flag is read, cover the app too: a locked app must never flash its content.
  const visible = !loaded || locked;
  return (
    <Modal visible={visible} animationType="none" statusBarTranslucent onRequestClose={() => {}}>
      <View style={[styles.root, { backgroundColor: c.background }]}>
        {loaded && (
          <>
            <MaterialCommunityIcons name="lock-outline" size={56} color={c.primary} />
            <AppText variant="title">Voice Expense is locked</AppText>
            {message && (
              <AppText color={c.review} accessibilityLiveRegion="polite">
                {message}
              </AppText>
            )}
            <Button title="Unlock" onPress={() => void unlock()} style={styles.button} />
          </>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
    padding: spacing.xl,
  },
  button: { alignSelf: 'stretch' },
});
