import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useAuth } from '@/features/auth/useAuth';
import { useOpenCommands } from '@/features/commands/hooks';
import { useProcessingQueue } from '@/features/commands/queue';
import { startSettingsSync } from '@/features/settings/store';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const scheme = useColorScheme();
  const { user, initializing } = useAuth();

  useEffect(() => {
    if (!initializing) SplashScreen.hideAsync();
  }, [initializing]);

  // Keep the splash up until Firebase restores the session, so sign-in never flashes.
  if (initializing) return null;

  return (
    <SafeAreaProvider>
      <ThemeProvider value={scheme === 'dark' ? DarkTheme : DefaultTheme}>
        {user && <AppRuntime key={user.uid} uid={user.uid} />}
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Protected guard={!!user}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="speech-setup" options={{ presentation: 'modal' }} />
            <Stack.Screen name="debug" options={{ animation: 'slide_from_right' }} />
          </Stack.Protected>
          <Stack.Protected guard={!user}>
            <Stack.Screen name="sign-in" />
          </Stack.Protected>
        </Stack>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

/** Background work while signed in, independent of which screen is open. Renders nothing. */
function AppRuntime({ uid }: { uid: string }) {
  useEffect(() => startSettingsSync(uid), [uid]);
  const open = useOpenCommands(uid);
  useProcessingQueue(uid, open.data);
  return null;
}
