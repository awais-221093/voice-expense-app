import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Toast, type ToastData } from '@/components/Toast';
import { AppText } from '@/components/ui';
import type { RecorderPhase } from '@/features/speech/useVoiceRecorder';
import { TAB_BAR_HEIGHT, radius, spacing, useTheme } from '@/theme';

interface Props {
  phase: RecorderPhase;
  mode: 'hold' | 'tap';
  liveText: string;
  toast: ToastData | null;
  onHideToast: () => void;
}

/** Floats just above the tab bar: the live transcript while listening, otherwise the toast. */
export function RecordingOverlay({ phase, mode, liveText, toast, onHideToast }: Props) {
  const c = useTheme();
  const insets = useSafeAreaInsets();
  const listening = phase !== 'idle';

  return (
    <View
      pointerEvents="box-none"
      style={[styles.wrap, { bottom: TAB_BAR_HEIGHT + insets.bottom + spacing.lg }]}>
      {listening ? (
        <Animated.View
          entering={FadeIn.duration(120)}
          exiting={FadeOut.duration(120)}
          style={[styles.card, { backgroundColor: c.surface, borderColor: c.primary }]}
          accessibilityLiveRegion="polite">
          <View style={styles.titleRow}>
            <View style={[styles.dot, { backgroundColor: c.danger }]} />
            <AppText variant="label" color={c.primary}>
              {phase === 'stopping' ? 'FINISHING…' : 'LISTENING'}
            </AppText>
          </View>
          <AppText variant={liveText ? 'title' : 'body'} muted={!liveText} numberOfLines={5}>
            {liveText || 'Say e.g. “100 for eggs from salary and 50 for bread”'}
          </AppText>
          <AppText variant="small" muted>
            {mode === 'hold' ? 'Release to save' : 'Tap the mic again or pause to save'}
          </AppText>
        </Animated.View>
      ) : (
        <Toast toast={toast} onHide={onHideToast} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0 },
  card: {
    marginHorizontal: spacing.lg,
    padding: spacing.xl,
    borderRadius: radius.lg,
    borderWidth: 2,
    gap: spacing.sm,
    elevation: 8,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  dot: { width: 8, height: 8, borderRadius: 4 },
});
