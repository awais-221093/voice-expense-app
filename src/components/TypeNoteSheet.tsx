import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { AppText, Button } from '@/components/ui';
import { MIN_TOUCH, radius, spacing, useTheme } from '@/theme';

/**
 * Type a money note instead of speaking it (quiet office, noisy road, a name STT keeps mishearing).
 * The text goes through the same command → LLM pipeline as a spoken note.
 */
export function TypeNoteSheet({
  onSubmit,
  onClose,
}: {
  onSubmit: (text: string) => void;
  onClose: () => void;
}) {
  const c = useTheme();
  const [text, setText] = useState('');
  const note = text.trim();
  const submit = () => {
    if (!note) return;
    onSubmit(note);
    onClose();
  };

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
        <View style={styles.header}>
          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close without saving"
            style={styles.close}>
            <MaterialCommunityIcons name="close" size={24} color={c.text} />
          </Pressable>
          <AppText variant="title" style={styles.flex} accessibilityRole="header">
            Type a note
          </AppText>
          <Button title="Save" onPress={submit} disabled={!note} />
        </View>
        <TextInput
          style={[styles.input, { backgroundColor: c.surfaceAlt, color: c.text }]}
          value={text}
          onChangeText={setText}
          placeholder="e.g. 100 for eggs from salary and 50 for bread"
          placeholderTextColor={c.textMuted}
          multiline
          autoFocus
          maxLength={500}
          submitBehavior="submit"
          returnKeyType="done"
          onSubmitEditing={submit}
          accessibilityLabel="Money note"
        />
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFill },
  sheet: {
    marginTop: 'auto',
    padding: spacing.lg,
    gap: spacing.md,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  close: { width: MIN_TOUCH, height: MIN_TOUCH, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1 },
  input: {
    minHeight: 96,
    borderRadius: radius.md,
    padding: spacing.lg,
    fontSize: 16,
    textAlignVertical: 'top',
  },
});
