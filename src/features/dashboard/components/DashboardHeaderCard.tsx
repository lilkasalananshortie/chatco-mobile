import { useEffect, useRef, useState } from "react";
import { Animated, Easing, Image, Pressable, View, type TextProps } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Text as BrandText } from "../../../shared/ui/BrandText";
import { ConductorIcon } from "../../../shared/ui/ConductorIcon";
import type { Capacity, Shift } from "../../../core/domain/types";
import { useAppTheme } from "../../../core/theme/ThemeProvider";
import { useAnimatedColor } from "../../../shared/ui/useAnimatedFeedback";
import { useReducedMotion } from "../../../shared/ui/useWebEntrance";

export interface DashboardHeaderCardProps {
  profilePictureUrl?: string | null;
  shift: Shift;
  dashStyles: any;
  colors: any;
  isLofi: boolean;
  canOperate: boolean;
  isOnBreak: boolean;
  breakPending: boolean;
  onOpenBreakConfirm: () => void;
  tripDestination: string;
  onOpenDirection: () => void;
  directionReady: boolean;
  capacity: Capacity;
  onUpdateCapacity: (cap: Capacity) => void;
  onOpenActions?: () => void;
  totals: { total: number; cash: number; gcash: number; voucher?: number };
  pendingOfflineCount: number;
  pendingOfflineError?: string;
}

const peso = (amount: number) => new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function Text({ style, ...props }: TextProps) {
  return <BrandText {...props} style={[style, { includeFontPadding: false }]} />;
}

