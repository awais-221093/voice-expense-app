// App-wide voice recording, result card and entry sheet. Lives above the tabs so the mic in the
// tab bar works from every screen, and results show wherever the user is.
import { router } from 'expo-router';
import { createContext, use, useEffect, useRef, useState, type ReactNode } from 'react';
import { Alert, AppState } from 'react-native';

import { EditEntrySheet, type SheetTarget } from '@/components/EditEntrySheet';
import { RecordingOverlay } from '@/components/RecordingOverlay';
import { TypeNoteSheet } from '@/components/TypeNoteSheet';
import type { ToastData } from '@/components/Toast';
import { useOpenCommands } from '@/features/commands/hooks';
import { useInFlight } from '@/features/commands/queue';
import { createCommand, createManualEntry } from '@/features/commands/repo';
import { useCommandEntries } from '@/features/entries/hooks';
import { repeatEntry, setEntriesDeleted, updateEntry } from '@/features/entries/repo';
import type { Entry } from '@/features/entries/types';
import { useSettings } from '@/features/settings/store';
import { checkSpeechReadiness, type SpeechReadiness } from '@/features/speech/readiness';
import { useVoiceRecorder, type RecorderPhase } from '@/features/speech/useVoiceRecorder';
import { log, logOnFail } from '@/lib/debugLog';
import { isFirstTime } from '@/lib/firstRun';
import { haptics } from '@/lib/haptics';
import { formatPKR } from '@/lib/money';
import { useIsOnline } from '@/lib/network';

/** After this long without a result, say it's saved and will finish in the background. */
const UNDERSTANDING_TIMEOUT_MS = 12_000;

interface Watching {
  id: string;
  transcript: string;
  timedOut: boolean;
}

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
  /** Opens the keyboard alternative to speaking. */
  typeNote: () => void;
  /** Soft delete with an Undo snackbar. */
  deleteEntry: (e: Entry) => void;
  /** Asks, then adds a copy dated now (with Undo). */
  repeatEntry: (e: Entry) => void;
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
  const [typing, setTyping] = useState(false);
  /** The command just spoken; its outcome becomes the result card. */
  const [watching, setWatching] = useState<Watching | null>(null);
  const watchedId = watching?.id ?? null;
  const watchedEntries = useCommandEntries(uid, watchedId);

  // Readiness is checked ahead of time so pressing the mic starts instantly.
  const [ready, setReady] = useState<SpeechReadiness | null>(null);
  const { sttLocale, allowOnlineSttFallback } = settings;
  useEffect(() => {
    const check = () =>
      checkSpeechReadiness(sttLocale, allowOnlineSttFallback).then(
        setReady,
        logOnFail('speech readiness check'),
      );
    check();
    // Re-check on return from Android settings (permission granted, model downloaded).
    const sub = AppState.addEventListener('change', (s) => s === 'active' && check());
    return () => sub.remove();
  }, [sttLocale, allowOnlineSttFallback]);

  // First run (plan §6.6): fix permission / offline model before the first note, not on first press.
  const firstRunChecked = useRef(false);
  useEffect(() => {
    if (!ready || firstRunChecked.current) return;
    firstRunChecked.current = true;
    isFirstTime('first_run_speech_setup').then((first) => {
      if (first && !ready.ok)
        router.push({
          pathname: '/speech-setup',
          params: { problem: ready.problem, locale: sttLocale },
        });
    }, logOnFail('first-run speech check'));
  }, [ready, sttLocale]);

  const showToast = (t: ToastData) => {
    setWatching(null);
    setToast(t);
  };

  /** Spoken or typed: save the command, then watch it so its result card shows. */
  function submitNote(transcript: string, meta: Parameters<typeof createCommand>[2]) {
    const id = createCommand(uid, transcript, meta);
    setToast(null);
    setWatching({ id, transcript, timedOut: false });
  }

  const openSetup = (problem: string) =>
    router.push({ pathname: '/speech-setup', params: { problem, locale: sttLocale } });

  const recorder = useVoiceRecorder({
    onFinal: (transcript, o) =>
      submitNote(transcript, {
        sttEngine: o.onDevice ? 'on-device' : 'online',
        locale: o.locale,
        recordingMode: o.mode,
      }),
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

  /** Hold mode: true from press to release, so a release during the readiness check is noticed. */
  const held = useRef(false);

  async function start() {
    // A press while the last recording is still stopping would reset the recorder before its
    // `end` event arrives, losing that recording's transcript.
    if (recorder.phase !== 'idle') return;
    held.current = true;
    let r = ready;
    if (!r?.ok) {
      // The cached result can be stale (permission just granted on the setup screen, model just
      // downloaded, first check still running), so check again before sending the user there.
      try {
        r = await checkSpeechReadiness(sttLocale, allowOnlineSttFallback);
      } catch (e) {
        log.error('speech readiness check failed', e);
        return showToast({
          key: `ready${Date.now()}`,
          title: "Couldn't start speech recognition",
          lines: ['Try again in a moment.'],
          tone: 'review',
        });
      }
      setReady(r);
      if (!r.ok) return openSetup(r.problem);
      // The finger lifted while we checked: don't start a hands-free recording; the next press works.
      if (settings.recordingMode === 'hold' && !held.current) return;
    }
    recorder.start({
      locale: r.locale,
      onDevice: r.onDevice,
      mode: settings.recordingMode,
      silenceTimeoutSec: settings.silenceTimeoutSec,
    });
  }

  function release() {
    held.current = false;
    recorder.release();
  }

  function repeat(entry: Entry) {
    Alert.alert('Add again today?', describeEntry(entry), [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Add',
        onPress: () => {
          const id = repeatEntry(uid, entry);
          showToast({
            key: `again-${id}`,
            title: 'Added again for today',
            lines: [describeEntry(entry)],
            tone: 'success',
            action: { label: 'Undo', onPress: () => setEntriesDeleted(uid, [id], true) },
          });
        },
      },
    ]);
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
    release,
    stop: recorder.stop,
    showToast,
    openSheet: setSheet,
    typeNote: () => setTyping(true),
    deleteEntry,
    repeatEntry: repeat,
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
      {typing && (
        <TypeNoteSheet
          onClose={() => setTyping(false)}
          onSubmit={(text) =>
            submitNote(text, {
              sttEngine: 'typed',
              locale: settings.sttLocale,
              recordingMode: 'typed',
            })
          }
        />
      )}
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
  w: Watching,
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
  // Between release and the result (plan §6.2), so it never looks like nothing happened.
  return {
    key: w.id,
    title: 'Understanding…',
    tone: 'info',
    busy: true,
    lines: [`“${w.transcript}”`],
    // Long enough for slow LLM retries; the title change to the result restarts the timer.
    durationMs: 60_000,
  };
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
