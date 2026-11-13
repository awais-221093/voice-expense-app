import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui';
import { addMonths, formatMonth, startOfMonth } from '@/lib/time';
import { MIN_TOUCH, spacing, useTheme } from '@/theme';

/** ‹ November 2026 › — can't go past the current month. */
export function MonthSwitcher({ month, onChange }: { month: Date; onChange: (d: Date) => void }) {
  const c = useTheme();
  const isCurrent = month.getTime() >= startOfMonth().getTime();
  const arrow = (dir: -1 | 1, disabled = false) => (
    <Pressable
      onPress={() => onChange(addMonths(month, dir))}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={dir < 0 ? 'Previous month' : 'Next month'}
      style={[styles.arrow, disabled && styles.disabled]}>
      <MaterialCommunityIcons
        name={dir < 0 ? 'chevron-left' : 'chevron-right'}
        size={28}
        color={c.text}
      />
    </Pressable>
  );
  return (
    <View style={styles.row}>
      {arrow(-1)}
      <AppText variant="bodyStrong" style={styles.label} accessibilityRole="header">
        {formatMonth(month)}
      </AppText>
      {arrow(1, isCurrent)}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  label: { flex: 1, textAlign: 'center' },
  arrow: { width: MIN_TOUCH, height: MIN_TOUCH, alignItems: 'center', justifyContent: 'center' },
  disabled: { opacity: 0.3 },
});
