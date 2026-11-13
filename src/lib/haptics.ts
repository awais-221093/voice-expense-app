// Haptics never block or throw: feedback is nice-to-have.
import * as Haptics from 'expo-haptics';

const safe = (p: Promise<void>) => void p.catch(() => {});

export const haptics = {
  start: () => safe(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)),
  stop: () => safe(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  tick: () => safe(Haptics.selectionAsync()),
  success: () => safe(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  warning: () => safe(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
  error: () => safe(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)),
};
