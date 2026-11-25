import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { AppText, Button } from '@/components/ui';
import { describeReason } from '@/features/commands/status';
import type { Command } from '@/features/commands/types';
import { radius, spacing, useTheme } from '@/theme';

interface Props {
  command: Command;
  online: boolean;
  /** Refreshes every minute (useNow), so the retry countdown stays current. */
  now: Date;
  onRetry: () => void;
  onFix: () => void;
  onDismiss: () => void;
}

/** A voice command without entries yet: pending (spinner), failed (red) or needs review (amber). */
export function CommandRow({ command, online, now, onRetry, onFix, onDismiss }: Props) {
  const c = useTheme();
  const pending = command.status === 'pending';
  const tone = command.status === 'failed' ? c.danger : c.review;
  // Offline comes first: a note made offline has 0 attempts but nothing is working on it yet.
  const label = pending
    ? !online
      ? 'Saved — will process when online'
      : command.attemptCount > 0 && command.nextRetryAt
        ? retryLabel(command.nextRetryAt.toMillis() - now.getTime())
        : 'Understanding…'
    : command.status === 'failed'
      ? `Couldn't process. ${describeReason(command.statusReason)}`
      : `Check this: ${command.statusReason ? describeReason(command.statusReason) : 'needs review'}`;

  return (
    <View
      style={[
        styles.row,
        { backgroundColor: c.surface, borderLeftColor: pending ? c.border : tone },
      ]}
      accessibilityLabel={`Voice note: ${command.transcript}. ${label}`}>
      <View style={styles.top}>
        {pending && online && <ActivityIndicator size="small" color={c.textMuted} />}
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

/** Backing off after a transient failure while online (e.g. rate limit), not waiting for a network. */
function retryLabel(ms: number): string {
  const min = Math.ceil(ms / 60_000);
  return min <= 1 ? 'Retrying in a moment' : `Retrying in ${min} min`;
}

const styles = StyleSheet.create({
  row: { padding: spacing.lg, gap: spacing.sm, borderRadius: radius.md, borderLeftWidth: 4 },
  top: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  transcript: { flex: 1, fontStyle: 'italic' },
  actions: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  action: { paddingHorizontal: spacing.md },
});
