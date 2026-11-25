import { signOut } from '@react-native-firebase/auth';
import { router } from 'expo-router';
import { useEffect, useState, type ReactNode } from 'react';
import {
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText, Button, Chip, Segmented } from '@/components/ui';
import { describeReason } from '@/features/commands/status';
import { pingProvider } from '@/features/llm/ping';
import { PROVIDER_IDS, type ProviderId } from '@/features/llm/types';
import { setAppLockEnabled, useAppLock } from '@/features/lock/appLock';
import { useRecorder } from '@/features/recording/RecorderProvider';
import { ensurePermission, useReminderPrefs } from '@/features/reminder/notifications';
import { useSettings } from '@/features/settings/store';
import { installedLocales, matchLocale } from '@/features/speech/readiness';
import { appVersion } from '@/lib/appInfo';
import { log } from '@/lib/debugLog';
import { auth } from '@/lib/firebase';
import { MIN_TOUCH, radius, spacing, useTheme } from '@/theme';

const LANGUAGES = [
  { value: 'en-US', label: 'English' },
  { value: 'ur-PK', label: 'Urdu' },
] as const;

/** One tap on a danger button shouldn't end the session; signing back in needs the password. */
function confirmSignOut() {
  Alert.alert('Sign out?', 'You will need your email and password to sign in again.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Sign out', style: 'destructive', onPress: () => void signOut(auth) },
  ]);
}

const PROVIDER_LABEL: Record<ProviderId, string> = { groq: 'Groq', openrouter: 'OpenRouter' };

/** Where a first-time user gets a key (the Home banner sends them here). */
const KEY_HELP: Record<ProviderId, { text: string; url: string }> = {
  groq: { text: 'Get a free key at console.groq.com/keys', url: 'https://console.groq.com/keys' },
  openrouter: { text: 'Get a key at openrouter.ai/keys', url: 'https://openrouter.ai/keys' },
};

