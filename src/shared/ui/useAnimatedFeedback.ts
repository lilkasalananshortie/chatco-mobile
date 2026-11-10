import { useEffect, useRef, useState } from "react";
import { Animated, Easing } from "react-native";

export function useAnimatedToggle(active: boolean, duration = 200, disabled = false) {
  const value = useRef(new Animated.Value(active ? 1 : 0)).current;
  useEffect(() => {
    value.stopAnimation();
    if (disabled) {
      value.setValue(active ? 1 : 0);
      return;
    }
    const animation = Animated.timing(value, {
      toValue: active ? 1 : 0,
      duration,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [active, disabled, duration, value]);
  return value;
}

export function useAnimatedColor(color: string, duration = 200, disabled = false) {
  const progress = useRef(new Animated.Value(1)).current;
  const [endpoints, setEndpoints] = useState({ from: color, to: color });
  const previous = useRef(color);
  useEffect(() => {
    if (previous.current === color) return;
    const from = previous.current;
    previous.current = color;
    progress.stopAnimation();
    setEndpoints({ from, to: color });
    if (disabled) {
      progress.setValue(1);
      return;
    }
    progress.setValue(0);
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: false,
    });
    animation.start();
    return () => animation.stop();
  }, [color, disabled, duration, progress]);
  return progress.interpolate({ inputRange: [0, 1], outputRange: [endpoints.from, endpoints.to] });
}
