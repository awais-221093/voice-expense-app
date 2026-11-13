import { Tabs } from 'expo-router/js-tabs';
import { StyleSheet, View } from 'react-native';

import { AppTabBar } from '@/components/AppTabBar';
import { RecorderProvider } from '@/features/recording/RecorderProvider';
import { auth } from '@/lib/firebase';

/** Home · Activity · [mic] · Insights · Profile. Recording lives above the tabs (RecorderProvider). */
export default function TabsLayout() {
  const uid = auth.currentUser?.uid;
  if (!uid) return null; // the auth gate swaps this out right after sign-out

  return (
    <View style={styles.root}>
      <RecorderProvider uid={uid}>
        <Tabs tabBar={(props) => <AppTabBar {...props} />} screenOptions={{ headerShown: false }}>
          <Tabs.Screen name="index" />
          <Tabs.Screen name="activity" />
          <Tabs.Screen name="insights" />
          <Tabs.Screen name="profile" />
        </Tabs>
      </RecorderProvider>
    </View>
  );
}

const styles = StyleSheet.create({ root: { flex: 1 } });
