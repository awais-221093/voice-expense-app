import { StyleSheet, View } from 'react-native';

import { MIN_TOUCH, radius, spacing, useTheme } from '@/theme';

/**
 * Grey placeholders shaped like EntryRow while the first snapshot loads (plan §6.6).
 * Static on purpose: no shimmer, so reduced-motion needs no special case.
 */
export function SkeletonRows({ count = 4 }: { count?: number }) {
  const c = useTheme();
  const bar = { backgroundColor: c.surfaceAlt };
  return (
    <View style={styles.wrap} accessible accessibilityLabel="Loading entries">
      {Array.from({ length: count }, (_, i) => (
        <View key={i} style={[styles.row, { backgroundColor: c.surface }]}>
          <View style={styles.main}>
            <View style={[styles.line, styles.title, bar]} />
            <View style={[styles.line, styles.meta, bar]} />
          </View>
          <View style={[styles.line, styles.amount, bar]} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm, marginTop: spacing.xl },
  row: {
    minHeight: MIN_TOUCH + 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
  },
  main: { flex: 1, gap: spacing.sm },
  line: { height: 12, borderRadius: radius.sm },
  title: { width: '55%' },
  meta: { width: '30%' },
  amount: { width: 64 },
});
