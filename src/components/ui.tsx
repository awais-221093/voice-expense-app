// Small shared primitives so screens stay short. Everything is theme-aware.
import { Pressable, StyleSheet, Text, View, type TextProps, type ViewStyle } from 'react-native';

import { MIN_TOUCH, radius, spacing, type, useTheme } from '@/theme';

type TextVariant = keyof typeof type;

export function AppText({
  variant = 'body',
  muted,
  color,
  style,
  ...rest
}: TextProps & { variant?: TextVariant; muted?: boolean; color?: string }) {
  const c = useTheme();
  return (
    <Text style={[type[variant], { color: color ?? (muted ? c.textMuted : c.text) }, style]} {...rest} />
  );
}

export function Button({
  title,
  onPress,
  kind = 'primary',
  disabled,
  style,
  accessibilityHint,
}: {
  title: string;
  onPress: () => void;
  kind?: 'primary' | 'secondary' | 'danger' | 'ghost';
  disabled?: boolean;
  style?: ViewStyle;
  accessibilityHint?: string;
}) {
  const c = useTheme();
  const bg = { primary: c.primary, secondary: c.surfaceAlt, danger: c.surfaceAlt, ghost: 'transparent' }[kind];
  const fg = { primary: c.primaryText, secondary: c.text, danger: c.danger, ghost: c.primary }[kind];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: bg, opacity: disabled ? 0.5 : pressed ? 0.8 : 1 },
        style,
      ]}>
      <AppText variant="bodyStrong" color={fg}>
        {title}
      </AppText>
    </Pressable>
  );
}

export function Chip({
  label,
  selected,
  onPress,
  onLongPress,
  color,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  onLongPress?: () => void;
  color?: string;
}) {
  const c = useTheme();
  const body = (
    <View
      style={[
        styles.chip,
        { backgroundColor: selected ? c.primary : c.surfaceAlt, borderColor: color ?? 'transparent' },
      ]}>
      <AppText variant="small" color={selected ? c.primaryText : (color ?? c.text)}>
        {label}
      </AppText>
    </View>
  );
  if (!onPress && !onLongPress) return body;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      onLongPress={onLongPress}
      hitSlop={8}>
      {body}
    </Pressable>
  );
}

/** Single-choice row of chips (e.g. hold/tap, groq/openrouter). */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <View style={styles.row} accessibilityRole="radiogroup">
      {options.map((o) => (
        <Chip key={o.value} label={o.label} selected={o.value === value} onPress={() => onChange(o.value)} />
      ))}
    </View>
  );
}

export const styles = StyleSheet.create({
  button: {
    minHeight: MIN_TOUCH,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chip: {
    minHeight: 32,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    justifyContent: 'center',
  },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
