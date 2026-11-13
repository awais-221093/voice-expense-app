// React Native Firebase (native SDK, modular API). Config comes from google-services.json at build
// time, so there is no initializeApp call. Firestore's on-disk offline persistence is on by default.
import { getAuth } from '@react-native-firebase/auth';
import { collection, doc, getFirestore } from '@react-native-firebase/firestore';

export const auth = getAuth();
export const db = getFirestore();

export const paths = {
  settings: (uid: string) => doc(db, 'users', uid, 'settings', 'app'),
  commands: (uid: string) => collection(db, 'users', uid, 'commands'),
  command: (uid: string, id: string) => doc(db, 'users', uid, 'commands', id),
  entries: (uid: string) => collection(db, 'users', uid, 'entries'),
  entry: (uid: string, id: string) => doc(db, 'users', uid, 'entries', id),
};
