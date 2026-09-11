import { useMemo, useRef, useState } from "react";
import { Animated, PanResponder, StyleSheet, Text, View, type LayoutChangeEvent } from "react-native";
import { useAppTheme } from "../../core/theme/ThemeProvider";
import { appHaptics } from "../../core/utils/haptics";

type SlideToConfirmProps = {
  label: string;
  onComplete: () => void | Promise<void>;
  disabled?: boolean;
};

const KNOB_SIZE = 48;
const TRACK_PADDING = 4;

/** Native equivalent of the web conductor's drag-to-confirm action. */
export function SlideToConfirm({ label, onComplete, disabled = false }: SlideToConfirmProps) {
  const { colors, isLofi } = useAppTheme();
  const [trackWidth, setTrackWidth] = useState(0);
  const dragX = useRef(new Animated.Value(0)).current;
  const dragValue = useRef(0);
  const startValue = useRef(0);
  const completing = useRef(false);
  const maxDrag = Math.max(trackWidth - KNOB_SIZE - TRACK_PADDING * 2, 1);

  const reset = () => {
    dragValue.current = 0;
    Animated.spring(dragX, { toValue: 0, useNativeDriver: true, bounciness: 5 }).start();
  };

  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => !disabled && !completing.current,
    onMoveShouldSetPanResponder: (_, gesture) => !disabled && !completing.current && Math.abs(gesture.dx) > Math.abs(gesture.dy),
    onPanResponderGrant: () => {
      appHaptics.selection();
      startValue.current = dragValue.current;
    },
    onPanResponderMove: (_, gesture) => {
      const next = Math.min(Math.max(startValue.current + gesture.dx, 0), maxDrag);
      dragValue.current = next;
      dragX.setValue(next);
    },
    onPanResponderRelease: () => {
      if (completing.current) return;
      if (dragValue.current / maxDrag >= 0.82) {
        completing.current = true;
        dragValue.current = maxDrag;
        appHaptics.success();
        Animated.timing(dragX, { toValue: maxDrag, duration: 140, useNativeDriver: true }).start(() => {
          void (async () => {
            try {
              await onComplete();
            } finally {
              completing.current = false;
              reset();
            }
          })();
        });
      } else {
        reset();
      }
    },
    onPanResponderTerminate: reset,
  }), [disabled, maxDrag, onComplete]);

  const onLayout = (event: LayoutChangeEvent) => setTrackWidth(event.nativeEvent.layout.width);
  const progressWidth = dragX.interpolate({ inputRange: [0, maxDrag], outputRange: [0, Math.max(trackWidth - TRACK_PADDING * 2, 0)], extrapolate: "clamp" });

  return (
    <View
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      onLayout={onLayout}
      style={[
        styles.track,
        {
          backgroundColor: colors.surface2,
          borderColor: colors.border,
          borderRadius: isLofi ? 4 : 30,
          borderWidth: isLofi ? 1.5 : 1,
        },
        disabled && styles.disabled,
      ]}
      {...panResponder.panHandlers}
    >
      <Animated.View
        style={[
          styles.progress,
          {
            backgroundColor: colors.primary,
            width: progressWidth,
            borderRadius: isLofi ? 2 : 26,
          },
        ]}
      />
      <Text style={[styles.label, { color: colors.muted }]}>{disabled ? "Updating…" : label}</Text>
      <Animated.View
        style={[
          styles.knob,
          {
            backgroundColor: colors.primaryLight,
            borderRadius: isLofi ? 3 : KNOB_SIZE / 2,
            transform: [{ translateX: dragX }],
          },
        ]}
      >
        <Text style={styles.arrow}>›</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  track: { height: KNOB_SIZE + TRACK_PADDING * 2, borderRadius: 30, borderWidth: 1, justifyContent: "center", overflow: "hidden", marginTop: 14 },
  progress: { position: "absolute", left: TRACK_PADDING, top: TRACK_PADDING, bottom: TRACK_PADDING, borderRadius: 26 },
  knob: { position: "absolute", left: TRACK_PADDING, top: TRACK_PADDING, width: KNOB_SIZE, height: KNOB_SIZE, borderRadius: KNOB_SIZE / 2, alignItems: "center", justifyContent: "center" },
  arrow: { color: "#fff", fontSize: 31, lineHeight: 34, fontWeight: "300" },
  label: { textAlign: "center", fontWeight: "800", fontSize: 13 },
  disabled: { opacity: 0.55 },
});
