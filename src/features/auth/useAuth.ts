import { onAuthStateChanged, type FirebaseAuthTypes } from '@react-native-firebase/auth';
import { useEffect, useState } from 'react';

import { auth } from '@/lib/firebase';

/** Native auth persists the session; `initializing` is true until the first callback. */
export function useAuth() {
  const [user, setUser] = useState<FirebaseAuthTypes.User | null>(auth.currentUser);
  const [initializing, setInitializing] = useState(true);

  useEffect(
    () =>
      onAuthStateChanged(auth, (u) => {
        setUser(u);
        setInitializing(false);
      }),
    [],
  );

  return { user, initializing };
}
