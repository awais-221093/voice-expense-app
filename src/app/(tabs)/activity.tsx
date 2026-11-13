import { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EntryList } from '@/components/EntryList';
import { MonthSwitcher } from '@/components/MonthSwitcher';
import { AppText, Chip } from '@/components/ui';
import { useMonthEntries } from '@/features/entries/hooks';
import type { Entry } from '@/features/entries/types';
import { auth } from '@/lib/firebase';
import { formatPKR } from '@/lib/money';
import { startOfMonth } from '@/lib/time';
import { MIN_TOUCH, radius, spacing, useTheme } from '@/theme';

const FILTERS = {
  all: { label: 'All', match: () => true },
  spent: { label: 'Spent', match: (e: Entry) => e.type === 'expense' },
  in: { label: 'Money in', match: (e: Entry) => e.direction === 'inflow' },
  loan: { label: 'Loans', match: (e: Entry) => e.type === 'loan' },
  savings: { label: 'Savings', match: (e: Entry) => e.type === 'savings' },
  committee: { label: 'Committee', match: (e: Entry) => e.type === 'committee' },
  review: { label: 'Needs review', match: (e: Entry) => e.needsReview || e.amount === null },
} satisfies Record<string, { label: string; match: (e: Entry) => boolean }>;
type Filter = keyof typeof FILTERS;

export default function ActivityScreen() {
  const uid = auth.currentUser?.uid;
  return uid ? <Activity uid={uid} /> : null;
}

/** Full history, one month at a time, with type filters and search. */
function Activity({ uid }: { uid: string }) {
  const c = useTheme();
  const [month, setMonth] = useState(() => startOfMonth());
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const { data, loading, error } = useMonthEntries(uid, month);

  const q = search.trim().toLowerCase();
  const entries = data.filter(
    (e) =>
      FILTERS[filter].match(e) &&
      (!q || [e.description, e.source, e.category].some((v) => v?.toLowerCase().includes(q))),
  );
  const spent = entries.reduce((s, e) => (e.type === 'expense' && e.amount ? s + e.amount : s), 0);

  const header = (
    <View style={styles.header}>
      <AppText variant="title">Activity</AppText>
      <MonthSwitcher month={month} onChange={setMonth} />
      <TextInput
        style={[
          styles.search,
          { backgroundColor: c.surface, color: c.text, borderColor: c.border },
        ]}
        value={search}
        onChangeText={setSearch}
        placeholder="Search description, source, category"
        placeholderTextColor={c.textMuted}
        autoCapitalize="none"
        returnKeyType="search"
        accessibilityLabel="Search entries"
      />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chips}>
        {(Object.keys(FILTERS) as Filter[]).map((f) => (
          <Chip
            key={f}
            label={FILTERS[f].label}
            selected={filter === f}
            onPress={() => setFilter(f)}
          />
        ))}
      </ScrollView>
      {!loading && (
        <AppText variant="small" muted>
          {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
          {spent > 0 ? ` · spent ${formatPKR(spent)}` : ''}
        </AppText>
      )}
    </View>
  );

  const empty = loading ? (
    <ActivityIndicator style={styles.empty} color={c.textMuted} />
  ) : (
    <AppText muted style={styles.empty}>
      {error ? `Could not load: ${error}` : 'Nothing here for this month.'}
    </AppText>
  );

  return (
    <SafeAreaView edges={['top']} style={[styles.root, { backgroundColor: c.background }]}>
      <EntryList entries={entries} header={header} empty={empty} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { gap: spacing.md, paddingTop: spacing.md },
  search: {
    minHeight: MIN_TOUCH,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.lg,
    fontSize: 16,
  },
  chips: { gap: spacing.sm },
  empty: { textAlign: 'center', padding: spacing.xxl },
});
