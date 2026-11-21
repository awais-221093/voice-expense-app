import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/** Whether TalkBack (or another screen reader) is on; updates when it is toggled. */
export function useScreenReader(): boolean {
  const [on, setOn] = useState(false);
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isScreenReaderEnabled().then(
      (v) => alive && setOn(v),
      () => {},
    );
    const sub = AccessibilityInfo.addEventListener('screenReaderChanged', setOn);
    return () => {
      alive = false;
      sub.remove();
    };
  }, []);
  return on;
}
