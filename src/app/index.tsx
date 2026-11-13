import { signOut } from '@react-native-firebase/auth';
import { StyleSheet, View } from 'react-native';

import { AppText, Button } from '@/components/ui';
import { auth } from '@/lib/firebase';
import { spacing, useTheme } from '@/theme';

// Phase 0 placeholder: proves sign-in persists. Replaced by the real home screen in Phase 3.
export default function HomeScreen() {
  const c = useTheme();
  return (
    <View style={[styles.root, { backgroundColor: c.background }]}>
      <AppText variant="title">Signed in</AppText>
      <AppText muted>{auth.currentUser?.email}</AppText>
      <Button title="Sign out" kind="secondary" onPress={() => signOut(auth)} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
});
