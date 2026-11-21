import { useEffect, useRef, useState } from "react";
import { Animated, Easing, Platform } from "react-native";
import { useReducedMotion } from "../../shared/ui/useWebEntrance";
import { createThemeFade } from "./theme-fade";

/** Drives the full-screen veil that hides the color swap when the theme changes. */
export function useThemeFade(isLight: boolean, setIsLight: (value: boolean) => void, isLowFidelity: boolean) {
  const opacity = useRef(new Animated.Value(0)).current;
  const [veilIsLight, setVeilIsLight] = useState(isLight);
  const [commits, setCommits] = useState(0);
  const onPainted = useRef<(() => void) | null>(null);
  const reduceMotion = useReducedMotion();
  const instant = useRef(false);
  instant.current = reduceMotion || isLowFidelity;

  const [fade] = useState(() => createThemeFade(isLight, {
    isInstant: () => instant.current,
    prepare: setVeilIsLight,
    fade: (toValue, duration, done) => {
      Animated.timing(opacity, {
        toValue,
        duration,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: Platform.OS !== "web",
      }).start(() => done());
    },
    apply: (value, painted) => {
      onPainted.current = painted;
      setIsLight(value);
      setCommits(count => count + 1);
    },
  }));

  useEffect(() => { fade.sync(isLight); }, [fade, isLight]);

  // Keep the veil up until React has committed the new colors, so slower
  // phones never show the old screen changing underneath it.
  useEffect(() => {
    if (commits === 0) return;
    const frame = requestAnimationFrame(() => {
      const painted = onPainted.current;
      onPainted.current = null;
      painted?.();
    });
    return () => cancelAnimationFrame(frame);
  }, [commits]);

  return { switchTo: fade.switchTo, veilOpacity: opacity, veilIsLight };
}
