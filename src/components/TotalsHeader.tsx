import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, Chip } from '@/components/ui';
import { formatPKR } from '@/lib/money';
import { MIN_TOUCH, radius, spacing, useTheme } from '@/theme';

/** Home hero: today's expense total, this month's, money in this month, offline chip. */
export function TotalsHeader({
  today,
  month,
  inflow,
  online,
  now,
  onTypeNote,
  budget,
}: {
  /** Monthly expense budget, or null for none. */
  budget: number | null;
  onTypeNote: () => void;
  now: Date;
  today: number;
  month: number;
  inflow: number;
  online: boolean;
}) {
  const c = useTheme();
  const date = now.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  return (
    <View style={styles.wrap}>
      <View style={styles.top}>
        <AppText muted>{date}</AppText>
        <View style={styles.topActions}>
          {!online && <Chip label="Offline — will sync" color={c.review} />}
          <Pressable
            onPress={onTypeNote}
            accessibilityRole="button"
            accessibilityLabel="Type a note instead of speaking"
            style={styles.iconButton}>
            <MaterialCommunityIcons name="keyboard-outline" size={24} color={c.textMuted} />
          </Pressable>
        </View>
      </View>
      <View style={[styles.card, { backgroundColor: c.primary }]}>
        <AppText variant="label" color={c.primaryText} style={styles.dim}>
          SPENT TODAY
        </AppText>
        <AppText
          variant="hero"
          color={c.primaryText}
          numberOfLines={1}
          adjustsFontSizeToFit
          accessibilityLabel={`Spent today ${formatPKR(today)}`}>
          {formatPKR(today)}
        </AppText>
        <View style={styles.row}>
          <Stat label="This month" value={formatPKR(month)} color={c.primaryText} />
          <Stat label="Money in" value={`+${formatPKR(inflow)}`} color={c.primaryText} />
        </View>
        {budget !== null && <BudgetBar spent={month} budget={budget} color={c.primaryText} />}
      </View>
    </View>
  );
}

/** Progress toward the monthly budget. The text says "left" or "over", so colour is never the only signal. */
function BudgetBar({ spent, budget, color }: { spent: number; budget: number; color: string }) {
  const left = budget - spent;
  const text =
    left >= 0
      ? `${formatPKR(left)} left of ${formatPKR(budget)}`
      : `⚠ ${formatPKR(-left)} over the ${formatPKR(budget)} budget`;
  return (
    <View style={styles.budget} accessible accessibilityLabel={`Budget: ${text}`}>
      <View style={styles.track}>
        <View style={[StyleSheet.absoluteFill, { backgroundColor: color, opacity: 0.25 }]} />
        <View
          style={[
            styles.fill,
            { backgroundColor: color, width: `${Math.min(spent / budget, 1) * 100}%` },
          ]}
        />
      </View>
      <AppText variant="small" color={color} style={styles.dim}>
        {text}
      </AppText>
    </View>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={styles.stat}>
      <AppText variant="small" color={color} style={styles.dim}>
        {label}
      </AppText>
      <AppText variant="bodyStrong" color={color}>
        {value}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.md, paddingTop: spacing.md },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 32,
  },
  topActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  iconButton: {
    width: MIN_TOUCH,
    height: MIN_TOUCH,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: { borderRadius: radius.lg, padding: spacing.xl, gap: spacing.xs },
  row: { flexDirection: 'row', marginTop: spacing.md, gap: spacing.xl },
  stat: { gap: 2 },
  dim: { opacity: 0.85 },
  budget: { gap: spacing.xs, marginTop: spacing.md },
  track: { height: 8, borderRadius: 4, overflow: 'hidden' },
  fill: { height: 8, borderRadius: 4 },
});
