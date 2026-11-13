import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, Chip } from '@/components/ui';
import { formatPKR } from '@/lib/money';
import { MIN_TOUCH, spacing, useTheme } from '@/theme';

/** Today's expense total (large), this month below, offline chip and the settings gear. */
export function TotalsHeader({
  today,
  month,
  online,
}: {
  today: number;
  month: number;
  online: boolean;
}) {
  const c = useTheme();
  return (
    <View style={styles.wrap}>
      <View style={styles.top}>
        <AppText variant="label" muted>
          SPENT TODAY
        </AppText>
        <View style={styles.right}>
          {!online && <Chip label="Offline — will sync" color={c.review} />}
          <Pressable
            onPress={() => router.push('/settings')}
            // Hidden debug screen (plan §9).
            onLongPress={() => router.push('/debug')}
            accessibilityRole="button"
            accessibilityLabel="Settings"
            hitSlop={8}
            style={styles.gear}>
            <MaterialCommunityIcons name="cog-outline" size={24} color={c.textMuted} />
          </Pressable>
        </View>
      </View>
      <AppText variant="hero" accessibilityLabel={`Spent today ${formatPKR(today)}`}>
        {formatPKR(today)}
      </AppText>
      <AppText muted>This month {formatPKR(month)}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    gap: spacing.xs,
  },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  right: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  gear: {
    minWidth: MIN_TOUCH,
    minHeight: MIN_TOUCH,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