/** Native translation of conductor/dashboard/mobile-dashboard-card.tsx. */
export function DashboardHeaderCard({ profilePictureUrl, shift, dashStyles: s, isLofi, canOperate, isOnBreak, breakPending, onOpenBreakConfirm, tripDestination, onOpenDirection, directionReady, capacity, onUpdateCapacity, onOpenActions, totals, pendingOfflineCount, pendingOfflineError }: DashboardHeaderCardProps) {
  const [failedPhoto, setFailedPhoto] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(true);
  const { isLowFidelity } = useAppTheme();
  const reduceMotion = useReducedMotion();
  const [contentHeight, setContentHeight] = useState(0);
  const expansion = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (isLowFidelity) { expansion.setValue(expanded ? 1 : 0); return; }
    const animation = Animated.timing(expansion, {
      toValue: expanded ? 1 : 0,
      duration: 300,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: false,
    });
    animation.start();
    return () => animation.stop();
  }, [expanded, expansion, isLowFidelity]);
  const text = isLofi ? "#111827" : "#FFFFFF";
  const muted = isLofi ? "#6B7280" : "rgba(255,255,255,0.4)";
  const status = isOnBreak ? "On Break" : capacity === "AVAILABLE" ? "Available" : capacity === "STANDING" ? "Standing" : "Full";
  const avatarBackground = useAnimatedColor(isOnBreak ? "#0EA5E9" : "#1A5FB4", 300, isLowFidelity || reduceMotion);
  const avatarBorder = useAnimatedColor(isOnBreak ? "#7DD3FC" : isLofi ? "#DAEEFF" : "rgba(255,255,255,0.2)", 300, isLowFidelity || reduceMotion);
  const statusColor = useAnimatedColor(isOnBreak ? "#38BDF8" : capacity === "AVAILABLE" ? "#34D399" : capacity === "STANDING" ? "#FBBF24" : "#F87171", 300, isLowFidelity || reduceMotion);

  return <View style={s.cardWrapper}>
    <View style={s.topRow}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text numberOfLines={1} style={s.unitTitle}>Unit: {shift.unitNumber}</Text>
        <Text numberOfLines={1} style={s.routeSubtitle}>{shift.route}</Text>
      </View>
      <AnimatedPressable accessibilityRole="button" accessibilityLabel={`${shift.conductorName}, ${isOnBreak ? "on break" : "on duty"}. Open conductor actions`} onPress={onOpenActions} hitSlop={6} style={[s.avatarCircle, { backgroundColor: avatarBackground, borderColor: avatarBorder }]}>
        {profilePictureUrl && failedPhoto !== profilePictureUrl
          ? <Image source={{ uri: profilePictureUrl }} onError={() => setFailedPhoto(profilePictureUrl)} style={{ width: "100%", height: "100%" }} />
          : <Ionicons name="person" size={16} color="#FFFFFF" />}
      </AnimatedPressable>
    </View>
    <Animated.View pointerEvents={expanded ? "auto" : "none"} accessibilityElementsHidden={!expanded} importantForAccessibility={expanded ? "auto" : "no-hide-descendants"} style={{ overflow: "hidden", height: expansion.interpolate({ inputRange: [0, 1], outputRange: [0, contentHeight] }) }}>
    <View onLayout={event => setContentHeight(event.nativeEvent.layout.height)} style={{ position: "absolute", top: 0, left: 0, right: 0, paddingHorizontal: 16, paddingBottom: 12, gap: 12 }}>
      <View style={{ flexDirection: "row", gap: 8 }}>
      <Pressable accessibilityRole="button" accessibilityState={{ disabled: !canOperate || breakPending }} disabled={!canOperate || breakPending} onPress={onOpenBreakConfirm} style={[s.breakButton, { flex: 1, paddingHorizontal: 8 }, (!canOperate || breakPending) && { opacity: 0.6 }]}>
        <ConductorIcon name={isOnBreak ? "play" : "pause"} size={14} color={isLofi ? "#6B7280" : "rgba(255,255,255,0.6)"} strokeWidth={2.25} />
        <Text style={s.breakButtonText}>{breakPending ? "Updating..." : isOnBreak ? "Resume Duty" : "Take a Break"}</Text>
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel={`Trip direction: to ${tripDestination}`} disabled={!canOperate || !directionReady} onPress={onOpenDirection} style={[s.breakButton, { flex: 1, paddingHorizontal: 8 }, (!canOperate || !directionReady) && { opacity: 0.6 }]}>
        <Ionicons name="git-compare-outline" size={14} color={muted} />
        <Text numberOfLines={1} adjustsFontSizeToFit style={s.breakButtonText}>To {tripDestination}</Text>
      </Pressable>
      </View>
      <View style={s.statusHistoryRow}>
        <View style={s.statusBox}>
          <View style={s.statusIndicatorRow}>
            <Animated.View style={[s.statusDot, { backgroundColor: statusColor }]} />
            <Text style={s.statusHeaderLabel}>Status</Text>
            <Text style={[s.statusCurrentValue, isOnBreak && { color: isLofi ? "#0369A1" : "#7DD3FC" }]}>{status}</Text>
          </View>
          <View style={s.chipsRow}>
            {(["AVAILABLE", "STANDING", "FULL"] as Capacity[]).map((value) => {
              const selected = capacity === value;
              return <Pressable key={value} accessibilityRole="button" accessibilityState={{ selected, disabled: isOnBreak || !canOperate }} disabled={isOnBreak || !canOperate} onPress={() => onUpdateCapacity(value)} style={[s.chip, selected && s.chipSelected, (isOnBreak || !canOperate) && { opacity: 0.4 }]}>
                <Text style={[s.chipText, selected && { color: "#FFFFFF" }]}>{value === "AVAILABLE" ? "Available" : value === "STANDING" ? "Standing" : "Full"}</Text>
              </Pressable>;
            })}
          </View>
        </View>
      </View>
      <View style={s.totalCollectedCard}>
        <View style={s.totalCollectedTop}>
          <Text style={s.totalCollectedLabel}>Total Collected</Text>
          <Text style={s.totalCollectedAmount}>{peso(totals.total)}</Text>
        </View>
        <View style={{ flexDirection: "row", gap: 8 }}>
          {[{ label: "GCash", value: totals.gcash }, { label: "Cash", value: totals.cash }].map(item => <View key={item.label} style={s.colCard}>
            <Text style={s.colLabel}>{item.label}</Text>
            <Text style={s.colValue}>{peso(item.value)}</Text>
          </View>)}
        </View>
      </View>
      {pendingOfflineCount > 0 ? <View style={{ gap: 3 }}>
        <Text style={{ color: muted, fontSize: 10 }}>{pendingOfflineCount} cash transaction{pendingOfflineCount === 1 ? "" : "s"} waiting to sync</Text>
        {pendingOfflineError ? <Text accessibilityRole="alert" style={{ color: isLofi ? "#B91C1C" : "#FECACA", fontSize: 10 }}>Sync needs attention: {pendingOfflineError}</Text> : null}
      </View> : null}
    </View>
    </Animated.View>
    <Pressable accessibilityRole="button" accessibilityState={{ expanded }} accessibilityLabel={expanded ? "Collapse dashboard card" : "Expand dashboard card"} onPress={() => setExpanded(value => !value)} style={s.collapseButton}>
      <Animated.View style={{ transform: [{ rotate: expansion.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "180deg"] }) }] }}>
        <ConductorIcon name="up" size={16} color={isLofi ? "#9CA3AF" : "rgba(255,255,255,0.3)"} strokeWidth={2} />
      </Animated.View>
    </Pressable>
  </View>;
}
