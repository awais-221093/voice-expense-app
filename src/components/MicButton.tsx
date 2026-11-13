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

import { useRecorder } from '@/features/recording/RecorderProvider';
import { useTheme } from '@/theme';

export const MIC_SIZE = 64;

/** The raised centre button of the tab bar. Hold or tap per settings; works from every tab. */
export function MicButton() {
  const c = useTheme();
  const { phase, understanding, mode, start, release, stop } = useRecorder();
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
    opacity: 0.2 + pulse.value * 0.3,
    transform: [{ scale: 1 + pulse.value * 0.35 }],
  }));

  const handlers =
    mode === 'hold'
      ? { onPressIn: start, onPressOut: release }
      : { onPress: () => (listening ? stop() : phase === 'idle' && start()) };

  return (
    <View style={styles.wrap}>
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
        hitSlop={8}
        style={({ pressed }) => [
          styles.circle,
          {
            backgroundColor: listening ? c.danger : c.primary,
            borderColor: c.surface,
            transform: [{ scale: pressed || listening ? 1.08 : 1 }],
          },
        ]}>
        {phase === 'stopping' || understanding ? (
          <ActivityIndicator color={c.primaryText} />
        ) : (
          <MaterialCommunityIcons
            name={listening ? 'waveform' : 'microphone'}
            size={30}
            color={c.primaryText}
          />
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: MIC_SIZE + 16, alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute', width: MIC_SIZE, height: MIC_SIZE, borderRadius: MIC_SIZE / 2 },
  circle: {
    width: MIC_SIZE,
    height: MIC_SIZE,
    borderRadius: MIC_SIZE / 2,
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
  },
});
