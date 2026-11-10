import { useMemo, useRef, useState } from "react";
import { ActivityIndicator, Animated, PanResponder, StyleSheet, View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from "react-native";
import { Text } from "./BrandText";
import { ConductorIcon } from "./ConductorIcon";
import { useAppTheme } from "../../core/theme/ThemeProvider";
import { appHaptics } from "../../core/utils/haptics";
import { useAnimatedToggle } from "./useAnimatedFeedback";
import { useReducedMotion } from "./useWebEntrance";

type SlideToConfirmProps = {
  label: string;
  onComplete: () => void | boolean | Promise<void | boolean>;
  disabled?: boolean;
  trackColor?: string;
  handleColor?: string;
  textColor?: string;
  rounded?: boolean;
  reverse?: boolean;
  expandHandle?: boolean;
  commitRatio?: number;
  activationFeedback?: boolean;
  disabledLabel?: string;
  successLabel?: string;
  successColor?: string;
  successTextColor?: string;
  onSuccess?: () => void;
  uppercaseLabel?: boolean;
  labelFontSize?: number;
  labelFontWeight?: "500" | "600" | "700" | "800";
  handleContentColor?: string;
  style?: StyleProp<ViewStyle>;
};

const KNOB_SIZE = 48;
const TRACK_PADDING = 4;

/** Native equivalent of the web conductor's drag-to-confirm action. */
export function SlideToConfirm({ label, onComplete, disabled = false, trackColor, handleColor, textColor, rounded = false, reverse = false, expandHandle = false, commitRatio = 0.82, activationFeedback = false, disabledLabel = "Updating…", successLabel, successColor, successTextColor, onSuccess, uppercaseLabel = rounded, labelFontSize, labelFontWeight, handleContentColor = "#FFFFFF", style }: SlideToConfirmProps) {
  const { colors, isLofi , isLowFidelity } = useAppTheme();
  const reduceMotion = useReducedMotion();
  // Animate the capsule width without scaling its rounded ends.
  const useNativeDriver = false;
  const [trackWidth, setTrackWidth] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [activationReady, setActivationReady] = useState(false);
  const activation = useAnimatedToggle(activationReady, 200, isLowFidelity || reduceMotion);
  const activationTrack = activation.interpolate({ inputRange: [0, 1], outputRange: [trackColor ?? colors.surface2, isLofi ? "#DBEAFE" : "rgba(16,185,129,0.15)"] });
  const activationBorder = activation.interpolate({ inputRange: [0, 1], outputRange: [colors.border, isLofi ? "#1A5FB4" : "rgba(52,211,153,0.45)"] });
  const activationFill = activation.interpolate({ inputRange: [0, 1], outputRange: [handleColor ?? colors.primary, isLofi ? "#1A5FB4" : "rgba(16,185,129,0.45)"] });
  const activationHandle = activation.interpolate({ inputRange: [0, 1], outputRange: [handleColor ?? colors.primaryLight, isLofi ? "#1A5FB4" : "#10B981"] });
  const dragX = useRef(new Animated.Value(0)).current;
  const dragValue = useRef(0);
  const startValue = useRef(0);
  const completing = useRef(false);
  const maxDrag = Math.max(trackWidth - KNOB_SIZE - TRACK_PADDING * 2, 1);

  const reset = () => {
    dragValue.current = 0;
    setActivationReady(false);
    Animated.spring(dragX, { toValue: 0, useNativeDriver, bounciness: 5 }).start();
  };

  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => !disabled && !completed && !completing.current,
    onMoveShouldSetPanResponder: (_, gesture) => !disabled && !completed && !completing.current && Math.abs(gesture.dx) > Math.abs(gesture.dy),
    onPanResponderGrant: () => {
      appHaptics.selection();
      startValue.current = dragValue.current;
    },
    onPanResponderMove: (_, gesture) => {
      const next = Math.min(Math.max(startValue.current + gesture.dx * (reverse ? -1 : 1), 0), maxDrag);
      dragValue.current = next;
      dragX.setValue(next);
      if (activationFeedback) setActivationReady(next / maxDrag >= commitRatio);
    },
    onPanResponderRelease: () => {
      if (completing.current) return;
      if (dragValue.current / maxDrag >= commitRatio) {
        completing.current = true;
        dragValue.current = maxDrag;
        appHaptics.success();
        Animated.timing(dragX, { toValue: maxDrag, duration: 140, useNativeDriver }).start(() => {
          void (async () => {
            try {
              const result = await onComplete();
              if (result !== false && successLabel) {
                setCompleted(true);
                onSuccess?.();
              }
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
  }), [disabled, completed, maxDrag, onComplete, commitRatio, reverse, activationFeedback]);

  const onLayout = (event: LayoutChangeEvent) => setTrackWidth(event.nativeEvent.layout.width);
  const innerWidth = Math.max(trackWidth - TRACK_PADDING * 2, 0);
  const initialFill = expandHandle ? Math.min(KNOB_SIZE, innerWidth) : 0;
  const fillWidth = dragX.interpolate({ inputRange: [0, maxDrag], outputRange: [initialFill, innerWidth], extrapolate: "clamp" });
  const labelOpacity = dragX.interpolate({ inputRange: [0, maxDrag * (expandHandle ? 0.55 : 0.25)], outputRange: [1, 0], extrapolate: "clamp" });

  return (
    <Animated.View
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={completed ? successLabel : label}
      onLayout={onLayout}
      style={[
        styles.track,
        {
          backgroundColor: trackColor ?? colors.surface2,
          borderColor: colors.border,
          borderRadius: rounded ? 28 : isLowFidelity ? 4 : 30,
          borderWidth: isLowFidelity ? 1.5 : 1,
        },
        disabled && !completed && styles.disabled,
        style,
        activationFeedback && { backgroundColor: activationTrack, borderColor: activationBorder },
      ]}
      {...panResponder.panHandlers}
    >
      <Animated.View
        style={[
          styles.progress,
        {
          backgroundColor: activationFeedback ? activationFill : completed ? successColor ?? handleColor ?? colors.primary : handleColor ?? colors.primary,
          width: completed ? innerWidth : fillWidth,
          left: reverse ? "auto" : TRACK_PADDING,
          right: reverse ? TRACK_PADDING : "auto",
            borderRadius: rounded ? KNOB_SIZE / 2 : isLowFidelity ? 2 : 26,
          },
        ]}
      />
      <Animated.View style={{ opacity: completed ? 0 : labelOpacity, paddingLeft: reverse ? 12 : KNOB_SIZE + TRACK_PADDING + 12, paddingRight: reverse ? KNOB_SIZE + TRACK_PADDING + 12 : 12 }}>
        <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={[styles.label, { color: textColor ?? colors.muted, fontSize: labelFontSize ?? (rounded ? 12 : 13), fontWeight: labelFontWeight ?? "800", textTransform: uppercaseLabel ? "uppercase" : "none", letterSpacing: uppercaseLabel ? 1 : 0 }]}>{completed ? successLabel : disabled ? disabledLabel : label}</Text>
      </Animated.View>
      <Animated.View
        style={[
          styles.knob,
          {
            backgroundColor: activationFeedback ? activationHandle : handleColor ?? colors.primaryLight,
            borderRadius: rounded ? KNOB_SIZE / 2 : isLowFidelity ? 3 : KNOB_SIZE / 2,
            opacity: completed ? 0 : 1,
            left: reverse ? "auto" : TRACK_PADDING,
            right: reverse ? TRACK_PADDING : "auto",
            transform: [{ translateX: reverse ? Animated.multiply(dragX, -1) : dragX }],
          },
        ]}
      >
        {disabled && !completed ? <ActivityIndicator size="small" color={handleContentColor} /> : <ConductorIcon name={reverse ? "back" : "next"} size={20} color={handleContentColor} strokeWidth={2.5} />}
      </Animated.View>
      {completed && successLabel ? <View style={[styles.success, { backgroundColor: successColor ?? handleColor ?? colors.primary, borderRadius: rounded ? 28 : 26 }]}><ConductorIcon name="check" size={18} color={successTextColor ?? handleContentColor} strokeWidth={2.5} /><Text style={{ color: successTextColor ?? handleContentColor, fontSize: labelFontSize ?? 14, fontWeight: labelFontWeight ?? "600" }}>{successLabel}</Text></View> : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  track: { height: KNOB_SIZE + TRACK_PADDING * 2, borderRadius: 30, borderWidth: 1, justifyContent: "center", overflow: "hidden", marginTop: 14 },
  progress: { position: "absolute", top: TRACK_PADDING, bottom: TRACK_PADDING, borderRadius: 26 },
  knob: { position: "absolute", top: TRACK_PADDING, width: KNOB_SIZE, height: KNOB_SIZE, borderRadius: KNOB_SIZE / 2, alignItems: "center", justifyContent: "center" },
  success: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  arrow: { color: "#fff", fontSize: 31, lineHeight: 34, fontWeight: "300" },
  label: { textAlign: "center", fontWeight: "800", fontSize: 13 },
  disabled: { opacity: 0.55 },
});
