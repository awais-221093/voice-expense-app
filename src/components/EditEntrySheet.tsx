import { Timestamp, getDoc } from '@react-native-firebase/firestore';
import { useState, type ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { AppText, Button, Chip, Segmented } from '@/components/ui';
import type { Command } from '@/features/commands/types';
import type { Entry, EntryFields } from '@/features/entries/types';
import { ENTRY_TYPES, type EntryType } from '@/features/llm/types';
import { useSettings } from '@/features/settings/store';
import { paths } from '@/lib/firebase';
import { formatDayHeading } from '@/lib/time';
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
          spentAt: target.command.createdAt,
        };

  const [type, setType] = useState<EntryType>(initial.type);
  const [direction, setDirection] = useState(initial.direction);
  const [amount, setAmount] = useState(initial.amount?.toString() ?? '');
  const [description, setDescription] = useState(initial.description ?? '');
  const [source, setSource] = useState(initial.source ?? '');
  const [category, setCategory] = useState(initial.category ?? 'other');
  const [spentAt, setSpentAt] = useState(initial.spentAt.toDate());
  const [said, setSaid] = useState<string | null>(target.kind === 'manual' ? target.command.transcript : null);

  const parsedAmount = Number(amount.replace(/,/g, ''));
  const amountValid = amount === '' || (Number.isFinite(parsedAmount) && parsedAmount > 0);

  async function showSaid() {
    if (target.kind !== 'edit' || !target.entry.commandId) return;
    const snap = await getDoc(paths.command(uid, target.entry.commandId));
    setSaid((snap.data() as Command | undefined)?.transcript ?? '(not found)');
  }

  function save() {
    onSave({
      type,
      direction: type === 'expense' ? 'outflow' : direction,
      amount: amount === '' ? null : parsedAmount,
      description: description.trim() || null,
      source: source.trim().toLowerCase() || null,
      category,
      spentAt: Timestamp.fromDate(spentAt),
    });
    onClose();
  }

  const input = [styles.input, { backgroundColor: c.surfaceAlt, color: c.text }];

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={[styles.backdrop, { backgroundColor: c.overlay }]} onPress={onClose} accessibilityLabel="Close" />
      <KeyboardAvoidingView behavior="height" style={[styles.sheet, { backgroundColor: c.surface }]}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <AppText variant="title">{target.kind === 'edit' ? 'Edit entry' : 'Fix manually'}</AppText>

          <Field label="Type">
            <Segmented value={type} onChange={setType} options={ENTRY_TYPES.map((t) => ({ value: t, label: t }))} />
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

          <Field label="Description">
            <TextInput style={input} value={description} onChangeText={setDescription} accessibilityLabel="Description" />
          </Field>

          <Field label="Source">
            <View style={styles.chips}>
              {knownSources.map((s) => (
                <Chip key={s} label={s} selected={source === s} onPress={() => setSource(source === s ? '' : s)} />
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
                <Chip key={cat} label={cat} selected={category === cat} onPress={() => setCategory(cat)} />
              ))}
            </View>
          </Field>

          <Field label="Date">
            <View style={styles.dateRow}>
              <Button title="‹" kind="secondary" onPress={() => setSpentAt(new Date(spentAt.getTime() - DAY_MS))} accessibilityHint="Previous day" />
              <AppText variant="bodyStrong" style={styles.dateText}>
                {formatDayHeading(spentAt)}
              </AppText>
              <Button
                title="›"
                kind="secondary"
                disabled={spentAt.getTime() + DAY_MS > Date.now()}
                onPress={() => setSpentAt(new Date(spentAt.getTime() + DAY_MS))}
                accessibilityHint="Next day"
              />
            </View>
          </Field>

          {said !== null ? (
            <AppText muted style={styles.said}>“{said}”</AppText>
          ) : (
            target.kind === 'edit' &&
            target.entry.commandId && <Button title="Show what I said" kind="ghost" onPress={showSaid} />
          )}

          <View style={styles.actions}>
            <Button title="Save" onPress={save} disabled={!amountValid} />
            {onDelete && (
              <Button
                title="Delete"
                kind="danger"
                onPress={() => {
                  onDelete();
                  onClose();
                }}
              />
            )}
          </View>
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
  backdrop: { ...StyleSheet.absoluteFillObject },
  sheet: { marginTop: 'auto', maxHeight: '90%', borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg },
  content: { padding: spacing.xl, gap: spacing.lg },
  field: { gap: spacing.sm },
  input: { minHeight: MIN_TOUCH, borderRadius: radius.md, paddingHorizontal: spacing.lg, fontSize: 16 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  dateText: { flex: 1, textAlign: 'center' },
  said: { fontStyle: 'italic' },
  actions: { gap: spacing.md, marginTop: spacing.sm },
});
