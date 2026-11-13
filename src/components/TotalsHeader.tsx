import { StyleSheet, View } from 'react-native';

import { AppText, Chip } from '@/components/ui';
import { formatPKR } from '@/lib/money';
import { radius, spacing, useTheme } from '@/theme';

/** Home hero: today's expense total, this month's, money in this month, offline chip. */
export function TotalsHeader({
  today,
  month,
  inflow,
  online,
  now,
}: {
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
        {!online && <Chip label="Offline — will sync" color={c.review} />}
      </View>
      <View style={[styles.card, { backgroundColor: c.primary }]}>
        <AppText variant="label" color={c.primaryText} style={styles.dim}>
          SPENT TODAY
        </AppText>
        <AppText
          variant="hero"
          color={c.primaryText}
          accessibilityLabel={`Spent today ${formatPKR(today)}`}>
          {formatPKR(today)}
        </AppText>
        <View style={styles.row}>
          <Stat label="This month" value={formatPKR(month)} color={c.primaryText} />
          <Stat label="Money in" value={`+${formatPKR(inflow)}`} color={c.primaryText} />
        </View>
      </View>
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
  card: { borderRadius: radius.lg, padding: spacing.xl, gap: spacing.xs },
  row: { flexDirection: 'row', marginTop: spacing.md, gap: spacing.xl },
  stat: { gap: 2 },
  dim: { opacity: 0.85 },
});
