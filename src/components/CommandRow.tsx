import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { AppText, Button } from '@/components/ui';
import type { Command } from '@/features/commands/types';
import { radius, spacing, useTheme } from '@/theme';

interface Props {
  command: Command;
  onRetry: () => void;
  onFix: () => void;
  onDismiss: () => void;
}

/** A voice command without entries yet: pending (spinner), failed (red) or needs review (amber). */
export function CommandRow({ command, onRetry, onFix, onDismiss }: Props) {
  const c = useTheme();
  const pending = command.status === 'pending';
  const tone = command.status === 'failed' ? c.danger : c.review;
  const label = pending
    ? command.attemptCount > 0
      ? 'Saved — will process when online'
      : 'Understanding…'
    : command.status === 'failed'
      ? `Couldn't process: ${command.statusReason ?? 'unknown error'}`
      : `Check this: ${command.statusReason ?? 'needs review'}`;

  return (
    <View
      style={[
        styles.row,
        { backgroundColor: c.surface, borderLeftColor: pending ? c.border : tone },
      ]}
      accessibilityLabel={`Voice note: ${command.transcript}. ${label}`}>
      <View style={styles.top}>
        {pending && <ActivityIndicator size="small" color={c.textMuted} />}
        <AppText style={styles.transcript} numberOfLines={3}>
          “{command.transcript}”
        </AppText>
      </View>
      <AppText variant="small" color={pending ? c.textMuted : tone}>
        {label}
      </AppText>
      {!pending && (
        <View style={styles.actions}>
          <Button title="Retry" kind="secondary" onPress={onRetry} style={styles.action} />
          <Button title="Fix manually" kind="secondary" onPress={onFix} style={styles.action} />
          <Button title="Dismiss" kind="ghost" onPress={onDismiss} style={styles.action} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { padding: spacing.lg, gap: spacing.sm, borderRadius: radius.md, borderLeftWidth: 4 },
  top: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  transcript: { flex: 1, fontStyle: 'italic' },
  actions: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  action: { paddingHorizontal: spacing.md },
});
