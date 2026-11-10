import { useEffect, useRef, useState, type ReactNode } from "react";
import { AccessibilityInfo, Animated, Easing, View } from "react-native";
import { useAppTheme } from "../../../core/theme/ThemeProvider";

/** Remounted for each selection step to match the web fade and 10px rise. */
export function SelectionFade({ children }: { children: ReactNode }) {
  const { isLowFidelity } = useAppTheme();
  const [reduceMotion, setReduceMotion] = useState(false);
  const skipAnimation = isLowFidelity || reduceMotion;
  const opacity = useRef(new Animated.Value(isLowFidelity ? 1 : 0)).current;

  useEffect(() => {
    let mounted = true;
    const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduceMotion);
    void AccessibilityInfo.isReduceMotionEnabled().then(value => {
      if (mounted) setReduceMotion(value);
    }).catch(() => {});
    return () => { mounted = false; subscription.remove(); };
  }, []);

  useEffect(() => {
    if (skipAnimation) {
      opacity.setValue(1);
      return;
    }
    opacity.setValue(0);
    const animation = Animated.timing(opacity, {
      toValue: 1,
      duration: 300,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [skipAnimation, opacity]);

  if (skipAnimation) return <View style={{ flex: 1, minHeight: 0 }}>{children}</View>;
  return <Animated.View style={{
    flex: 1,
    minHeight: 0,
    opacity,
    transform: [{ translateY: opacity.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }],
  }}>{children}</Animated.View>;
}
