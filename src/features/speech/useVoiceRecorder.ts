import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';
import { useCallback, useEffect, useRef, useState } from 'react';

import { log } from '@/lib/debugLog';
import { haptics } from '@/lib/haptics';

export type RecorderPhase = 'idle' | 'listening' | 'stopping';
export type RecorderError = 'permission' | 'model-missing' | 'busy' | 'other';

export interface StartOptions {
  locale: string;
  onDevice: boolean;
  mode: 'hold' | 'tap';
  silenceTimeoutSec: number;
}

interface Callbacks {
  onFinal: (transcript: string, opts: StartOptions) => void;
  onEmpty: () => void;
  onError: (error: RecorderError, message: string) => void;
}

const MAX_RECORDING_MS = 30_000;
const MIN_HOLD_MS = 300;
/** Extra grace before the first word in tap mode. */
const FIRST_WORD_GRACE_MS = 2_000;

/**
 * Wraps expo-speech-recognition for both recording modes.
 * Continuous mode keeps Android from ending on short pauses; finished segments are accumulated.
 * Android often ignores custom silence lengths, so tap mode also runs an app-side silence timer.
 */
export function useVoiceRecorder(callbacks: Callbacks) {
  // Event listeners read the latest callbacks through a ref, so they never go stale.
  const cb = useRef(callbacks);
  useEffect(() => {
    cb.current = callbacks;
  });

  const [phase, setPhase] = useState<RecorderPhase>('idle');
  const [liveText, setLiveText] = useState('');

  const finals = useRef('');
  const interim = useRef('');
  const opts = useRef<StartOptions | null>(null);
  const startedAt = useRef(0);
  const lastHeard = useRef(0);
  const discard = useRef(false);
  const errored = useRef(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimer = () => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
  };

  const stop = useCallback(() => {
    clearTimer();
    setPhase((p) => (p === 'idle' ? p : 'stopping'));
    ExpoSpeechRecognitionModule.stop();
  }, []);

  const cancel = useCallback(() => {
    discard.current = true;
    clearTimer();
    ExpoSpeechRecognitionModule.abort();
  }, []);

  const start = useCallback(
    (o: StartOptions) => {
      finals.current = '';
      interim.current = '';
      discard.current = false;
      errored.current = false;
      opts.current = o;
      startedAt.current = Date.now();
      lastHeard.current = Date.now() + FIRST_WORD_GRACE_MS;
      setLiveText('');
      setPhase('listening');
      haptics.start();

      // Hold mode: silence must never end the recording, so ask for the longest silence allowed.
      const silenceMs = o.mode === 'hold' ? MAX_RECORDING_MS : o.silenceTimeoutSec * 1000;
      ExpoSpeechRecognitionModule.start({
        lang: o.locale,
        interimResults: true,
        continuous: true,
        requiresOnDeviceRecognition: o.onDevice,
        addsPunctuation: false,
        androidIntentOptions: {
          EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS: silenceMs,
          EXTRA_SPEECH_INPUT_POSSIBLY_COMPLETE_SILENCE_LENGTH_MILLIS: silenceMs,
        },
      });

      timer.current = setInterval(() => {
        const now = Date.now();
        if (now - startedAt.current >= MAX_RECORDING_MS) return stop();
        if (o.mode === 'tap' && now - lastHeard.current >= o.silenceTimeoutSec * 1000) stop();
      }, 200);
    },
    [stop],
  );

  /** Hold mode release: very short presses are treated as accidental touches. */
  const release = useCallback(() => {
    if (Date.now() - startedAt.current < MIN_HOLD_MS) cancel();
    else stop();
  }, [cancel, stop]);

  useSpeechRecognitionEvent('result', (e) => {
    const text = e.results[0]?.transcript?.trim() ?? '';
    lastHeard.current = Date.now();
    if (e.isFinal) {
      finals.current = mergeSegment(finals.current, text);
      interim.current = '';
    } else {
      interim.current = text;
    }
    setLiveText(joinText(finals.current, interim.current));
  });

  useSpeechRecognitionEvent('error', (e) => {
    // no-speech / aborted are normal outcomes, handled in 'end'.
    const code = String(e.error);
    if (code === 'no-speech' || code === 'speech-timeout' || code === 'aborted') return;
    errored.current = true;
    log.warn('speech error', { error: code, message: e.message });
    const kind: RecorderError =
      code === 'not-allowed' || code === 'service-not-allowed'
        ? 'permission'
        : code === 'language-not-supported'
          ? 'model-missing'
          : code === 'busy'
            ? 'busy'
            : 'other';
    cb.current.onError(kind, e.message);
  });

  // 'end' always fires last, including after errors.
  useSpeechRecognitionEvent('end', () => {
    clearTimer();
    const transcript = joinText(finals.current, interim.current);
    const o = opts.current;
    setPhase('idle');
    setLiveText('');
    if (discard.current || errored.current || !o) return;
    haptics.stop();
    if (transcript) cb.current.onFinal(transcript, o);
    else cb.current.onEmpty();
  });

  useEffect(() => () => {
    clearTimer();
    ExpoSpeechRecognitionModule.abort();
  }, []);

  return { phase, liveText, start, stop, release, cancel };
}

function joinText(a: string, b: string) {
  return [a, b].filter(Boolean).join(' ').trim();
}

/** Some recognisers resend the whole utterance as final, others only the new segment. */
function mergeSegment(prev: string, seg: string) {
  if (!seg) return prev;
  if (!prev || seg.startsWith(prev)) return seg;
  return `${prev} ${seg}`;
}
