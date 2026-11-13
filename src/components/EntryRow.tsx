import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, Chip } from '@/components/ui';
import type { Entry } from '@/features/entries/types';
import { formatPKR } from '@/lib/money';
import { formatTime } from '@/lib/time';
import { MIN_TOUCH, radius, spacing, useTheme } from '@/theme';

export function EntryRow({ entry, onPress }: { entry: Entry; onPress: () => void }) {
  const c = useTheme();
  const inflow = entry.direction === 'inflow';
  const amount = `${inflow ? '+' : ''}${formatPKR(entry.amount)}`;
  const title = entry.description ?? entry.category ?? entry.type;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={[
        title,
        inflow ? 'received' : 'paid',
        formatPKR(entry.amount),
        entry.type !== 'expense' ? entry.type : null,
        entry.source ? `from ${entry.source}` : null,
        entry.needsReview ? 'needs review' : null,
      ]
        .filter(Boolean)
        .join(', ')}
      accessibilityHint="Opens edit"
      style={({ pressed }) => [styles.row, { backgroundColor: pressed ? c.surfaceAlt : c.surface }]}>
      <View style={styles.main}>
        <View style={styles.titleLine}>
          {entry.needsReview && <View style={[styles.dot, { backgroundColor: c.review }]} />}
          <AppText variant="bodyStrong" numberOfLines={1} style={styles.title}>
            {title}
          </AppText>
        </View>
        <View style={styles.meta}>
          {entry.type !== 'expense' && <Chip label={entry.type} />}
          {entry.source && <Chip label={entry.source} />}
          <AppText variant="small" muted>
            {formatTime(entry.spentAt.toDate())}
          </AppText>
        </View>
      </View>
      <AppText variant="bodyStrong" color={inflow ? c.inflow : c.text}>
        {amount}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: MIN_TOUCH + 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
  },
  main: { flex: 1, gap: spacing.xs },
  titleLine: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  title: { flexShrink: 1 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
});
