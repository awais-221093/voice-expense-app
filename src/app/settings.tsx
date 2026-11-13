import { signOut } from '@react-native-firebase/auth';
import { router } from 'expo-router';
import { useEffect, useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, Switch, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText, Button, Chip, Segmented } from '@/components/ui';
import { PROVIDER_IDS, type ProviderId } from '@/features/llm/types';
import { useSettings } from '@/features/settings/store';
import { installedLocales, matchLocale } from '@/features/speech/readiness';
import { auth } from '@/lib/firebase';
import { MIN_TOUCH, radius, spacing, useTheme } from '@/theme';

const LANGUAGES = [
  { value: 'en-US', label: 'English' },
  { value: 'ur-PK', label: 'Urdu' },
] as const;

const PROVIDER_LABEL: Record<ProviderId, string> = { groq: 'Groq', openrouter: 'OpenRouter' };

/** Every setting from plan §6.5 and nothing else. */
export default function SettingsScreen() {
  const c = useTheme();
  const { settings, keys, update, setKey } = useSettings();
  const [installed, setInstalled] = useState<string[] | null>(null);

  useEffect(() => {
    installedLocales().then(setInstalled);
  }, []);

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: c.background }]}>
      <View style={styles.header}>
        <Button title="‹ Back" kind="ghost" onPress={() => router.back()} />
        <AppText variant="title">Settings</AppText>
      </View>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Section title="Recording">
          <Segmented
            value={settings.recordingMode}
            onChange={(recordingMode) => update({ recordingMode })}
            options={[
              { value: 'hold', label: 'Hold to talk' },
              { value: 'tap', label: 'Tap to talk' },
            ]}
          />
          {settings.recordingMode === 'tap' && (
            <>
              <AppText muted>Stop after silence of</AppText>
              <Segmented
                value={String(settings.silenceTimeoutSec)}
                onChange={(v) => update({ silenceTimeoutSec: Number(v) })}
                options={['2', '3', '4', '5'].map((v) => ({ value: v, label: `${v} s` }))}
              />
            </>
          )}
        </Section>

        <Section title="Speech language">
          <Segmented
            value={settings.sttLocale}
            onChange={(sttLocale) => update({ sttLocale })}
            options={LANGUAGES.map((l) => ({
              value: l.value,
              label:
                installed === null || matchLocale(l.value, installed)
                  ? l.label
                  : `${l.label} (not downloaded)`,
            }))}
          />
          <Toggle
            label="Allow online recognition if the offline model is missing"
            value={settings.allowOnlineSttFallback}
            onChange={(allowOnlineSttFallback) => update({ allowOnlineSttFallback })}
          />
        </Section>

        <Section title="Sources">
          <ListEditor items={settings.knownSources} onChange={(knownSources) => update({ knownSources })} />
        </Section>

        <Section title="Categories">
          <ListEditor
            items={settings.categories}
            locked={['other']}
            onChange={(categories) => update({ categories })}
          />
        </Section>

        <Section title="AI provider">
          <Segmented
            value={settings.llmProvider}
            onChange={(llmProvider) => update({ llmProvider })}
            options={PROVIDER_IDS.map((p) => ({ value: p, label: PROVIDER_LABEL[p] }))}
          />
          {PROVIDER_IDS.map((p) => (
            <View key={p} style={styles.provider}>
              <AppText variant="bodyStrong">{PROVIDER_LABEL[p]}</AppText>
              <SavedInput
                label={`${PROVIDER_LABEL[p]} API key`}
                value={keys[p] ?? ''}
                placeholder={keys[p] ? 'Saved' : 'Paste API key'}
                secure
                onSave={(v) => setKey(p, v)}
              />
              <SavedInput
                label={`${PROVIDER_LABEL[p]} model`}
                value={settings.llmModels[p]}
                onSave={(v) => v.trim() && update({ llmModels: { ...settings.llmModels, [p]: v.trim() } })}
              />
            </View>
          ))}
          <Toggle
            label="If the primary provider fails, try the other one"
            value={settings.fallbackEnabled}
            onChange={(fallbackEnabled) => update({ fallbackEnabled })}
          />
          <AppText variant="small" muted>
            Keys are stored only on this phone. Set a monthly spending limit on your OpenRouter key.
          </AppText>
        </Section>

        <Section title="Account">
          <AppText muted>{auth.currentUser?.email}</AppText>
          <Button title="Sign out" kind="danger" onPress={() => signOut(auth)} />
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  const c = useTheme();
  return (
    <View style={[styles.section, { backgroundColor: c.surface }]}>
      <AppText variant="label" muted>
        {title.toUpperCase()}
      </AppText>
      {children}
    </View>
  );
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <View style={styles.toggle}>
      <AppText style={styles.flex}>{label}</AppText>
      <Switch value={value} onValueChange={onChange} accessibilityLabel={label} />
    </View>
  );
}

/** Text input that saves on submit/blur, so keys and models aren't written per keystroke. */
function SavedInput({
  label,
  value,
  onSave,
  placeholder,
  secure,
}: {
  label: string;
  value: string;
  onSave: (v: string) => void;
  placeholder?: string;
  secure?: boolean;
}) {
  const c = useTheme();
  // Secret values are never shown back; the field starts empty and "Saved" is the placeholder.
  const [text, setText] = useState(secure ? '' : value);
  const commit = () => {
    if (secure ? text.trim() !== '' : text !== value) onSave(text);
    if (secure) setText('');
  };
  return (
    <TextInput
      style={[styles.input, { backgroundColor: c.surfaceAlt, color: c.text }]}
      value={text}
      onChangeText={setText}
      onBlur={commit}
      onSubmitEditing={commit}
      placeholder={placeholder}
      placeholderTextColor={c.textMuted}
      secureTextEntry={secure}
      autoCapitalize="none"
      autoCorrect={false}
      accessibilityLabel={label}
    />
  );
}

/** Add with the input, remove by tapping a chip. `locked` items can't be removed. */
function ListEditor({
  items,
  onChange,
  locked = [],
}: {
  items: string[];
  onChange: (items: string[]) => void;
  locked?: string[];
}) {
  const c = useTheme();
  const [draft, setDraft] = useState('');
  const add = () => {
    const v = draft.trim().toLowerCase();
    if (v && !items.includes(v)) onChange([...items, v]);
    setDraft('');
  };
  return (
    <>
      <View style={styles.chips}>
        {items.map((item) => (
          <Chip
            key={item}
            label={locked.includes(item) ? item : `${item}  ✕`}
            onPress={locked.includes(item) ? undefined : () => onChange(items.filter((i) => i !== item))}
          />
        ))}
      </View>
      <TextInput
        style={[styles.input, { backgroundColor: c.surfaceAlt, color: c.text }]}
        value={draft}
        onChangeText={setDraft}
        onSubmitEditing={add}
        placeholder="Add…"
        placeholderTextColor={c.textMuted}
        autoCapitalize="none"
        returnKeyType="done"
      />
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.sm },
  content: { padding: spacing.lg, gap: spacing.lg },
  section: { padding: spacing.lg, borderRadius: radius.md, gap: spacing.md },
  provider: { gap: spacing.sm },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: MIN_TOUCH },
  flex: { flex: 1 },
  input: { minHeight: MIN_TOUCH, borderRadius: radius.md, paddingHorizontal: spacing.lg, fontSize: 16 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
