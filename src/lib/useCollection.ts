import { onSnapshot, type Query } from '@react-native-firebase/firestore';
import { useEffect, useState } from 'react';

import { log } from '@/lib/debugLog';

interface Snapshot<T> {
  key: string;
  data: T[];
  error: string | null;
}

/**
 * Realtime listener for a query. `makeQuery` is rebuilt only when `key` changes;
 * return null to stay idle (e.g. signed out). Loading = no snapshot yet for the current key.
 */
export function useCollection<T>(key: string, makeQuery: () => Query | null) {
  const [snap, setSnap] = useState<Snapshot<T> | null>(null);

  useEffect(() => {
    const q = makeQuery();
    if (!q) return;
    return onSnapshot(
      q,
      (s) => setSnap({ key, data: s.docs.map((d) => d.data() as T), error: null }),
      (e) => {
        // Most likely a missing composite index right after deploy, or rules.
        log.error(`listener ${key}`, e);
        setSnap({ key, data: [], error: e.message });
      },
    );
    // makeQuery is intentionally keyed by `key`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const current = snap?.key === key ? snap : null;
  // A shared empty array keeps `data` referentially stable while loading (safe for memo deps).
  const data: T[] = current?.data ?? EMPTY;
  return { data, loading: !current, error: current?.error ?? null };
}

const EMPTY: never[] = [];
