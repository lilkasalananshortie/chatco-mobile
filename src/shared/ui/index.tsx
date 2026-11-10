import { useEffect, useRef, useState, type ReactNode } from "react";
import { Text } from "./BrandText";
import { ConductorIcon } from "./ConductorIcon";
import {
  ActivityIndicator,
  Animated,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  type StyleProp,
  View,
  type ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useAppTheme } from "../../core/theme/ThemeProvider";
import type { Screen } from "../../core/domain/types";
import { useReducedMotion } from "./useWebEntrance";
import { useAnimatedToggle } from "./useAnimatedFeedback";

export function Loading({ label = "Loading..." }: { label?: string }) {
  const { colors, styles } = useAppTheme();
  return (
    <View style={[styles.screen, local.center]}>
      <ActivityIndicator color={colors.primaryLight} size="large" />
      <Text style={[styles.subtitle, { marginTop: 12 }]}>{label}</Text>
    </View>
  );
}

export function Header({ title, subtitle, eyebrow }: {
  title: string; subtitle?: string; eyebrow?: string;
}) {
  const { styles } = useAppTheme();
  return (
    <View style={{ marginBottom: 8 }}>
      {eyebrow ? <Text style={[styles.label, { marginBottom: 7 }]}>{eyebrow}</Text> : null}
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

export function VerificationBackButton({ onPress, iconOnly = false }: { onPress: () => void; iconOnly?: boolean }) {
  const { colors } = useAppTheme();
  return <Pressable accessibilityRole="button" accessibilityLabel="Back to verification" onPress={onPress}
    style={({ pressed }) => ({ minHeight: 44, minWidth: iconOnly ? 44 : undefined, maxWidth: "100%", alignSelf: "flex-start", flexDirection: "row", alignItems: "center", justifyContent: iconOnly ? "center" : undefined, gap: 6, opacity: pressed ? 0.65 : 1 })}>
    <ConductorIcon name="back" size={18} color={colors.primaryLight} />
    {!iconOnly ? <Text style={{ color: colors.primaryLight, fontSize: 14, fontWeight: "600", flexShrink: 1 }}>Back to verification</Text> : null}
  </Pressable>;
}

export function ScreenShell({ children, scrollable = true, contentStyle }: {
  children: ReactNode;
  scrollable?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
}) {
  const { styles } = useAppTheme();
  return (
    <View style={styles.screen}>
      {scrollable ? (
        <ScrollView contentContainerStyle={[styles.content, contentStyle]} keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.content, { flex: 1 }, contentStyle]}>{children}</View>
      )}
    </View>
  );
}

