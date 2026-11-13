import { router } from 'expo-router';
import { useSyncExternalStore } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText, Button } from '@/components/ui';
import { log } from '@/lib/debugLog';
import { spacing, useTheme } from '@/theme';

/** Hidden screen (long-press the gear): live app log for diagnosing issues without a backend. */
export default function DebugScreen() {
  const c = useTheme();
  // Snapshot must be referentially stable between changes, so subscribe to a version counter.
  useSyncExternalStore(log.subscribe, log.version);
  const lines = log.lines();
  const color = { info: c.textMuted, warn: c.review, error: c.danger };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: c.background }]}>
      <View style={styles.header}>
        <Button title="‹ Back" kind="ghost" onPress={() => router.back()} />
        <AppText variant="title">Debug log</AppText>
      </View>
      <FlatList
        data={lines}
        keyExtractor={(_, i) => String(i)}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <AppText variant="small" color={color[item.level]} selectable>
            {new Date(item.at).toLocaleTimeString()} {item.msg}
          </AppText>
        )}
        ListEmptyComponent={<AppText muted>No log lines yet.</AppText>}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  list: { padding: spacing.lg, gap: spacing.xs },
});
