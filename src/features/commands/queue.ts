// Processing queue (plan §6.3). Derived from Firestore — there is no separate local queue to drift.
import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { create } from 'zustand';

import { extractEntries, type ProviderConfig } from '@/features/llm/extract';
import type { ProviderId } from '@/features/llm/types';
import { getSettingsSnapshot, useSettings } from '@/features/settings/store';
import { log } from '@/lib/debugLog';
import { isOnline, onNetworkChange } from '@/lib/network';
import { deviceTimeZone, localISOWithOffset } from '@/lib/time';

import { commitProcessingResult, requeueCommand } from './repo';
import { planCommandResult } from './status';
import type { Command } from './types';

/** Ids currently being sent to the LLM — lets the UI show "Understanding…". */
export const useInFlight = create<{ ids: string[] }>()(() => ({ ids: [] }));
const setInFlight = (id: string, on: boolean) =>
  useInFlight.setState((s) => ({ ids: on ? [...s.ids, id] : s.ids.filter((x) => x !== id) }));

async function processCommand(uid: string, cmd: Command) {
  const { settings, keys } = getSettingsSnapshot();
  const order: ProviderId[] = [settings.llmProvider];
  if (settings.fallbackEnabled) order.push(settings.llmProvider === 'groq' ? 'openrouter' : 'groq');
  const providers: ProviderConfig[] = order
    // The fallback is used only when its key is set; the primary is always tried (missing key → fatal).
    .filter((id, i) => i === 0 || keys[id])
    .map((id) => ({ id, apiKey: keys[id], model: settings.llmModels[id] }));

  const { attempts, outcome } = await extractEntries({
    ctx: {
      transcript: cmd.transcript,
      knownSources: settings.knownSources,
      categories: settings.categories,
      // Relative dates ("yesterday") are relative to when it was said, not when it is processed.
      nowISO: localISOWithOffset(cmd.createdAt.toDate()),
      timeZone: deviceTimeZone(),
    },
    providers,
  });
  const plan = planCommandResult(outcome, cmd.attemptCount, Date.now());
  log.info(`command ${cmd.id} → ${plan.status}`, plan.statusReason ?? `${plan.entries.length} entries`);
  commitProcessingResult(uid, cmd, attempts, plan);
}

/** Mount once while signed in. `open` = useOpenCommands().data */
export function useProcessingQueue(uid: string, open: Command[]) {
  const openRef = useRef(open);
  const running = useRef(false);
  /** id → updatedAt we already processed, so a stale snapshot can't trigger a second run. */
  const handled = useRef(new Map<string, number>());
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runRef = useRef(async () => {});

  // Wake up when the earliest backoff expires.
  const scheduleNext = () => {
    if (timer.current) clearTimeout(timer.current);
    const next = openRef.current
      .filter((c) => c.status === 'pending' && c.nextRetryAt)
      .map((c) => c.nextRetryAt!.toMillis())
      .sort((a, b) => a - b)[0];
    if (next) timer.current = setTimeout(() => runRef.current(), Math.max(1000, next - Date.now()));
  };

  const run = async () => {
    if (running.current) return;
    running.current = true;
    try {
      // Offline: don't call the LLM and don't burn attempts (DECISIONS #5).
      if (!(await isOnline())) return;
      const now = Date.now();
      const due = openRef.current
        .filter((c) => c.status === 'pending' && c.entryIds.length === 0)
        .filter((c) => !c.nextRetryAt || c.nextRetryAt.toMillis() <= now)
        .filter((c) => handled.current.get(c.id) !== c.updatedAt.toMillis())
        .sort((a, b) => a.createdAt.toMillis() - b.createdAt.toMillis());
      for (const cmd of due) {
        handled.current.set(cmd.id, cmd.updatedAt.toMillis());
        setInFlight(cmd.id, true);
        try {
          await processCommand(uid, cmd);
        } catch (e) {
          log.error(`process ${cmd.id}`, e);
        } finally {
          setInFlight(cmd.id, false);
        }
      }
    } finally {
      running.current = false;
      scheduleNext();
    }
  };

  // New or changed commands (including ones just spoken).
  // `run` only reads refs (and uid, fixed for this mount), so re-running on `open` is enough.
  useEffect(() => {
    runRef.current = run;
    openRef.current = open;
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // App start is covered above; also reconnect and foreground.
  useEffect(() => {
    const unsubNet = onNetworkChange((online) => online && runRef.current());
    const sub = AppState.addEventListener('change', (s) => s === 'active' && runRef.current());
    return () => {
      unsubNet();
      sub.remove();
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  // After a key/model change, re-run failed and entry-less needs_review commands once.
  const configVersion = useSettings((s) => s.llmConfigVersion);
  const mountedVersion = useRef(configVersion);
  useEffect(() => {
    if (configVersion === mountedVersion.current) return;
    openRef.current
      .filter((c) => c.status === 'failed' || c.status === 'needs_review')
      .forEach((c) => requeueCommand(uid, c.id));
  }, [configVersion, uid]);
}
