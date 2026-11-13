import { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';

import { AppText } from '@/components/ui';
import { MIN_TOUCH, radius, spacing, useTheme } from '@/theme';

export interface ToastData {
  /** Changes for every new toast so the timer restarts. */
  key: string;
  title: string;
  lines?: string[];
  tone?: 'success' | 'review' | 'info';
  action?: { label: string; onPress: () => void };
  durationMs?: number;
}

/** Result card and Undo snackbar in one: auto-dismisses, never blocks (plan §6.2). */
export function Toast({ toast, onHide }: { toast: ToastData | null; onHide: () => void }) {
  const c = useTheme();
  const hide = useRef(onHide);
  useEffect(() => {
    hide.current = onHide;
  });

  // Toast objects may be rebuilt every render (derived result card), so the timer restarts
  // only when the toast's identity or state (title) changes.
  const key = toast ? `${toast.key}:${toast.title}` : null;
  const durationMs = toast?.durationMs ?? 5000;
  useEffect(() => {
    if (!key) return;
    const t = setTimeout(() => hide.current(), durationMs);
    return () => clearTimeout(t);
  }, [key, durationMs]);

  if (!toast) return null;
  const accent =
    toast.tone === 'review' ? c.review : toast.tone === 'success' ? c.inflow : c.textMuted;

  return (
    <Animated.View
      key={toast.key}
      entering={FadeInDown.duration(200)}
      exiting={FadeOutDown.duration(150)}
      style={[
        styles.card,
        { backgroundColor: c.surface, borderColor: c.border, borderLeftColor: accent },
      ]}
      accessibilityLiveRegion="polite">
      <View style={styles.body}>
        <AppText variant="bodyStrong">{toast.title}</AppText>
        {toast.lines?.map((l, i) => (
          <AppText key={i} variant="small" muted numberOfLines={2}>
            {l}
          </AppText>
        ))}
      </View>
      {toast.action && (
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            toast.action!.onPress();
            onHide();
          }}
          style={styles.action}>
          <AppText variant="bodyStrong" color={c.primary}>
            {toast.action.label}
          </AppText>
        </Pressable>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: spacing.lg,
    padding: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderLeftWidth: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    elevation: 4,
  },
  body: { flex: 1, gap: spacing.xs },
  action: {
    minHeight: MIN_TOUCH,
    minWidth: MIN_TOUCH,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
});
