import type { ReactElement } from 'react';
import { SectionList, StyleSheet, View } from 'react-native';

import { EntryRow } from '@/components/EntryRow';
import { AppText } from '@/components/ui';
import type { Entry } from '@/features/entries/types';
import { useRecorder } from '@/features/recording/RecorderProvider';
import { formatPKR } from '@/lib/money';
import { formatDayHeading, localISODate } from '@/lib/time';
import { spacing } from '@/theme';

interface Section {
  title: string;
  spent: number;
  data: Entry[];
}

/** Entries grouped by local day, newest first, with the day's expense total in the header. */
export function EntryList({
  entries,
  header,
  footer,
  empty,
}: {
  entries: Entry[];
  header?: ReactElement;
  footer?: ReactElement;
  empty?: ReactElement;
}) {
  const { openSheet } = useRecorder();
  return (
    <SectionList
      sections={groupByDay(entries)}
      keyExtractor={(e) => e.id}
      contentContainerStyle={styles.list}
      stickySectionHeadersEnabled={false}
      keyboardShouldPersistTaps="handled"
      ItemSeparatorComponent={Separator}
      ListHeaderComponent={header}
      ListFooterComponent={footer}
      ListEmptyComponent={empty}
      renderSectionHeader={({ section }) => (
        <View style={styles.header} accessibilityRole="header">
          <AppText variant="label" muted>
            {section.title.toUpperCase()}
          </AppText>
          {section.spent > 0 && (
            <AppText variant="label" muted>
              {formatPKR(section.spent)}
            </AppText>
          )}
        </View>
      )}
      renderItem={({ item }) => (
        <EntryRow entry={item} onPress={() => openSheet({ kind: 'edit', entry: item })} />
      )}
    />
  );
}

function groupByDay(entries: Entry[]): Section[] {
  const sections: Section[] = [];
  let currentDay = '';
  for (const entry of entries) {
    const d = entry.spentAt.toDate();
    const day = localISODate(d);
    if (day !== currentDay) {
      currentDay = day;
      sections.push({ title: formatDayHeading(d), spent: 0, data: [] });
    }
    const s = sections[sections.length - 1];
    s.data.push(entry);
    if (entry.type === 'expense' && entry.amount) s.spent += entry.amount;
  }
  return sections;
}

const Separator = () => <View style={styles.separator} />;

const styles = StyleSheet.create({
  // Extra bottom space: the raised mic overlaps the bottom of the content.
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl * 2, flexGrow: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
    marginHorizontal: spacing.xs,
  },
  separator: { height: spacing.sm },
});
