import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Timestamp, getDoc } from '@react-native-firebase/firestore';
import { useState, type ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { AppText, Button, Chip, Segmented } from '@/components/ui';
import type { Command } from '@/features/commands/types';
import type { Entry, EntryFields } from '@/features/entries/types';
import { ENTRY_TYPES, type EntryType } from '@/features/llm/types';
import { useSettings } from '@/features/settings/store';
import { paths } from '@/lib/firebase';
import { formatDayHeading, localISODate } from '@/lib/time';
import { MIN_TOUCH, radius, spacing, useTheme } from '@/theme';

export type SheetTarget = { kind: 'edit'; entry: Entry } | { kind: 'manual'; command: Command };

interface Props {
  uid: string;
  target: SheetTarget;
  onSave: (fields: EntryFields) => void;
  onDelete?: () => void;
  onClose: () => void;
}

const DAY_MS = 86_400_000;
const QUICK_DAYS = [
  { label: 'Today', daysAgo: 0 },
  { label: 'Yesterday', daysAgo: 1 },
];

/** Edit an entry, or create one by hand from a failed command (plan §6.4). Mount with a `key` per target. */
export function EditEntrySheet({ uid, target, onSave, onDelete, onClose }: Props) {
  const c = useTheme();
  const { knownSources, categories } = useSettings((s) => s.settings);
  const initial: EntryFields =
    target.kind === 'edit'
      ? target.entry
      : {
          type: 'expense',
          direction: 'outflow',
          amount: null,
          description: target.command.transcript,
          source: null,
          category: 'other',
          person: null,
          spentAt: target.command.createdAt,
        };

  const [type, setType] = useState<EntryType>(initial.type);
  const [direction, setDirection] = useState(initial.direction);
  const [amount, setAmount] = useState(initial.amount?.toString() ?? '');
  const [description, setDescription] = useState(initial.description ?? '');
  const [source, setSource] = useState(initial.source ?? '');
  const [category, setCategory] = useState(initial.category ?? 'other');
  const [person, setPerson] = useState(initial.person ?? '');
  const [spentAt, setSpentAt] = useState(initial.spentAt.toDate());
  const [said, setSaid] = useState<string | null>(
    target.kind === 'manual' ? target.command.transcript : null,
  );
  // Captured once when the sheet opens; render must stay pure (no Date.now() in JSX).
  const [openedAt] = useState(() => Date.now());

  /** Same clock time on the day `daysAgo` before the sheet opened, but never in the future. */
  const onDay = (daysAgo: number) => {
    const d = new Date(openedAt - daysAgo * DAY_MS);
    const t = new Date(
      d.getFullYear(),
      d.getMonth(),
      d.getDate(),
      spentAt.getHours(),
      spentAt.getMinutes(),
    );
    return new Date(Math.min(t.getTime(), openedAt));
  };

  const parsedAmount = Number(amount.replace(/,/g, ''));
  const amountValid = amount === '' || (Number.isFinite(parsedAmount) && parsedAmount > 0);

  async function showSaid() {
    if (target.kind !== 'edit' || !target.entry.commandId) return;
    try {
      const snap = await getDoc(paths.command(uid, target.entry.commandId));
      setSaid((snap.data() as Command | undefined)?.transcript ?? '(not found)');
    } catch {
      // Offline and the command isn't in the local cache.
      setSaid('(not available offline)');
    }
  }

  function save() {
    onSave({
      type,
      direction: type === 'expense' ? 'outflow' : direction,
      amount: amount === '' ? null : parsedAmount,
      description: description.trim() || null,
      source: source.trim().toLowerCase() || null,
      category,
      person: type === 'loan' ? person.trim().toLowerCase() || null : null,
      spentAt: Timestamp.fromDate(spentAt),
    });
    onClose();
  }

  const input = [styles.input, { backgroundColor: c.surfaceAlt, color: c.text }];

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <Pressable
        style={[styles.backdrop, { backgroundColor: c.overlay }]}
        onPress={onClose}
        accessibilityLabel="Close"
      />
      <KeyboardAvoidingView
        behavior="height"
        style={[styles.sheet, { backgroundColor: c.surface }]}>
        {/* Fixed above the scroll area so Close and Save stay reachable when the keyboard is up. */}
        <View style={[styles.headerRow, { borderBottomColor: c.border }]}>
          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close without saving"
            style={styles.close}>
            <MaterialCommunityIcons name="close" size={24} color={c.text} />
          </Pressable>
          <AppText variant="title" style={styles.flex} accessibilityRole="header">
            {target.kind === 'edit' ? 'Edit entry' : 'Fix manually'}
          </AppText>
          <Button title="Save" onPress={save} disabled={!amountValid} />
        </View>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Field label="Type">
            <Segmented
              value={type}
              onChange={setType}
              options={ENTRY_TYPES.map((t) => ({ value: t, label: t }))}
            />
          </Field>

          {type !== 'expense' && (
            <Field label="Direction">
              <Segmented
                value={direction}
                onChange={setDirection}
                options={[
                  { value: 'outflow', label: 'Money out' },
                  { value: 'inflow', label: 'Money in' },
                ]}
              />
            </Field>
          )}

          <Field label="Amount (PKR)">
            <TextInput
              style={[input, !amountValid && { borderColor: c.danger, borderWidth: 1 }]}
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              placeholder="e.g. 100"
              placeholderTextColor={c.textMuted}
              accessibilityLabel="Amount in rupees"
            />
          </Field>

          {type === 'loan' && (
            <Field label="Person">
              <TextInput
                style={input}
                value={person}
                onChangeText={setPerson}
                placeholder="who gave or got the loan, e.g. ali"
                placeholderTextColor={c.textMuted}
                autoCapitalize="none"
                accessibilityLabel="Person"
              />
            </Field>
          )}

          <Field label="Description">
            <TextInput
              style={input}
              value={description}
              onChangeText={setDescription}
              accessibilityLabel="Description"
            />
          </Field>

          <Field label="Source">
            <View style={styles.chips}>
              {knownSources.map((s) => (
                <Chip
                  key={s}
                  label={s}
                  selected={source === s}
                  onPress={() => setSource(source === s ? '' : s)}
                />
              ))}
            </View>
            <TextInput
              style={input}
              value={source}
              onChangeText={setSource}
              placeholder="or type a source"
              placeholderTextColor={c.textMuted}
              autoCapitalize="none"
              accessibilityLabel="Source"
            />
          </Field>

          <Field label="Category">
            <View style={styles.chips}>
              {categories.map((cat) => (
                <Chip
                  key={cat}
                  label={cat}
                  selected={category === cat}
                  onPress={() => setCategory(cat)}
                />
              ))}
            </View>
          </Field>

          <Field label="Date">
            <View style={styles.dateRow}>
              <Button
                title="‹"
                kind="secondary"
                onPress={() => setSpentAt(new Date(spentAt.getTime() - DAY_MS))}
                accessibilityHint="Previous day"
              />
              <AppText variant="bodyStrong" style={styles.dateText}>
                {formatDayHeading(spentAt)}
              </AppText>
              <Button
                title="›"
                kind="secondary"
                disabled={spentAt.getTime() + DAY_MS > openedAt}
                onPress={() => setSpentAt(new Date(spentAt.getTime() + DAY_MS))}
                accessibilityHint="Next day"
              />
            </View>
            <View style={styles.chips}>
              {QUICK_DAYS.map(({ label, daysAgo }) => (
                <Chip
                  key={label}
                  label={label}
                  selected={
                    localISODate(spentAt) === localISODate(new Date(openedAt - daysAgo * DAY_MS))
                  }
                  onPress={() => setSpentAt(onDay(daysAgo))}
                />
              ))}
            </View>
          </Field>

          {said !== null ? (
            <AppText muted style={styles.said}>
              “{said}”
            </AppText>
          ) : (
            target.kind === 'edit' &&
            target.entry.commandId && (
              <Button title="Show what I said" kind="ghost" onPress={showSaid} />
            )
          )}

          {onDelete && (
            <View style={styles.actions}>
              <Button
                title="Delete"
                kind="danger"
                onPress={() => {
                  onDelete();
                  onClose();
                }}
              />
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={styles.field}>
      <AppText variant="label" muted>
        {label.toUpperCase()}
      </AppText>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFill },
  sheet: {
    marginTop: 'auto',
    maxHeight: '90%',
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  close: { width: MIN_TOUCH, height: MIN_TOUCH, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1 },
  content: { padding: spacing.xl, gap: spacing.lg },
  field: { gap: spacing.sm },
  input: {
    minHeight: MIN_TOUCH,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    fontSize: 16,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  dateText: { flex: 1, textAlign: 'center' },
  said: { fontStyle: 'italic' },
  actions: { gap: spacing.md, marginTop: spacing.sm },
});
