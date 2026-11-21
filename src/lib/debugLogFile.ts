// Keeps the debug log across app kills (IDEAS, developer list): the in-memory ring buffer is
// mirrored to a small JSON file and restored on start. Writes are batched, never on every line.
import { File, Paths } from 'expo-file-system';

import { log, type LogLine } from './debugLog';

const file = new File(Paths.document, 'debug-log.json');
const WRITE_DELAY_MS = 2_000;

/** Restores the last session's lines, then saves changes. Call once at startup. */
export function startDebugLogPersistence(): () => void {
  try {
    if (file.exists) log.restore(JSON.parse(file.textSync()) as LogLine[]);
  } catch (e) {
    log.warn('could not read the saved debug log', e);
  }

  let timer: ReturnType<typeof setTimeout> | null = null;
  const unsubscribe = log.subscribe(() => {
    if (timer) return;
    timer = setTimeout(() => {
      timer = null;
      try {
        if (!file.exists) file.create();
        file.write(JSON.stringify(log.snapshot()));
      } catch {
        // Logging must never crash the app; the in-memory log still works.
      }
    }, WRITE_DELAY_MS);
  });
  return () => {
    if (timer) clearTimeout(timer);
    unsubscribe();
  };
}
