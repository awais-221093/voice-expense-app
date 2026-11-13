import { onSnapshot, type FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import { useEffect, useState } from 'react';

import { log } from '@/lib/debugLog';

type Query = FirebaseFirestoreTypes.Query;

/**
 * Realtime listener for a query. `makeQuery` is rebuilt only when `key` changes;
 * return null to stay idle (e.g. signed out).
 */
export function useCollection<T>(key: string, makeQuery: () => Query | null) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const q = makeQuery();
    if (!q) return;
    setLoading(true);
    return onSnapshot(
      q,
      (snap) => {
        setData(snap.docs.map((d) => d.data() as T));
        setLoading(false);
        setError(null);
      },
      (e) => {
        // Most likely a missing composite index right after deploy, or rules.
        log.error(`listener ${key}`, e);
        setError(e.message);
        setLoading(false);
      },
    );
    // makeQuery is intentionally keyed by `key`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return { data, loading, error };
}