export function ModalShell({ visible, title, children, onClose }: {
  visible: boolean; title: string; children: ReactNode; onClose: () => void;
}) {
  const { colors, isLofi, styles , isLowFidelity } = useAppTheme();
  return (
    <Modal visible={visible} animationType={isLowFidelity ? "none" : "slide"} transparent onRequestClose={onClose}>
      <View style={[local.backdrop, { backgroundColor: colors.overlay }]}>
        <SafeAreaView style={[local.sheet, {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
        }]}>
          <View style={[local.sheetHeader, { borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { fontSize: 18, flex: 1, minWidth: 0 }]}>{title}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel={`Close ${title}`} onPress={onClose} style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}>
              <Ionicons name="close" size={20} color={colors.muted} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={{ padding: 20 }} keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const tabs: { id: Screen; label: string; icon: "home" | "file" | "chart" | "settings" }[] = [
  { id: "home", label: "Home", icon: "home" },
  { id: "report", label: "Report", icon: "file" },
  { id: "metrics", label: "Metrics", icon: "chart" },
  { id: "settings", label: "Settings", icon: "settings" },
];

export function BottomNav({ current, onNavigate, onPayment, isPaymentDisabled = false }: {
  current: Screen; onNavigate: (screen: Screen) => void; onPayment: () => void; isPaymentDisabled?: boolean;
}) {
  const { colors, isLofi , isLowFidelity } = useAppTheme();
  const [paymentPressed, setPaymentPressed] = useState(false);
  const reduceMotion = useReducedMotion();
  const paymentPress = useAnimatedToggle(paymentPressed, 200, isLowFidelity || reduceMotion);
  return (
    <View style={[local.navSafe, { bottom: 8 }]}>
      <View style={[local.nav, { borderColor: colors.border, backgroundColor: colors.background }]}>
        {tabs.slice(0, 2).map(tab => <NavItem key={tab.id} {...tab} active={current === tab.id} onPress={() => onNavigate(tab.id)} />)}
        <Pressable
          style={[local.payWrap, isPaymentDisabled && { opacity: 0.55 }]}
          onPress={onPayment}
          onPressIn={() => setPaymentPressed(true)}
          onPressOut={() => setPaymentPressed(false)}
          accessibilityLabel={isPaymentDisabled ? "Payment (unavailable until the shift is active on this device)" : "Collect payment"}
        >
          <Animated.View style={[local.payButton, {
            backgroundColor: isPaymentDisabled ? colors.surface2 : colors.primary,
            borderColor: isLofi ? "#FFFFFF" : "#0B1E33",
            borderRadius: 30,
            transform: [{ scale: paymentPress.interpolate({ inputRange: [0, 1], outputRange: [1, 0.92] }) }],
          }]}>
            <ConductorIcon
              name="cash"
              size={24}
              color={isPaymentDisabled ? colors.muted : "#fff"}
            />
          </Animated.View>
          <Text style={[local.navLabel, { color: isPaymentDisabled ? colors.muted : colors.text }]}>
            Payment
          </Text>
        </Pressable>
        {tabs.slice(2).map(tab => <NavItem key={tab.id} {...tab} active={current === tab.id} onPress={() => onNavigate(tab.id)} />)}
      </View>
    </View>
  );
}

function NavItem({ label, icon, active, onPress }: {
  label: string; icon: "home" | "file" | "chart" | "settings"; active: boolean; onPress: () => void;
}) {
  const { colors, isLofi , isLowFidelity } = useAppTheme();
  const reduceMotion = useReducedMotion();
  const selection = useRef(new Animated.Value(active ? 1 : 0)).current;
  useEffect(() => {
    selection.stopAnimation();
    if (isLowFidelity || reduceMotion) { selection.setValue(active ? 1 : 0); return; }
    const animation = Animated.timing(selection, { toValue: active ? 1 : 0, duration: 300, useNativeDriver: true });
    animation.start();
    return () => animation.stop();
  }, [active, isLowFidelity, reduceMotion, selection]);
  const inactiveOpacity = selection.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });
  return (
    <Pressable style={local.navItem} onPress={onPress} accessibilityRole="tab" accessibilityState={{ selected: active }} accessibilityLabel={label}>
      <View style={[local.navIcon, { borderRadius: 20 }]}>
        <Animated.View style={[StyleSheet.absoluteFill, { borderRadius: 20, backgroundColor: colors.primary, opacity: selection }]} />
        <Animated.View style={{ position: "absolute", opacity: inactiveOpacity }}><ConductorIcon name={icon} size={22} color={isLofi ? "#9CA3AF" : "rgba(255,255,255,0.4)"} /></Animated.View>
        <Animated.View style={{ position: "absolute", opacity: selection }}><ConductorIcon name={icon} size={22} color="#FFFFFF" /></Animated.View>
      </View>
      <View style={{ marginTop: 2 }}>
        <Animated.View style={{ opacity: inactiveOpacity }}><Text style={[local.navLabel, { marginTop: 0, color: isLofi ? "#9CA3AF" : "rgba(255,255,255,0.3)" }]}>{label}</Text></Animated.View>
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: selection }]}><Text style={[local.navLabel, { marginTop: 0, color: isLofi ? "#1A5FB4" : "#FFFFFF" }]}>{label}</Text></Animated.View>
      </View>
    </Pressable>
  );
}

const local = StyleSheet.create({
  center: { alignItems: "center", justifyContent: "center" },
  backdrop: { flex: 1, justifyContent: "flex-end" },
  sheet: { maxHeight: "91%", borderTopWidth: 1 },
  sheetHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 19, borderBottomWidth: 1 },
  close: { fontSize: 20, paddingHorizontal: 8, paddingVertical: 4 },
  navSafe: { position: "absolute", bottom: 0, left: 12, right: 12 },
  nav: { height: 64, paddingHorizontal: 12, paddingVertical: 4, borderWidth: 1, borderRadius: 20, flexDirection: "row", alignItems: "flex-end", justifyContent: "space-around" },
  navItem: { flex: 1, alignItems: "center", paddingVertical: 2 },
  navIcon: { width: 40, height: 40, aspectRatio: 1, flexShrink: 0, overflow: "hidden", alignItems: "center", justifyContent: "center" },
  navLabel: { fontSize: 10, lineHeight: 10, marginTop: 2, fontWeight: "500" },
  payWrap: { flex: 1, alignItems: "center", marginTop: -28, marginBottom: 2 },
  payButton: { width: 60, height: 60, borderWidth: 4, alignItems: "center", justifyContent: "center" },
});
