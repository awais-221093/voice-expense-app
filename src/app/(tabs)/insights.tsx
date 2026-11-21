import { useState, type ReactNode } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MonthSwitcher } from '@/components/MonthSwitcher';
import { AppText } from '@/components/ui';
import { useMonthEntries } from '@/features/entries/hooks';
import {
  monthInsights,
  previousSpend,
  relativeChange,
  type Share,
} from '@/features/entries/insights';
import { ENTRY_TYPES } from '@/features/llm/types';
import { auth } from '@/lib/firebase';
import { formatPKR } from '@/lib/money';
import { addMonths, startOfMonth } from '@/lib/time';
import { useNow } from '@/lib/useNow';
import { radius, spacing, useTheme } from '@/theme';

export default function InsightsScreen() {
  const uid = auth.currentUser?.uid;
  return uid ? <Insights uid={uid} /> : null;
}

/** Where the money went this month. Pure numbers + simple bars; no chart library. */
function Insights({ uid }: { uid: string }) {
  const c = useTheme();
  const now = useNow();
  const [month, setMonth] = useState(() => startOfMonth());
  const { data, loading } = useMonthEntries(uid, month);
  const ins = monthInsights(data, month, now);
  const net = ins.total.inflow - ins.total.outflow;

  const prevStart = addMonths(month, -1);
  const prevMonth = useMonthEntries(uid, prevStart);
  const prev = previousSpend(prevMonth.data, month, now);
  const change = prevMonth.loading ? null : relativeChange(ins.spent, prev.spent);
  const prevName = prevStart.toLocaleDateString('en-GB', { month: 'long' });

  return (
    <SafeAreaView edges={['top']} style={[styles.root, { backgroundColor: c.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <AppText variant="title">Insights</AppText>
        <MonthSwitcher month={month} onChange={setMonth} />

        {loading ? (
          <ActivityIndicator color={c.textMuted} style={styles.loading} />
        ) : (
          <>
            <View style={[styles.hero, { backgroundColor: c.primary }]}>
              <AppText variant="label" color={c.primaryText}>
                SPENT
              </AppText>
              <AppText variant="hero" color={c.primaryText} numberOfLines={1} adjustsFontSizeToFit>
                {formatPKR(ins.spent)}
              </AppText>
              <AppText color={c.primaryText}>
                {formatPKR(Math.round(ins.dailyAverage))} / day
              </AppText>
              {change !== null && (
                <AppText color={c.primaryText}>
                  {compareText(change, prevName, prev.sameDays)}
                </AppText>
              )}
            </View>

            <View style={styles.grid}>
              <Stat label="Money in" value={`+${formatPKR(ins.total.inflow)}`} color={c.inflow} />
              <Stat label="Money out" value={formatPKR(ins.total.outflow)} />
              <Stat
                label="Net"
                value={`${net >= 0 ? '+' : '−'}${formatPKR(Math.abs(net))}`}
                color={net >= 0 ? c.inflow : c.danger}
              />
            </View>

            {ins.needsReview > 0 && (
              <AppText color={c.review}>
                {ins.needsReview} {ins.needsReview === 1 ? 'entry needs' : 'entries need'} review —
                totals may be incomplete.
              </AppText>
            )}

            <Card title="Where it went">
              <Bars
                items={ins.byCategory}
                previous={prevMonth.loading ? undefined : prev.byCategory}
                empty="No expenses this month."
              />
            </Card>

            <Card title="Paid from">
              <Bars items={ins.bySource} empty="No expenses this month." />
            </Card>

            <Card title="By type">
              {ENTRY_TYPES.map((t) => {
                const f = ins.byType[t];
                if (!f.inflow && !f.outflow) return null;
                return (
                  <View key={t} style={styles.typeRow}>
                    <AppText style={styles.flex}>{t}</AppText>
                    {f.inflow > 0 && <AppText color={c.inflow}>+{formatPKR(f.inflow)}</AppText>}
                    {f.outflow > 0 && <AppText>{formatPKR(f.outflow)}</AppText>}
                  </View>
                );
              })}
            </Card>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  const c = useTheme();
  return (
    <View style={[styles.stat, { backgroundColor: c.surface }]}>
      <AppText variant="small" muted>
        {label}
      </AppText>
      <AppText variant="bodyStrong" color={color} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </AppText>
    </View>
  );
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  const c = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: c.surface }]}>
      <AppText variant="label" muted>
        {title.toUpperCase()}
      </AppText>
      {children}
    </View>
  );
}

/** "12% less than October (same days)" */
function compareText(change: number, prevName: string, sameDays: boolean): string {
  const pct = Math.round(Math.abs(change) * 100);
  const span = sameDays ? ' (same days)' : '';
  if (pct === 0) return `About the same as ${prevName}${span}`;
  return `${pct}% ${change < 0 ? 'less' : 'more'} than ${prevName}${span}`;
}

/** Horizontal share bars, largest first; with `previous`, a ▲/▼ change per label. */
function Bars({
  items,
  previous,
  empty,
}: {
  items: Share[];
  previous?: Map<string, number>;
  empty: string;
}) {
  const c = useTheme();
  if (!items.length) return <AppText muted>{empty}</AppText>;
  return items.map((s) => {
    const delta = previous ? s.amount - (previous.get(s.label) ?? 0) : 0;
    const deltaText = delta
      ? `${delta > 0 ? 'up' : 'down'} ${formatPKR(Math.abs(delta))} from last month`
      : '';
    return (
      <View
        key={s.label}
        style={styles.bar}
        accessible
        accessibilityLabel={`${s.label} ${formatPKR(s.amount)}, ${Math.round(s.share * 100)} percent${deltaText ? `, ${deltaText}` : ''}`}>
        <View style={styles.barLabels}>
          <AppText style={styles.flex}>{s.label}</AppText>
          {delta !== 0 && (
            // More spending is the warning direction; less is good news.
            <AppText variant="small" color={delta > 0 ? c.danger : c.inflow}>
              {delta > 0 ? '▲' : '▼'} {formatPKR(Math.abs(delta))}
            </AppText>
          )}
          <AppText variant="bodyStrong">{formatPKR(s.amount)}</AppText>
          <AppText variant="small" muted style={styles.pct}>
            {Math.round(s.share * 100)}%
          </AppText>
        </View>
        <View style={[styles.track, { backgroundColor: c.surfaceAlt }]}>
          <View
            style={[
              styles.fill,
              { backgroundColor: c.primary, width: `${Math.max(s.share * 100, 2)}%` },
            ]}
          />
        </View>
      </View>
    );
  });
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl * 2, gap: spacing.lg },
  loading: { marginTop: spacing.xxl },
  hero: { borderRadius: radius.lg, padding: spacing.xl, gap: spacing.xs },
  grid: { flexDirection: 'row', gap: spacing.sm },
  stat: { flex: 1, borderRadius: radius.md, padding: spacing.md, gap: 2 },
  card: { borderRadius: radius.md, padding: spacing.lg, gap: spacing.md },
  typeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  flex: { flex: 1 },
  bar: { gap: spacing.xs },
  barLabels: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm },
  pct: { width: 40, textAlign: 'right' },
  track: { height: 8, borderRadius: 4, overflow: 'hidden' },
  fill: { height: 8, borderRadius: 4 },
});
