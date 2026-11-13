import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, SectionList, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CommandRow } from '@/components/CommandRow';
import { EditEntrySheet, type SheetTarget } from '@/components/EditEntrySheet';
import { EntryRow } from '@/components/EntryRow';
import { MicButton } from '@/components/MicButton';
import { Toast, type ToastData } from '@/components/Toast';
import { TotalsHeader } from '@/components/TotalsHeader';
import { AppText } from '@/components/ui';
import { useOpenCommands } from '@/features/commands/hooks';
import { useInFlight } from '@/features/commands/queue';
import { createCommand, createManualEntry, dismissCommand, requeueCommand } from '@/features/commands/repo';
import type { Command } from '@/features/commands/types';
import { expenseTotals, useMonthEntries, useRecentEntries } from '@/features/entries/hooks';
import { setEntriesDeleted, updateEntry } from '@/features/entries/repo';
import type { Entry } from '@/features/entries/types';
import { useSettings } from '@/features/settings/store';
import { checkSpeechReadiness, type SpeechReadiness } from '@/features/speech/readiness';
import { useVoiceRecorder } from '@/features/speech/useVoiceRecorder';
import { auth } from '@/lib/firebase';
import { haptics } from '@/lib/haptics';
import { formatPKR } from '@/lib/money';
import { useIsOnline } from '@/lib/network';
import { formatDayHeading, localISODate, startOfMonth } from '@/lib/time';
import { spacing, useTheme } from '@/theme';

/** After this long without a result, tell the user it's saved and will finish in the background. */
const UNDERSTANDING_TIMEOUT_MS = 12_000;

type Row = { kind: 'command'; command: Command } | { kind: 'entry'; entry: Entry };

