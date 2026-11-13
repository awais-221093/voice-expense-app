// App-wide voice recording, result card and entry sheet. Lives above the tabs so the mic in the
// tab bar works from every screen, and results show wherever the user is.
import { router } from 'expo-router';
import { createContext, use, useEffect, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';

import { EditEntrySheet, type SheetTarget } from '@/components/EditEntrySheet';
import { RecordingOverlay } from '@/components/RecordingOverlay';
import type { ToastData } from '@/components/Toast';
import { useOpenCommands } from '@/features/commands/hooks';
import { useInFlight } from '@/features/commands/queue';
import { createCommand, createManualEntry } from '@/features/commands/repo';
import { useCommandEntries } from '@/features/entries/hooks';
import { setEntriesDeleted, updateEntry } from '@/features/entries/repo';
import type { Entry } from '@/features/entries/types';
import { useSettings } from '@/features/settings/store';
import { checkSpeechReadiness, type SpeechReadiness } from '@/features/speech/readiness';
import { useVoiceRecorder, type RecorderPhase } from '@/features/speech/useVoiceRecorder';
import { haptics } from '@/lib/haptics';
import { formatPKR } from '@/lib/money';
import { useIsOnline } from '@/lib/network';

/** After this long without a result, say it's saved and will finish in the background. */
const UNDERSTANDING_TIMEOUT_MS = 12_000;

interface RecorderContext {
  phase: RecorderPhase;
  /** The LLM is working on the command just spoken. */
  understanding: boolean;
  mode: 'hold' | 'tap';
  start: () => void;
  release: () => void;
  stop: () => void;
  showToast: (t: ToastData) => void;
  openSheet: (t: SheetTarget) => void;
  /** Soft delete with an Undo snackbar. */
  deleteEntry: (e: Entry) => void;
}

const Ctx = createContext<RecorderContext | null>(null);

export function useRecorder(): RecorderContext {
  const ctx = use(Ctx);
  if (!ctx) throw new Error('useRecorder must be used inside RecorderProvider');
  return ctx;
}

export function RecorderProvider({ uid, children }: { uid: string; children: ReactNode }) {
  const settings = useSettings((s) => s.settings);
  const online = useIsOnline();
  const inFlight = useInFlight((s) => s.ids);
  const open = useOpenCommands(uid);

  const [toast, setToast] = useState<ToastData | null>(null);
  const [sheet, setSheet] = useState<SheetTarget | null>(null);
  /** The command just spoken; its outcome becomes the result card. */
  const [watching, setWatching] = useState<{ id: string; timedOut: boolean } | null>(null);
  const watchedId = watching?.id ?? null;
  const watchedEntries = useCommandEntries(uid, watchedId);

  // Readiness is checked ahead of time so pressing the mic starts instantly.
  const [ready, setReady] = useState<SpeechReadiness | null>(null);
  const { sttLocale, allowOnlineSttFallback } = settings;
  useEffect(() => {
    const check = () => checkSpeechReadiness(sttLocale, allowOnlineSttFallback).then(setReady);
    check();
    // Re-check on return from Android settings (permission granted, model downloaded).
    const sub = AppState.addEventListener('change', (s) => s === 'active' && check());
    return () => sub.remove();
  }, [sttLocale, allowOnlineSttFallback]);

  const showToast = (t: ToastData) => {
    setWatching(null);
    setToast(t);
  };

  const openSetup = (problem: string) =>
    router.push({ pathname: '/speech-setup', params: { problem, locale: sttLocale } });

  const recorder = useVoiceRecorder({
    onFinal: (transcript, o) => {
      const id = createCommand(uid, transcript, {
        sttEngine: o.onDevice ? 'on-device' : 'online',
        locale: o.locale,
        recordingMode: o.mode,
      });
      setToast(null);
      setWatching({ id, timedOut: false });
    },
    onEmpty: () =>
      showToast({
        key: `empty${Date.now()}`,
        title: "Didn't catch that, try again",
        tone: 'info',
        durationMs: 2500,
      }),
    onError: (kind, message) => {
      if (kind === 'permission' || kind === 'model-missing') openSetup(kind);
      else
        showToast({
          key: `err${Date.now()}`,
          title: 'Speech recognition stopped',
          lines: [message],
          tone: 'review',
        });
    },
  });

  function start() {
    if (!ready?.ok) return openSetup(ready?.ok === false ? ready.problem : 'permission');
    recorder.start({
      locale: ready.locale,
      onDevice: ready.onDevice,
      mode: settings.recordingMode,
      silenceTimeoutSec: settings.silenceTimeoutSec,
    });
  }

  function deleteEntry(entry: Entry) {
    setEntriesDeleted(uid, [entry.id], true);
    showToast({
      key: `del${entry.id}${Date.now()}`,
      title: 'Entry deleted',
      lines: [describeEntry(entry)],
      action: { label: 'Undo', onPress: () => setEntriesDeleted(uid, [entry.id], false) },
    });
  }

  // Result card: derived from live data while a command is watched (plan §6.2).
  const result = watching
    ? resultCard(
        watching,
        watchedEntries.data.filter((e) => !e.deleted),
        open.data.find((c) => c.id === watching.id),
        inFlight.includes(watching.id),
        online,
        uid,
      )
    : null;

  useEffect(() => {
    if (!watchedId) return;
    const t = setTimeout(
      () => setWatching((w) => (w?.id === watchedId ? { ...w, timedOut: true } : w)),
      UNDERSTANDING_TIMEOUT_MS,
    );
    return () => clearTimeout(t);
  }, [watchedId]);

  // Haptic once per result state, not per render.
  const resultTone = result?.tone;
  useEffect(() => {
    if (resultTone === 'success') haptics.success();
    else if (resultTone === 'review') haptics.warning();
  }, [watchedId, resultTone]);

  const value: RecorderContext = {
    phase: recorder.phase,
    understanding: !!watchedId && inFlight.includes(watchedId),
    mode: settings.recordingMode,
    start,
    release: recorder.release,
    stop: recorder.stop,
    showToast,
    openSheet: setSheet,
    deleteEntry,
  };

  return (
    <Ctx value={value}>
      {children}
      <RecordingOverlay
        phase={recorder.phase}
        mode={settings.recordingMode}
        liveText={recorder.liveText}
        toast={result ?? toast}
        onHideToast={() => (result ? setWatching(null) : setToast(null))}
      />
      {sheet && (
        <EditEntrySheet
          key={sheet.kind === 'edit' ? sheet.entry.id : sheet.command.id}
          uid={uid}
          target={sheet}
          onClose={() => setSheet(null)}
          onSave={(fields) =>
            sheet.kind === 'edit'
              ? updateEntry(uid, sheet.entry.id, fields)
              : createManualEntry(uid, sheet.command, fields)
          }
          onDelete={sheet.kind === 'edit' ? () => deleteEntry(sheet.entry) : undefined}
        />
      )}
    </Ctx>
  );
}

function resultCard(
  w: { id: string; timedOut: boolean },
  entries: Entry[],
  cmd: { status: string; attemptCount: number; transcript: string } | undefined,
  processing: boolean,
  online: boolean,
  uid: string,
): ToastData | null {
  if (entries.length) {
    const review = entries.some((e) => e.needsReview);
    return {
      key: w.id,
      title: review ? 'Saved — check later' : 'Saved',
      tone: review ? 'review' : 'success',
      lines: entries.map(describeEntry),
      action: {
        label: 'Undo',
        onPress: () =>
          setEntriesDeleted(
            uid,
            entries.map((e) => e.id),
            true,
          ),
      },
    };
  }
  const waiting = cmd && !processing;
  if (waiting && (cmd.status !== 'pending' || cmd.attemptCount > 0 || !online || w.timedOut)) {
    return {
      key: w.id,
      title: cmd.status === 'pending' ? 'Saved — will process when online' : 'Saved — check later',
      tone: 'review',
      lines: [`“${cmd.transcript}”`],
    };
  }
  return null;
}

export function describeEntry(e: Entry): string {
  return [
    formatPKR(e.amount),
    e.description,
    e.source && `from ${e.source}`,
    e.type !== 'expense' && e.type,
  ]
    .filter(Boolean)
    .join(' · ');
}
