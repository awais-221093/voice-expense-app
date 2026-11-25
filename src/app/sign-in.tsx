import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from '@react-native-firebase/auth';
import { useRef, useState, type ComponentRef } from 'react';
import { KeyboardAvoidingView, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText, Button } from '@/components/ui';
import { auth } from '@/lib/firebase';
import { MIN_TOUCH, radius, spacing, useTheme } from '@/theme';

type Mode = 'sign-in' | 'create';

/**
 * Email/password sign-in and account creation on one screen (less code than two routes, and the
 * typed email carries over). Creating an account also signs in, so the auth gate moves on by itself.
 */
export default function SignInScreen() {
  const c = useTheme();
  const [mode, setMode] = useState<Mode>('sign-in');
  const creating = mode === 'create';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const passwordRef = useRef<ComponentRef<typeof TextInput>>(null);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      if (creating) await createUserWithEmailAndPassword(auth, email.trim(), password);
      else await signInWithEmailAndPassword(auth, email.trim(), password);
      // The auth gate in _layout switches to the home screen.
    } catch (e) {
      const code = authCode(e);
      // The account exists: the user meant to sign in, so switch for them.
      if (creating && code.includes('email-already-in-use')) setMode('sign-in');
      setError(friendlyAuthError(code, creating));
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
          <AppText muted>
            {creating
              ? "Create your account. You'll stay signed in."
              : 'Sign in once. You will stay signed in.'}
          </AppText>
        </View>
        <TextInput
          style={input}
          placeholder="Email"
          placeholderTextColor={c.textMuted}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          returnKeyType="next"
          submitBehavior="submit"
          onSubmitEditing={() => passwordRef.current?.focus()}
          value={email}
          onChangeText={setEmail}
          accessibilityLabel="Email"
        />
        <View>
          <TextInput
            ref={passwordRef}
            style={[input, styles.passwordInput]}
            placeholder="Password"
            placeholderTextColor={c.textMuted}
            secureTextEntry={!showPassword}
            autoComplete={creating ? 'new-password' : 'password'}
            returnKeyType="go"
            value={password}
            onChangeText={setPassword}
            onSubmitEditing={submit}
            accessibilityLabel="Password"
          />
          <Pressable
            onPress={() => setShowPassword((v) => !v)}
            accessibilityRole="button"
            accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
            style={styles.eye}>
            <MaterialCommunityIcons
              name={showPassword ? 'eye-off-outline' : 'eye-outline'}
              size={22}
              color={c.textMuted}
            />
          </Pressable>
        </View>
        {error && (
          <AppText color={c.danger} accessibilityLiveRegion="polite">
            {error}
          </AppText>
        )}
        <Button
          title={
            creating
              ? busy
                ? 'Creating account…'
                : 'Create account'
              : busy
                ? 'Signing in…'
                : 'Sign in'
          }
          onPress={submit}
          disabled={busy || !email || !password}
        />
        <Button
          title={creating ? 'Have an account? Sign in' : 'New here? Create an account'}
          kind="ghost"
          onPress={() => {
            setMode(creating ? 'sign-in' : 'create');
            setError(null);
          }}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const authCode = (e: unknown) => (e as { code?: string })?.code ?? '';

function friendlyAuthError(code: string, creating: boolean): string {
  if (code.includes('email-already-in-use'))
    return 'An account with this email exists. Sign in instead.';
  if (code.includes('weak-password')) return 'Use at least 6 characters.';
  if (code.includes('invalid-email')) return "That email doesn't look right.";
  if (
    code.includes('invalid-credential') ||
    code.includes('wrong-password') ||
    code.includes('user-not-found')
  )
    return 'Email or password is wrong.';
  if (code.includes('network'))
    return creating
      ? 'No internet. Creating an account needs a connection.'
      : 'No internet. Signing in needs a connection the first time.';
  if (code.includes('too-many-requests')) return 'Too many tries. Wait a minute and try again.';
  return creating
    ? 'Could not create the account. Check the details and try again.'
    : 'Could not sign in. Check the details and try again.';
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
  // Room for the show/hide button inside the field.
  passwordInput: { paddingRight: MIN_TOUCH + spacing.sm },
  eye: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: MIN_TOUCH,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
