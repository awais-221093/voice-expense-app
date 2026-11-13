// Settings = Firestore doc users/{uid}/settings/app (synced, offline-cached) + API keys in SecureStore.
import { onSnapshot, setDoc } from '@react-native-firebase/firestore';
import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';

import {
  DEFAULT_CATEGORIES,
  DEFAULT_KNOWN_SOURCES,
  DEFAULT_MODELS,
  type ProviderId,
} from '@/features/llm/types';
import { logOnFail } from '@/lib/debugLog';
import { paths } from '@/lib/firebase';

export interface AppSettings {
  knownSources: string[];
  categories: string[];
  llmProvider: ProviderId;
  llmModels: Record<ProviderId, string>;
  fallbackEnabled: boolean;
  /** Preferred STT locale, e.g. "en-US" / "ur-PK"; resolved against installed models at runtime. */
  sttLocale: string;
  allowOnlineSttFallback: boolean;
  recordingMode: 'hold' | 'tap';
  silenceTimeoutSec: number;
}

export const DEFAULT_SETTINGS: AppSettings = {
  knownSources: DEFAULT_KNOWN_SOURCES,
  categories: DEFAULT_CATEGORIES,
  llmProvider: 'groq',
  llmModels: { ...DEFAULT_MODELS },
  fallbackEnabled: true,
  sttLocale: 'en-US',
  allowOnlineSttFallback: false,
  recordingMode: 'hold',
  silenceTimeoutSec: 3,
};

type Keys = Record<ProviderId, string | null>;
const keyName = (p: ProviderId) => `llm_key_${p}`;

interface SettingsState {
  uid: string | null;
  settings: AppSettings;
  keys: Keys;
  /** Bumped when a key or model changes; the queue re-runs failed commands once per bump. */
  llmConfigVersion: number;
  update: (patch: Partial<AppSettings>) => void;
  setKey: (provider: ProviderId, key: string) => Promise<void>;
}

export const useSettings = create<SettingsState>()((set, get) => ({
  uid: null,
  settings: DEFAULT_SETTINGS,
  keys: { groq: null, openrouter: null },
  llmConfigVersion: 0,

  update: (patch) => {
    const { uid, settings, llmConfigVersion } = get();
    if (!uid) return;
    const modelsChanged =
      patch.llmModels && JSON.stringify(patch.llmModels) !== JSON.stringify(settings.llmModels);
    // Optimistic: the snapshot listener confirms it a moment later (even offline, from cache).
    set({
      settings: { ...settings, ...patch },
      llmConfigVersion: llmConfigVersion + (modelsChanged ? 1 : 0),
    });
    setDoc(paths.settings(uid), patch, { merge: true }).catch(logOnFail('save settings'));
  },

  setKey: async (provider, key) => {
    const value = key.trim();
    if (value) await SecureStore.setItemAsync(keyName(provider), value);
    else await SecureStore.deleteItemAsync(keyName(provider));
    set((s) => ({
      keys: { ...s.keys, [provider]: value || null },
      llmConfigVersion: s.llmConfigVersion + 1,
    }));
  },
}));

/** Starts syncing settings for the signed-in user. Returns an unsubscribe function. */
export function startSettingsSync(uid: string): () => void {
  useSettings.setState({ uid });

  Promise.all([
    SecureStore.getItemAsync(keyName('groq')),
    SecureStore.getItemAsync(keyName('openrouter')),
  ]).then(
    ([groq, openrouter]) => useSettings.setState({ keys: { groq, openrouter } }),
    logOnFail('load keys'),
  );

  return onSnapshot(
    paths.settings(uid),
    (snap) => {
      const data = snap?.data() as Partial<AppSettings> | undefined;
      if (!data) {
        // First run: write defaults so the dashboard sees the same lists. Only when the server
        // confirms the doc is missing — an empty offline cache must not overwrite real settings.
        if (snap?.metadata.fromCache) return;
        setDoc(paths.settings(uid), DEFAULT_SETTINGS, { merge: true }).catch(
          logOnFail('init settings'),
        );
        return;
      }
      useSettings.setState({
        settings: {
          ...DEFAULT_SETTINGS,
          ...data,
          llmModels: { ...DEFAULT_SETTINGS.llmModels, ...data.llmModels },
        },
      });
    },
    logOnFail('settings listener'),
  );
}

/** Non-hook access for the processing queue. */
export const getSettingsSnapshot = () => useSettings.getState();