/** Account + every setting from plan §6.5. Long-press the avatar for the debug log. */
export default function ProfileScreen() {
  const c = useTheme();
  const { settings, keys, update, setKey } = useSettings();
  const { showToast } = useRecorder();
  const [installed, setInstalled] = useState<string[] | null>(null);

  // Empty value = remove. The field clears after saving, so the toast is the only confirmation.
  // A new key is tested right away: a typo should show up here, not on the first spoken note.
  const saveKey = (p: ProviderId, value: string) =>
    setKey(p, value).then(
      () =>
        value.trim()
          ? testKey(p, value.trim(), true)
          : showToast({
              key: `key-${p}-removed`,
              title: `${PROVIDER_LABEL[p]} key removed`,
              tone: 'success',
              durationMs: 2500,
            }),
      (e) => {
        log.error(`save ${p} key failed`, e);
        showToast({ key: `key${Date.now()}`, title: "Couldn't save the API key", tone: 'review' });
      },
    );
  const [testing, setTesting] = useState<ProviderId | null>(null);
  const testKey = async (p: ProviderId, key = keys[p], justSaved = false) => {
    if (!key) return;
    setTesting(p);
    const r = await pingProvider(p, key, settings.llmModels[p]);
    setTesting(null);
    showToast(
      r.ok
        ? {
            key: `test-${p}-ok`,
            title: `${PROVIDER_LABEL[p]} ${justSaved ? 'key saved and works' : 'works'}`,
            lines: [r.model],
            tone: 'success',
          }
        : {
            key: `test-${p}-fail`,
            title: `${PROVIDER_LABEL[p]} ${justSaved ? 'key saved, but the test failed' : 'test failed'}`,
            lines: [
              r.kind === 'transient'
                ? `Couldn't reach ${PROVIDER_LABEL[p]} (${r.message}). Try again.`
                : describeReason(`${p}: ${r.message}`),
            ],
            tone: 'review',
          },
    );
  };

  const confirmRemoveKey = (p: ProviderId) =>
    Alert.alert(
      `Remove the ${PROVIDER_LABEL[p]} key?`,
      'Notes will fail on this provider until you add a key again.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => void saveKey(p, '') },
      ],
    );
  const email = auth.currentUser?.email ?? '';

  // Picking a language without its offline model would only fail on the next mic press; say it now.
  const selectLanguage = (sttLocale: string) => {
    update({ sttLocale });
    if (installed && !matchLocale(sttLocale, installed) && !settings.allowOnlineSttFallback)
      router.push({
        pathname: '/speech-setup',
        params: { problem: 'model-missing', locale: sttLocale },
      });
  };

  useEffect(() => {
    installedLocales().then(setInstalled);
  }, []);

  return (
    <SafeAreaView edges={['top']} style={[styles.root, { backgroundColor: c.background }]}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Pressable
          onLongPress={() => router.push('/debug')}
          accessibilityHint="Long press to open the debug log"
          style={styles.profile}>
          <View style={[styles.avatar, { backgroundColor: c.primary }]}>
            <AppText variant="title" color={c.primaryText}>
              {(email[0] ?? '?').toUpperCase()}
            </AppText>
          </View>
          <View style={styles.flex}>
            <AppText variant="title" numberOfLines={1}>
              {email.split('@')[0] || 'Profile'}
            </AppText>
            <AppText muted numberOfLines={1}>
              {email}
            </AppText>
          </View>
        </Pressable>

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
            onChange={selectLanguage}
            options={LANGUAGES.map((l) => ({
              value: l.value,
              label:
                installed === null || matchLocale(l.value, installed)
                  ? l.label
                  : `${l.label} (not downloaded)`,
            }))}
          />
          <Toggle
            label="Use online recognition when on-device isn't available"
            value={settings.allowOnlineSttFallback}
            onChange={(allowOnlineSttFallback) => update({ allowOnlineSttFallback })}
          />
          <AppText variant="small" muted>
            Online, your voice is sent to Google to be turned into text. On-device is always used
            when it works.
          </AppText>
        </Section>

        <Section title="Sources">
          <ListEditor field="knownSources" />
        </Section>

        <Section title="Categories">
          <ListEditor field="categories" locked={['other']} />
        </Section>

        <ReminderSection />

        <LockSection />

        <Section title="Monthly budget">
          <SavedInput
            key={String(settings.monthlyBudget)}
            label="Monthly budget in rupees"
            value={settings.monthlyBudget ? String(settings.monthlyBudget) : ''}
            placeholder="No budget"
            keyboardType="number-pad"
            onSave={(v) => {
              // Keep digits and the decimal point ("20,000" → 20000).
              const n = Number(v.replace(/[^\d.]/g, ''));
              update({ monthlyBudget: n > 0 ? Math.round(n) : null });
            }}
          />
          <AppText variant="small" muted>
            Expenses only. Shown as a bar on Home; leave empty for no budget.
          </AppText>
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
              {!keys[p] && (
                <Pressable
                  onPress={() => void Linking.openURL(KEY_HELP[p].url)}
                  accessibilityRole="link"
                  style={styles.link}>
                  <AppText variant="small" color={c.primary}>
                    {KEY_HELP[p].text} ›
                  </AppText>
                </Pressable>
              )}
              <SavedInput
                label={`${PROVIDER_LABEL[p]} API key`}
                value={keys[p] ?? ''}
                placeholder={keys[p] ? 'Saved' : 'Paste API key'}
                secure
                onSave={(v) => saveKey(p, v)}
              />
              {keys[p] && (
                <View style={styles.keyActions}>
                  <Button
                    title={testing === p ? 'Testing…' : 'Test key'}
                    kind="secondary"
                    disabled={testing !== null}
                    onPress={() => testKey(p)}
                  />
                  <Button title="Remove key" kind="ghost" onPress={() => confirmRemoveKey(p)} />
                </View>
              )}
              <SavedInput
                // Remount when the stored model changes (settings snapshot arriving after mount, or
                // an edit elsewhere), so the field never holds — and re-saves — a stale value.
                key={settings.llmModels[p]}
                label={`${PROVIDER_LABEL[p]} model`}
                value={settings.llmModels[p]}
                onSave={(v) =>
                  v.trim() && update({ llmModels: { ...settings.llmModels, [p]: v.trim() } })
                }
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
          <Button title="Sign out" kind="danger" onPress={confirmSignOut} />
        </Section>
        <AppText variant="small" muted style={styles.version}>
          Voice Expense {appVersion}
        </AppText>
      </ScrollView>
    </SafeAreaView>
  );
}

