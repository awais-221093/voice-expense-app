import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { AppText } from '@/components/ui';
import type { RecorderPhase } from '@/features/speech/useVoiceRecorder';
import { spacing, useTheme } from '@/theme';

const SIZE = 112;

interface Props {
  mode: 'hold' | 'tap';
  phase: RecorderPhase;
  /** LLM is working on the last command. Recording is still allowed. */
  understanding: boolean;
  onStart: () => void;
  onRelease: () => void;
  onStop: () => void;
}

export function MicButton({ mode, phase, understanding, onStart, onRelease, onStop }: Props) {
  const c = useTheme();
  const reduceMotion = useReducedMotion();
  const pulse = useSharedValue(0);
  const listening = phase === 'listening';

  useEffect(() => {
    if (listening && !reduceMotion) {
      pulse.value = withRepeat(withTiming(1, { duration: 900 }), -1, true);
    } else {
      cancelAnimation(pulse);
      pulse.value = withTiming(0, { duration: 150 });
    }
  }, [listening, reduceMotion, pulse]);

  const ring = useAnimatedStyle(() => ({
    opacity: 0.25 + pulse.value * 0.25,
    transform: [{ scale: 1 + pulse.value * 0.18 }],
  }));

  const label = listening
    ? 'Listening…'
    : phase === 'stopping' || understanding
      ? 'Understanding…'
      : mode === 'hold'
        ? 'Hold to talk'
        : 'Tap to talk';

  const handlers =
    mode === 'hold'
      ? { onPressIn: onStart, onPressOut: onRelease }
      : { onPress: () => (listening ? onStop() : phase === 'idle' && onStart()) };

  return (
    <View style={styles.wrap}>
      <View style={styles.circleWrap}>
        <Animated.View style={[styles.ring, { backgroundColor: c.primary }, ring]} />
        <Pressable
          {...handlers}
          accessibilityRole="button"
          accessibilityLabel={
            listening ? 'Recording. Release or tap to finish' : 'Record a money note'
          }
          accessibilityHint={
            mode === 'hold'
              ? 'Double tap and hold, say for example: 100 rupees for eggs from salary, then release'
              : 'Double tap, speak, and tap again or pause to finish'
          }
          accessibilityState={{ busy: understanding }}
          style={({ pressed }) => [
            styles.circle,
            { backgroundColor: c.primary, transform: [{ scale: pressed || listening ? 0.96 : 1 }] },
          ]}>
          {phase === 'stopping' ? (
            <ActivityIndicator color={c.primaryText} size="large" />
          ) : (
            <MaterialCommunityIcons
              name={listening ? 'waveform' : 'microphone'}
              size={48}
              color={c.primaryText}
            />
          )}
        </Pressable>
      </View>
      <AppText variant="label" muted accessibilityLiveRegion="polite">
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: spacing.sm },
  circleWrap: {
    width: SIZE * 1.3,
    height: SIZE * 1.3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: { position: 'absolute', width: SIZE, height: SIZE, borderRadius: SIZE / 2 },
  circle: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
  },
});
