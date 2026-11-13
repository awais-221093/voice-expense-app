import { router } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CommandRow } from '@/components/CommandRow';
import { EntryList } from '@/components/EntryList';
import { TotalsHeader } from '@/components/TotalsHeader';
import { AppText, Button } from '@/components/ui';
import { useOpenCommands } from '@/features/commands/hooks';
import { dismissCommand, requeueCommand } from '@/features/commands/repo';
import { expenseTotals, useMonthEntries, useRecentEntries } from '@/features/entries/hooks';
import { useRecorder } from '@/features/recording/RecorderProvider';
import { auth } from '@/lib/firebase';
import { useIsOnline } from '@/lib/network';
import { startOfMonth } from '@/lib/time';
import { useNow } from '@/lib/useNow';
import { spacing, useTheme } from '@/theme';

const RECENT = 30;

export default function HomeScreen() {
  const uid = auth.currentUser?.uid;
  return uid ? <Home uid={uid} /> : null;
}

/** Today at a glance: totals, anything that needs attention, then the latest entries. */
function Home({ uid }: { uid: string }) {
  const c = useTheme();
  const online = useIsOnline();
  const now = useNow();
  const { openSheet, mode } = useRecorder();

  const month = useMonthEntries(uid, startOfMonth(now));
  const recent = useRecentEntries(uid, RECENT);
  const open = useOpenCommands(uid);
  const totals = expenseTotals(month.data, now);
  const inflow = month.data.reduce(
    (sum, e) => (e.direction === 'inflow' && e.amount ? sum + e.amount : sum),
    0,
  );

  const header = (
    <View style={styles.header}>
      <TotalsHeader
        now={now}
        today={totals.today}
        month={totals.month}
        inflow={inflow}
        online={online}
      />
      {open.data.length > 0 && (
        <View style={styles.attention}>
          <AppText variant="label" muted>
            NEEDS ATTENTION
          </AppText>
          {open.data.map((cmd) => (
            <CommandRow
              key={cmd.id}
              command={cmd}
              onRetry={() => requeueCommand(uid, cmd.id)}
              onFix={() => openSheet({ kind: 'manual', command: cmd })}
              onDismiss={() => dismissCommand(uid, cmd.id)}
            />
          ))}
        </View>
      )}
    </View>
  );

  const empty = recent.loading ? (
    <ActivityIndicator style={styles.empty} color={c.textMuted} />
  ) : (
    <View style={styles.empty}>
      {recent.error ? (
        <AppText color={c.danger}>Could not load entries: {recent.error}</AppText>
      ) : (
        <AppText muted style={styles.hint}>
          {mode === 'hold' ? 'Hold' : 'Tap'} the mic below and say:{'\n'}
          “add 100 rupees for eggs from salary”
        </AppText>
      )}
    </View>
  );

  const footer =
    recent.data.length >= RECENT ? (
      <Button
        title="See all in Activity"
        kind="ghost"
        onPress={() => router.navigate('/activity')}
      />
    ) : undefined;

  return (
    <SafeAreaView edges={['top']} style={[styles.root, { backgroundColor: c.background }]}>
      <EntryList entries={recent.data} header={header} footer={footer} empty={empty} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { gap: spacing.lg },
  attention: { gap: spacing.sm },
  empty: { alignItems: 'center', padding: spacing.xxl },
  hint: { textAlign: 'center', lineHeight: 24 },
});