/** App lock with fingerprint / face / device PIN (this phone only). */
function LockSection() {
  const enabled = useAppLock((s) => s.enabled);
  const { showToast } = useRecorder();
  const toggle = async (on: boolean) => {
    const r = await setAppLockEnabled(on);
    if (r === 'no-lock-set')
      showToast({
        key: 'lock-none',
        title: 'Set a screen lock first',
        lines: ['Android Settings → Security → Screen lock, then turn this on again.'],
        tone: 'review',
      });
  };
  return (
    <Section title="Security">
      <Toggle
        label="Lock the app with fingerprint or screen lock"
        value={enabled}
        onChange={toggle}
      />
      <AppText variant="small" muted>
        Asks again after the app has been in the background for 30 seconds.
      </AppText>
    </Section>
  );
}

const REMINDER_HOURS = [19, 20, 21, 22];

/** Daily "nothing logged today" reminder. Stored on this phone only (SecureStore). */
function ReminderSection() {
  const { enabled, hour, set } = useReminderPrefs();
  const { showToast } = useRecorder();
  const toggle = async (on: boolean) => {
    if (on && !(await ensurePermission().catch(() => false))) {
      showToast({
        key: 'reminder-permission',
        title: 'Notifications are off for this app',
        lines: ['Allow them in Android Settings → Apps → Voice Expense → Notifications.'],
        tone: 'review',
      });
      return;
    }
    set({ enabled: on, hour });
  };
  return (
    <Section title="Daily reminder">
      <Toggle
        label="Remind me if I haven't logged anything today"
        value={enabled}
        onChange={toggle}
      />
      {enabled && (
        <Segmented
          value={String(hour)}
          onChange={(v) => set({ enabled, hour: Number(v) })}
          options={REMINDER_HOURS.map((h) => ({ value: String(h), label: `${h - 12} pm` }))}
        />
      )}
    </Section>
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

function Toggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
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
  keyboardType,
}: {
  label: string;
  value: string;
  onSave: (v: string) => void;
  placeholder?: string;
  secure?: boolean;
  keyboardType?: 'default' | 'number-pad';
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
      keyboardType={keyboardType}
      autoCapitalize="none"
      autoCorrect={false}
      accessibilityLabel={label}
    />
  );
}

/** Add with the input, remove by tapping a chip (with Undo). `locked` items can't be removed. */
function ListEditor({
  field,
  locked = [],
}: {
  field: 'knownSources' | 'categories';
  locked?: string[];
}) {
  const c = useTheme();
  const items = useSettings((s) => s.settings[field]);
  const update = useSettings((s) => s.update);
  const { showToast } = useRecorder();
  const [draft, setDraft] = useState('');
  const add = () => {
    const v = draft.trim().toLowerCase();
    if (v && !items.includes(v)) update({ [field]: [...items, v] });
    setDraft('');
  };
  const remove = (item: string) => {
    const index = items.indexOf(item);
    update({ [field]: items.filter((i) => i !== item) });
    showToast({
      // No Date.now() here (React Compiler purity rule); the toast hides on Undo, so a repeat key still restarts.
      key: `rm-${field}-${item}`,
      title: `Removed “${item}”`,
      action: {
        label: 'Undo',
        // Read the list at Undo time, not the one captured at removal, so edits in between survive.
        onPress: () => {
          const now = useSettings.getState().settings[field];
          if (!now.includes(item))
            update({ [field]: [...now.slice(0, index), item, ...now.slice(index)] });
        },
      },
    });
  };
  return (
    <>
      <View style={styles.chips}>
        {items.map((item) => (
          <Chip
            key={item}
            label={locked.includes(item) ? item : `${item}  ✕`}
            onPress={locked.includes(item) ? undefined : () => remove(item)}
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
  content: { padding: spacing.lg, paddingBottom: spacing.xxl * 2, gap: spacing.lg },
  profile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    paddingVertical: spacing.md,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  version: { textAlign: 'center' },
  section: { padding: spacing.lg, borderRadius: radius.md, gap: spacing.md },
  provider: { gap: spacing.sm },
  keyActions: { flexDirection: 'row', gap: spacing.sm },
  link: { minHeight: MIN_TOUCH, justifyContent: 'center' },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: MIN_TOUCH },
  flex: { flex: 1 },
  input: {
    minHeight: MIN_TOUCH,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    fontSize: 16,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
