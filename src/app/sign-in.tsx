import { signInWithEmailAndPassword } from '@react-native-firebase/auth';
import { useState } from 'react';
import { KeyboardAvoidingView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText, Button } from '@/components/ui';
import { auth } from '@/lib/firebase';
import { MIN_TOUCH, radius, spacing, useTheme } from '@/theme';

/** Single-user email/password sign-in. The account is created in the Firebase console. */
export default function SignInScreen() {
  const c = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      // The auth gate in _layout switches to the home screen.
    } catch (e) {
      setError(friendlyAuthError(e));
    } finally {
      setBusy(false);
    }
  }

  const input = [
    styles.input,
    { backgroundColor: c.surface, borderColor: c.border, color: c.text },
  ];

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: c.background }]}>
      <KeyboardAvoidingView behavior="height" style={styles.body}>
        <View style={styles.header}>
          <AppText variant="hero">Voice Expense</AppText>
          <AppText muted>Sign in once. You will stay signed in.</AppText>
        </View>
        <TextInput
          style={input}
          placeholder="Email"
          placeholderTextColor={c.textMuted}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
          accessibilityLabel="Email"
        />
        <TextInput
          style={input}
          placeholder="Password"
          placeholderTextColor={c.textMuted}
          secureTextEntry
          autoComplete="password"
          value={password}
          onChangeText={setPassword}
          onSubmitEditing={submit}
          accessibilityLabel="Password"
        />
        {error && (
          <AppText color={c.danger} accessibilityLiveRegion="polite">
            {error}
          </AppText>
        )}
        <Button
          title={busy ? 'Signing in…' : 'Sign in'}
          onPress={submit}
          disabled={busy || !email || !password}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function friendlyAuthError(e: unknown): string {
  const code = (e as { code?: string })?.code ?? '';
  if (
    code.includes('invalid-credential') ||
    code.includes('wrong-password') ||
    code.includes('user-not-found')
  )
    return 'Email or password is wrong.';
  if (code.includes('network')) return 'No internet. Signing in needs a connection the first time.';
  if (code.includes('too-many-requests')) return 'Too many tries. Wait a minute and try again.';
  return 'Could not sign in. Check the details and try again.';
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  body: { flex: 1, justifyContent: 'center', padding: spacing.xl, gap: spacing.md },
  header: { gap: spacing.sm, marginBottom: spacing.xl },
  input: {
    minHeight: MIN_TOUCH,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    fontSize: 16,
  },
});
