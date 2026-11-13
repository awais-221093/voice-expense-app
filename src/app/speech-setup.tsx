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
import { spacing, useTheme } from '@/theme';

const COPY: Record<SpeechProblem, { title: string; body: string }> = {
  permission: {
    title: 'Microphone access needed',
    body: 'The app listens only while you hold the button. Speech is turned into text on your phone and no audio is saved.',
  },
  'model-missing': {
    title: 'Download the offline speech model',
    body: 'Your phone needs its offline speech pack for this language, so your voice never leaves the device.\n\nTap "Download" below. If nothing opens: Settings → System → Languages → Speech / On-device recognition → add the language.',
  },
  unsupported: {
    title: 'On-device speech not available',
    body: 'This phone has no on-device speech recognition. You can allow online recognition in Settings (your voice is then sent to Google for transcription).',
  },
};

/** One clear explanation screen for anything that blocks recording (plan §6.2). */
export default function SpeechSetupScreen() {
  const c = useTheme();
  const { problem = 'permission', locale = 'en-US' } = useLocalSearchParams<{
    problem: SpeechProblem;
    locale: string;
  }>();
  const settings = useSettings((s) => s.settings);
  const [status, setStatus] = useState<string | null>(null);
  const copy = COPY[problem] ?? COPY.permission;

  async function retry(askPermission: boolean) {
    const r = await checkSpeechReadiness(
      settings.sttLocale,
      settings.allowOnlineSttFallback,
      askPermission,
    );
    if (r.ok) return router.back();
    if (r.problem === 'permission' && !r.canAskAgain) return Linking.openSettings();
    setStatus(r.problem === problem ? 'Still not ready.' : COPY[r.problem].title);
  }

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: c.background }]}>
      <View style={styles.body}>
        <AppText variant="title">{copy.title}</AppText>
        <AppText muted>{copy.body}</AppText>
        {status && <AppText color={c.review}>{status}</AppText>}
      </View>
      <View style={styles.actions}>
        {problem === 'permission' && (
          <Button title="Allow microphone" onPress={() => retry(true)} />
        )}
        {problem === 'model-missing' && (
          <Button
            title="Download"
            onPress={async () => setStatus(`Download: ${await triggerModelDownload(locale)}`)}
          />
        )}
        {problem === 'unsupported' && (
          <Button title="Open settings" onPress={() => router.replace('/profile')} />
        )}
        <Button title="Try again" kind="secondary" onPress={() => retry(false)} />
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
