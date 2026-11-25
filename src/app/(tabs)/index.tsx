import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CommandRow } from '@/components/CommandRow';
import { SkeletonRows } from '@/components/SkeletonRows';
import { EntryList } from '@/components/EntryList';
import { TotalsHeader } from '@/components/TotalsHeader';
import { AppText, Button } from '@/components/ui';
import { useOpenCommands } from '@/features/commands/hooks';
import { dismissCommand, requeueCommand } from '@/features/commands/repo';
import { expenseTotals, useMonthEntries, useRecentEntries } from '@/features/entries/hooks';
import { useAppLock } from '@/features/lock/appLock';
import { useRecorder } from '@/features/recording/RecorderProvider';
import { useNoUsableKey, useSettings } from '@/features/settings/store';
import { auth } from '@/lib/firebase';
import { useIsOnline } from '@/lib/network';
import { startOfMonth } from '@/lib/time';
import { useNow } from '@/lib/useNow';
import { MIN_TOUCH, radius, spacing, useTheme } from '@/theme';

const RECENT = 30;
/** More failed notes than this would push the entry list off screen; the rest sit behind a toggle. */
const ATTENTION_PREVIEW = 3;

export default function HomeScreen() {
  const uid = auth.currentUser?.uid;
  return uid ? <Home uid={uid} /> : null;
}

/** Today at a glance: totals, anything that needs attention, then the latest entries. */
function Home({ uid }: { uid: string }) {
  const c = useTheme();
  const online = useIsOnline();
  const now = useNow();
  const { openSheet, mode, typeNote, startHandsFree } = useRecorder();

  // Launcher shortcut → /record → here with ?record=1. Never listen behind the app lock.
  // Speech setup → "Type a note instead" → here with ?type=1.
  const { record, type } = useLocalSearchParams<{ record?: string; type?: string }>();
  const locked = useAppLock((s) => s.locked || !s.loaded);
  useEffect(() => {
    if (record !== '1' || locked) return;
    router.setParams({ record: undefined });
    startHandsFree();
  }, [record, locked, startHandsFree]);
  useEffect(() => {
    if (type !== '1' || locked) return;
    router.setParams({ type: undefined });
    typeNote();
  }, [type, locked, typeNote]);
  const noKey = useNoUsableKey();
  const budget = useSettings((s) => s.settings.monthlyBudget);
  const [showAllOpen, setShowAllOpen] = useState(false);

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
        onTypeNote={typeNote}
        budget={budget}
      />
      {noKey && (
        // Without a key every note fails; say so before the first one is spoken.
        <Pressable
          onPress={() => router.navigate('/profile')}
          accessibilityRole="button"
          accessibilityHint="Opens Profile"
          style={[styles.banner, { backgroundColor: c.surface, borderColor: c.review }]}>
          <MaterialCommunityIcons name="key-alert-outline" size={24} color={c.review} />
          <AppText style={styles.flex}>
            Add an API key in Profile so notes can be understood.
          </AppText>
          <MaterialCommunityIcons name="chevron-right" size={24} color={c.textMuted} />
        </Pressable>
      )}
      {open.data.length > 0 && (
        <View style={styles.attention}>
          <AppText variant="label" muted>
            NEEDS ATTENTION
          </AppText>
          {(showAllOpen ? open.data : open.data.slice(0, ATTENTION_PREVIEW)).map((cmd) => (
            <CommandRow
              key={cmd.id}
              command={cmd}
              online={online}
              now={now}
              onRetry={() => requeueCommand(uid, cmd.id)}
              onFix={() => openSheet({ kind: 'manual', command: cmd })}
              onDismiss={() => dismissCommand(uid, cmd.id)}
            />
          ))}
          {open.data.length > ATTENTION_PREVIEW && (
            <Button
              title={
                showAllOpen ? 'Show less' : `Show ${open.data.length - ATTENTION_PREVIEW} more`
              }
              kind="ghost"
              onPress={() => setShowAllOpen((v) => !v)}
            />
          )}
        </View>
      )}
    </View>
  );

  const empty = recent.loading ? (
    <SkeletonRows />
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
  banner: {
    minHeight: MIN_TOUCH,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  flex: { flex: 1 },
  empty: { alignItems: 'center', padding: spacing.xxl },
  hint: { textAlign: 'center', lineHeight: 24 },
});
