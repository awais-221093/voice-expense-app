import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText, Button } from '@/components/ui';
import {
  checkSpeechReadiness,
  triggerModelDownload,
  type SpeechProblem,
} from '@/features/speech/readiness';
import { useSettings } from '@/features/settings/store';
import { log } from '@/lib/debugLog';
import { spacing, useTheme } from '@/theme';

const COPY: Record<SpeechProblem, { title: string; body: string }> = {
  permission: {
    title: 'Microphone access needed',
    body: 'The app listens only while you hold the button. Speech is turned into text on your phone and no audio is saved.\n\nWith TalkBack: double-tap and hold the mic, or switch to "Tap to talk" in Profile.',
  },
  'model-missing': {
    title: 'Download the offline speech model',
    body: 'Your phone needs its offline speech pack for this language, so your voice never leaves the device.\n\nTap "Download" below. If nothing opens: Settings → System → Languages → Speech / On-device recognition → add the language.',
  },
  service: {
    title: 'Speech service not available',
    body: "Android's speech service didn't start on this phone. Check that the Google app is installed and turned on (Settings → Apps → Google), then try the mic again.",
  },
  unsupported: {
    title: 'On-device speech not available',
    body: 'This phone has no on-device speech recognition.',
  },
};

/** Android's download statuses, in words. Anything else is an error (raw text goes to the debug log). */
const DOWNLOAD_STATUS: Record<string, string> = {
  download_success: 'Downloaded. Tap Try again.',
  download_scheduled: "Download queued (it may wait for Wi-Fi). Tap Try again when it's done.",
  opened_dialog: 'Finish in the dialog that opened, then tap Try again.',
};

/** Problems where Google's online recognizer is a working way out. */
const ONLINE_HELPS: SpeechProblem[] = ['model-missing', 'unsupported', 'service'];

/** One clear explanation screen for anything that blocks recording (plan §6.2). */
export default function SpeechSetupScreen() {
  const c = useTheme();
  const { problem = 'permission', locale = 'en-US' } = useLocalSearchParams<{
    problem: SpeechProblem;
    locale: string;
  }>();
  const settings = useSettings((s) => s.settings);
  const update = useSettings((s) => s.update);
  const [status, setStatus] = useState<string | null>(null);
  const copy = COPY[problem] ?? COPY.permission;
  const offerOnline = ONLINE_HELPS.includes(problem) && !settings.allowOnlineSttFallback;

  async function retry(askPermission: boolean, allowOnline = settings.allowOnlineSttFallback) {
    try {
      const r = await checkSpeechReadiness(settings.sttLocale, allowOnline, askPermission);
      if (r.ok) return router.back();
      if (r.problem === 'permission' && !r.canAskAgain) return await Linking.openSettings();
      setStatus(r.problem === problem ? 'Still not ready.' : COPY[r.problem].title);
    } catch (e) {
      log.error('speech setup retry failed', e);
      setStatus('Could not check. Try again in a moment.');
    }
  }

  async function download() {
    const result = await triggerModelDownload(locale);
    if (!DOWNLOAD_STATUS[result]) log.warn('model download', { result });
    setStatus(DOWNLOAD_STATUS[result] ?? "Couldn't start the download. Use the steps above.");
  }

  // Plan §3.1: never fall back silently. This is the user's explicit choice, same as the Profile toggle.
  function switchToOnline() {
    update({ allowOnlineSttFallback: true });
    void retry(false, true);
  }

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: c.background }]}>
      <View style={styles.body}>
        <AppText variant="title">{copy.title}</AppText>
        <AppText muted>{copy.body}</AppText>
        {offerOnline && (
          <AppText muted>
            Or use online recognition: your voice is sent to Google to be turned into text.
          </AppText>
        )}
        {status && <AppText color={c.review}>{status}</AppText>}
      </View>
      <View style={styles.actions}>
        {problem === 'permission' && (
          <Button title="Allow microphone" onPress={() => retry(true)} />
        )}
        {problem === 'model-missing' && <Button title="Download" onPress={download} />}
        {offerOnline && (
          <Button
            title="Use online recognition"
            kind={problem === 'model-missing' ? 'secondary' : 'primary'}
            onPress={switchToOnline}
          />
        )}
        <Button title="Try again" kind="secondary" onPress={() => retry(false)} />
        {problem !== 'permission' && (
          <Button
            title="Type a note instead"
            kind="ghost"
            onPress={() => router.dismissTo({ pathname: '/', params: { type: '1' } })}
          />
        )}
        <Button title="Close" kind="ghost" onPress={() => router.back()} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: spacing.xl, justifyContent: 'space-between' },
  body: { gap: spacing.lg, marginTop: spacing.xxl },
  actions: { gap: spacing.md },
});
