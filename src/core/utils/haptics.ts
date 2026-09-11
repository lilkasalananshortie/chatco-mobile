import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

export const appHaptics = {
  /**
   * Light impact - for stop selection, tab changes, button taps.
   */
  light() {
    if (Platform.OS !== "web") {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    }
  },

  /**
   * Medium impact - for stepper (+ / -) counters, payment method switching.
   */
  medium() {
    if (Platform.OS !== "web") {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
    }
  },

  /**
   * Success notification vibration - for successful ticket issuance or payment recording.
   */
  success() {
    if (Platform.OS !== "web") {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    }
  },

  /**
   * Error notification vibration - for payment failure, invalid code, or warning.
   */
  error() {
    if (Platform.OS !== "web") {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => undefined);
    }
  },

  /**
   * Selection tick - for slider or picker wheel movements.
   */
  selection() {
    if (Platform.OS !== "web") {
      void Haptics.selectionAsync().catch(() => undefined);
    }
  },
};
