import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

/**
 * Current time that refreshes every minute and on app foreground, so "today" and "this month"
 * roll over at midnight without making render impure.
 */
export function useNow(intervalMs = 60_000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const tick = () => setNow(new Date());
    const id = setInterval(tick, intervalMs);
    const sub = AppState.addEventListener('change', (s) => s === 'active' && tick());
    return () => {
      clearInterval(id);
      sub.remove();
    };
  }, [intervalMs]);
  return now;
}
