import { ExpoSpeechRecognitionModule } from 'expo-speech-recognition';

export type SpeechProblem = 'permission' | 'unsupported' | 'model-missing';

export type SpeechReadiness =
  | { ok: true; locale: string; onDevice: boolean }
  | { ok: false; problem: SpeechProblem; locale: string; canAskAgain: boolean };

/**
 * Checks everything needed before recording, so we never silently fall back to online STT.
 * `preferred` is a BCP-47 tag; any installed model of the same language counts (ur-PK ≈ ur-IN).
 */
export async function checkSpeechReadiness(
  preferred: string,
  allowOnline: boolean,
  askPermission = false,
): Promise<SpeechReadiness> {
  const perm = askPermission
    ? await ExpoSpeechRecognitionModule.requestPermissionsAsync()
    : await ExpoSpeechRecognitionModule.getPermissionsAsync();
  if (!perm.granted) return { ok: false, problem: 'permission', locale: preferred, canAskAgain: perm.canAskAgain };

  if (!ExpoSpeechRecognitionModule.supportsOnDeviceRecognition()) {
    return allowOnline
      ? { ok: true, locale: preferred, onDevice: false }
      : { ok: false, problem: 'unsupported', locale: preferred, canAskAgain: false };
  }

  const installed = await installedLocales();
  const match = matchLocale(preferred, installed);
  if (match) return { ok: true, locale: match, onDevice: true };
  if (allowOnline) return { ok: true, locale: preferred, onDevice: false };
  return { ok: false, problem: 'model-missing', locale: preferred, canAskAgain: false };
}

export async function installedLocales(): Promise<string[]> {
  try {
    const { installedLocales: list } = await ExpoSpeechRecognitionModule.getSupportedLocales({});
    return list;
  } catch {
    return [];
  }
}

export function matchLocale(preferred: string, installed: string[]): string | null {
  const norm = (l: string) => l.replace('_', '-').toLowerCase();
  const exact = installed.find((l) => norm(l) === norm(preferred));
  if (exact) return exact;
  const lang = norm(preferred).split('-')[0];
  return installed.find((l) => norm(l).split('-')[0] === lang) ?? null;
}

/** Opens Android's offline-model download dialog where supported. */
export async function triggerModelDownload(locale: string): Promise<string> {
  try {
    const res = await ExpoSpeechRecognitionModule.androidTriggerOfflineModelDownload({ locale });
    return res.status;
  } catch (e) {
    return `error: ${(e as Error).message}`;
  }
}
