import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

/**
 * Thin wrapper around Expo Haptics with web-safe no-ops.
 * Call hapticLight() for selections, hapticMedium() for destructive actions,
 * hapticSuccess() for completed actions. On web, these are no-ops.
 * Each call is also try-caught so a missing native module (e.g. on Android
 * before a full rebuild) never crashes the app.
 */
export function hapticLight(): void {
  if (Platform.OS === 'web') return;
  try {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } catch { /* native module not linked — safe to skip */ }
}

export function hapticMedium(): void {
  if (Platform.OS === 'web') return;
  try {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  } catch { /* native module not linked — safe to skip */ }
}

export function hapticSuccess(): void {
  if (Platform.OS === 'web') return;
  try {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  } catch { /* native module not linked — safe to skip */ }
}

export function hapticWarning(): void {
  if (Platform.OS === 'web') return;
  try {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  } catch { /* native module not linked — safe to skip */ }
}
