import { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Animated, Easing } from "react-native";

/** The web app's fade-in: opacity and a 10px upward move over 300ms. */
export function useReducedMotion() {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled().then(value => {
      if (mounted) setReduceMotion(value);
    }).catch(() => {});
    const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduceMotion);
    return () => { mounted = false; subscription.remove(); };
  }, []);

  return reduceMotion;
}

export function useWebEntrance(active: boolean, disabled = false, distance = 10, duration = 300, phase?: string) {
  const progress = useRef(new Animated.Value(active && !disabled ? 0 : 1)).current;
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    progress.stopAnimation();
    if (!active) {
      progress.setValue(0);
      return;
    }
    if (disabled || reduceMotion) {
      progress.setValue(1);
      return;
    }
    progress.setValue(0);
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [active, disabled, distance, duration, phase, progress, reduceMotion]);

  return {
    opacity: progress,
    transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [distance, 0] }) }],
  };
}