export default function HomeScreen() {
  const c = useTheme();
  const uid = auth.currentUser!.uid; // the auth gate guarantees a user here
  const settings = useSettings((s) => s.settings);
  const online = useIsOnline();
  const inFlight = useInFlight((s) => s.ids);

  const recent = useRecentEntries(uid);
  const month = useMonthEntries(uid, startOfMonth());
  const open = useOpenCommands(uid);
  const totals = expenseTotals(month.data);

  const [toast, setToast] = useState<ToastData | null>(null);
  const [sheet, setSheet] = useState<SheetTarget | null>(null);
  /** The command just spoken; its outcome becomes the result card. */
  const [watching, setWatching] = useState<{ id: string; since: number } | null>(null);
  const hideToast = useCallback(() => setToast(null), []);

  // Speech readiness is checked up front so pressing the mic starts instantly.
  const [ready, setReady] = useState<SpeechReadiness | null>(null);
  useFocusEffect(
    useCallback(() => {
      checkSpeechReadiness(settings.sttLocale, settings.allowOnlineSttFallback).then(setReady);
    }, [settings.sttLocale, settings.allowOnlineSttFallback]),
  );

  const recorder = useVoiceRecorder({
    onFinal: (transcript, o) => {
      const id = createCommand(uid, transcript, {
        sttEngine: o.onDevice ? 'on-device' : 'online',
        locale: o.locale,
        recordingMode: o.mode,
      });
      setWatching({ id, since: Date.now() });
    },
    onEmpty: () => setToast({ key: `empty${Date.now()}`, title: "Didn't catch that, try again", tone: 'info', durationMs: 2500 }),
    onError: (kind, message) => {
      if (kind === 'permission' || kind === 'model-missing') {
        router.push({ pathname: '/speech-setup', params: { problem: kind, locale: settings.sttLocale } });
      } else {
        setToast({ key: `err${Date.now()}`, title: 'Speech recognition stopped', lines: [message], tone: 'review' });
      }
    },
  });

  function startRecording() {
    if (!ready?.ok) {
      router.push({
        pathname: '/speech-setup',
        params: { problem: ready?.ok === false ? ready.problem : 'permission', locale: settings.sttLocale },
      });
      return;
    }
    recorder.start({
      locale: ready.locale,
      onDevice: ready.onDevice,
      mode: settings.recordingMode,
      silenceTimeoutSec: settings.silenceTimeoutSec,
    });
  }

  // Turn the watched command's outcome into the result card (plan §6.2).
  useEffect(() => {
    if (!watching) return;
    const entries = recent.data.filter((e) => e.commandId === watching.id);
    const cmd = open.data.find((x) => x.id === watching.id);
    const processing = inFlight.includes(watching.id);
    const timedOut = Date.now() - watching.since > UNDERSTANDING_TIMEOUT_MS;

    let next: ToastData | null = null;
    if (entries.length) {
      const review = entries.some((e) => e.needsReview);
      next = {
        key: watching.id,
        title: review ? 'Saved — check later' : 'Saved',
        tone: review ? 'review' : 'success',
        lines: entries.map(describeEntry),
        action: { label: 'Undo', onPress: () => setEntriesDeleted(uid, entries.map((e) => e.id), true) },
      };
      if (review) haptics.warning();
      else haptics.success();
    } else if (cmd && !processing && (cmd.status !== 'pending' || cmd.attemptCount > 0 || !online || timedOut)) {
      next = {
        key: watching.id,
        title: cmd.status === 'pending' ? 'Saved — will process when online' : 'Saved — check later',
        tone: 'review',
        lines: [`“${cmd.transcript}”`],
      };
    } else if (!cmd && timedOut) {
      // Entries exist but fall outside the recent list (e.g. dated last month).
      next = { key: watching.id, title: 'Saved', tone: 'success' };
    }
    if (next) {
      setToast(next);
      setWatching(null);
    }
  }, [watching, recent.data, open.data, inFlight, online, uid]);

  // Re-evaluate the timeout even if nothing else changes.
  useEffect(() => {
    if (!watching) return;
    const t = setTimeout(() => setWatching((w) => (w ? { ...w } : w)), UNDERSTANDING_TIMEOUT_MS + 100);
    return () => clearTimeout(t);
  }, [watching]);

  const sections = useMemo(() => buildSections(open.data, recent.data), [open.data, recent.data]);
  const loading = recent.loading && !recent.data.length;

  function deleteEntry(entry: Entry) {
    setEntriesDeleted(uid, [entry.id], true);
    setToast({
      key: `del${entry.id}${Date.now()}`,
      title: 'Entry deleted',
      lines: [describeEntry(entry)],
      action: { label: 'Undo', onPress: () => setEntriesDeleted(uid, [entry.id], false) },
    });
  }

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: c.background }]}>
      <TotalsHeader today={totals.today} month={totals.month} online={online} />

      {loading ? (
        <ActivityIndicator style={styles.loading} color={c.textMuted} />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(r) => (r.kind === 'command' ? `c${r.command.id}` : `e${r.entry.id}`)}
          contentContainerStyle={styles.list}
          stickySectionHeadersEnabled={false}
          ItemSeparatorComponent={Separator}
          renderSectionHeader={({ section }) =>
            section.title ? (
              <AppText variant="label" muted style={styles.sectionHeader}>
                {section.title.toUpperCase()}
              </AppText>
            ) : null
          }
          renderItem={({ item }) =>
            item.kind === 'command' ? (
              <CommandRow
                command={item.command}
                onRetry={() => requeueCommand(uid, item.command.id)}
                onFix={() => setSheet({ kind: 'manual', command: item.command })}
                onDismiss={() => dismissCommand(uid, item.command.id)}
              />
            ) : (
              <EntryRow entry={item.entry} onPress={() => setSheet({ kind: 'edit', entry: item.entry })} />
            )
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              {recent.error ? (
                <AppText color={c.danger}>Could not load entries: {recent.error}</AppText>
              ) : (
                <AppText muted style={styles.emptyText}>
                  {settings.recordingMode === 'hold' ? 'Hold the mic' : 'Tap the mic'} and say:{'\n'}
                  “add 100 rupees for eggs from salary”
                </AppText>
              )}
            </View>
          }
        />
      )}

      <View style={styles.bottom}>
        {recorder.liveText ? (
          <AppText variant="bodyStrong" style={styles.live} numberOfLines={4} accessibilityLiveRegion="polite">
            {recorder.liveText}
          </AppText>
        ) : (
          <Toast toast={toast} onHide={hideToast} />
        )}
        <MicButton
          mode={settings.recordingMode}
          phase={recorder.phase}
          understanding={!!watching && inFlight.includes(watching.id)}
          onStart={startRecording}
          onRelease={recorder.release}
          onStop={recorder.stop}
        />
      </View>

      {sheet && (
        <EditEntrySheet
          key={sheet.kind === 'edit' ? sheet.entry.id : sheet.command.id}
          uid={uid}
          target={sheet}
          onClose={() => setSheet(null)}
          onSave={(fields) =>
            sheet.kind === 'edit' ? updateEntry(uid, sheet.entry.id, fields) : createManualEntry(uid, sheet.command, fields)
          }
          onDelete={sheet.kind === 'edit' ? () => deleteEntry(sheet.entry) : undefined}
        />
      )}
    </SafeAreaView>
  );
}

function describeEntry(e: Entry): string {
  return [formatPKR(e.amount), e.description, e.source && `from ${e.source}`, e.type !== 'expense' && e.type]
    .filter(Boolean)
    .join(' · ');
}

/** Open commands first (no header), then entries grouped by local day. */
function buildSections(open: Command[], entries: Entry[]) {
  const sections: { title: string | null; data: Row[] }[] = [];
  if (open.length) sections.push({ title: null, data: open.map((command) => ({ kind: 'command', command })) });
  let currentDay = '';
  for (const entry of entries) {
    const d = entry.spentAt.toDate();
    const day = localISODate(d);
    if (day !== currentDay) {
      currentDay = day;
      sections.push({ title: formatDayHeading(d), data: [] });
    }
    sections[sections.length - 1].data.push({ kind: 'entry', entry });
  }
  return sections;
}

const Separator = () => <View style={{ height: spacing.sm }} />;

const styles = StyleSheet.create({
  root: { flex: 1 },
  loading: { flex: 1 },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl, flexGrow: 1 },
  sectionHeader: { marginTop: spacing.lg, marginBottom: spacing.sm, marginLeft: spacing.xs },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xxl },
  emptyText: { textAlign: 'center', lineHeight: 24 },
  bottom: { paddingBottom: spacing.lg, gap: spacing.md },
  live: { marginHorizontal: spacing.xl, textAlign: 'center' },
});
