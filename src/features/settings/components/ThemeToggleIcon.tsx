import { useEffect, useRef } from "react";
import { Animated, Easing, Platform, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useReducedMotion } from "../../../shared/ui/useWebEntrance";

const SIZE = 20;
const layer = { position: "absolute", top: 0, left: 0 } as const;

/** The web toggle's moon/sun swap: rotate, scale, and fade over 300ms. */
export function ThemeToggleIcon({ isLight }: { isLight: boolean }) {
  const progress = useRef(new Animated.Value(isLight ? 1 : 0)).current;
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const toValue = isLight ? 1 : 0;
    if (reduceMotion) {
      progress.setValue(toValue);
      return;
    }
    const animation = Animated.timing(progress, {
      toValue,
      duration: 300,
      easing: Easing.out(Easing.quad),
      useNativeDriver: Platform.OS !== "web",
    });
    animation.start();
    return () => animation.stop();
  }, [isLight, progress, reduceMotion]);

  const range = (from: number, to: number) => progress.interpolate({ inputRange: [0, 1], outputRange: [from, to] });
  const turn = (from: string, to: string) => progress.interpolate({ inputRange: [0, 1], outputRange: [from, to] });

  return <View style={{ width: SIZE, height: SIZE }}>
    <Animated.View style={[layer, { opacity: range(1, 0), transform: [{ rotate: turn("0deg", "-90deg") }, { scale: range(1, 0.5) }] }]}>
      <Ionicons name="moon-outline" size={SIZE} color="#99C1F1" />
    </Animated.View>
    <Animated.View style={[layer, { opacity: range(0, 1), transform: [{ rotate: turn("90deg", "0deg") }, { scale: range(0.5, 1) }] }]}>
      <Ionicons name="sunny-outline" size={SIZE} color="#D97706" />
    </Animated.View>
  </View>;
}
