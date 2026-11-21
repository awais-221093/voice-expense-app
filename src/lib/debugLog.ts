// In-memory ring buffer shown on the hidden debug screen (long-press the Profile avatar).
// Mirrored to a file by debugLogFile.ts so it survives app kills (DECISIONS #11 updated).

export interface LogLine {
  at: number;
  level: 'info' | 'warn' | 'error';
  msg: string;
}

const MAX = 300;
const lines: LogLine[] = [];
const listeners = new Set<() => void>();
let version = 0;

function push(level: LogLine['level'], msg: string, detail?: unknown) {
  const text = detail === undefined ? msg : `${msg} ${stringify(detail)}`;
  lines.push({ at: Date.now(), level, msg: text });
  if (lines.length > MAX) lines.shift();
  if (__DEV__) console[level === 'info' ? 'log' : level](`[app] ${text}`);
  notify();
}

function notify() {
  version++;
  listeners.forEach((l) => l());
}

function stringify(v: unknown): string {
  if (v instanceof Error) return v.message;
  try {
    return typeof v === 'string' ? v : JSON.stringify(v);
  } catch {
    return String(v);
  }
}

export const log = {
  info: (msg: string, detail?: unknown) => push('info', msg, detail),
  warn: (msg: string, detail?: unknown) => push('warn', msg, detail),
  error: (msg: string, detail?: unknown) => push('error', msg, detail),
  lines: () => lines.slice().reverse(),
  /** Oldest first, for saving. */
  snapshot: () => lines.slice(),
  /** Puts saved lines from an earlier session before the current ones (cap still applies). */
  restore: (saved: LogLine[]) => {
    if (!Array.isArray(saved) || !saved.length) return;
    lines.unshift(...saved);
    if (lines.length > MAX) lines.splice(0, lines.length - MAX);
    notify();
  },
  clear: () => {
    lines.length = 0;
    notify();
  },
  /** Changes on every new line (for useSyncExternalStore). */
  version: () => version,
  subscribe: (fn: () => void) => {
    listeners.add(fn);
    return () => void listeners.delete(fn);
  },
};

/** For fire-and-forget Firestore writes: log failures instead of leaving unhandled rejections. */
export function logOnFail(label: string) {
  return (err: unknown) => log.error(`${label} failed`, err);
}
