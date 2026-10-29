import type { ReactNode } from "react";
import { Text } from "./BrandText";
import { ConductorIcon } from "./ConductorIcon";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useAppTheme } from "../../core/theme/ThemeProvider";
import type { Screen } from "../../core/domain/types";

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

export function ScreenShell({ children }: { children: ReactNode }) {
  const { styles } = useAppTheme();
  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

export function ModalShell({ visible, title, children, onClose }: {
  visible: boolean; title: string; children: ReactNode; onClose: () => void;
}) {
  const { colors, isLofi, styles } = useAppTheme();
  return (
    <Modal visible={visible} animationType={isLofi ? "none" : "slide"} transparent onRequestClose={onClose}>
      <View style={[local.backdrop, { backgroundColor: colors.overlay }]}>
        <SafeAreaView style={[local.sheet, {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
        }]}>
          <View style={[local.sheetHeader, { borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { fontSize: 18 }]}>{title}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel={`Close ${title}`} onPress={onClose}>
              <Ionicons name="close" size={24} color={colors.muted} />
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
  const { colors, isLofi } = useAppTheme();
  return (
    <SafeAreaView style={[local.navSafe, { backgroundColor: isLofi ? "rgba(255,255,255,0.9)" : "rgba(11,30,51,0.9)" }]}>
      <View style={[local.nav, { borderColor: colors.border }]}>
        {tabs.slice(0, 2).map(tab => <NavItem key={tab.id} {...tab} active={current === tab.id} onPress={() => onNavigate(tab.id)} />)}
        <Pressable
          style={[local.payWrap, isPaymentDisabled && { opacity: 0.55 }]}
          onPress={onPayment}
          accessibilityLabel={isPaymentDisabled ? "Payment (Disabled during break)" : "Collect payment"}
        >
          <View style={[local.payButton, {
            backgroundColor: isPaymentDisabled ? colors.surface2 : colors.primary,
            borderColor: isLofi ? "#FFFFFF" : "#0B1E33",
            borderRadius: 30,
          }]}>
            <ConductorIcon
              name="cash"
              size={20}
              color={isPaymentDisabled ? colors.muted : "#fff"}
            />
          </View>
          <Text style={[local.navLabel, { color: isPaymentDisabled ? colors.muted : colors.text }]}>
            {isPaymentDisabled ? "On Break" : "Payment"}
          </Text>
        </Pressable>
        {tabs.slice(2).map(tab => <NavItem key={tab.id} {...tab} active={current === tab.id} onPress={() => onNavigate(tab.id)} />)}
      </View>
    </SafeAreaView>
  );
}

function NavItem({ label, icon, active, onPress }: {
  label: string; icon: "home" | "file" | "chart" | "settings"; active: boolean; onPress: () => void;
}) {
  const { colors, isLofi } = useAppTheme();
  return (
    <Pressable style={local.navItem} onPress={onPress} accessibilityLabel={label}>
      <View style={[local.navIcon, {
        backgroundColor: active ? colors.primary : "transparent",
        borderRadius: 18,
      }]}>
        <ConductorIcon name={icon} size={17} color={active ? "#FFFFFF" : isLofi ? "#9CA3AF" : "rgba(255,255,255,0.4)"} />
      </View>
      <Text style={[local.navLabel, { color: active ? isLofi ? "#1A5FB4" : "#FFFFFF" : isLofi ? "#9CA3AF" : "rgba(255,255,255,0.3)" }]}>{label}</Text>
    </Pressable>
  );
}

const local = StyleSheet.create({
  center: { alignItems: "center", justifyContent: "center" },
  backdrop: { flex: 1, justifyContent: "flex-end" },
  sheet: { maxHeight: "91%", borderTopWidth: 1 },
  sheetHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 19, borderBottomWidth: 1 },
  close: { fontSize: 20, paddingHorizontal: 8, paddingVertical: 4 },
  navSafe: { position: "absolute", bottom: 0, left: 0, right: 0 },
  nav: { height: 64, paddingHorizontal: 16, paddingVertical: 4, borderTopWidth: 1, flexDirection: "row", alignItems: "flex-end", justifyContent: "space-around" },
  navItem: { flex: 1, alignItems: "center", paddingVertical: 4 },
  navIcon: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  navLabel: { fontSize: 10, lineHeight: 10, marginTop: 2, fontWeight: "500" },
  payWrap: { flex: 1, alignItems: "center", marginTop: -28, marginBottom: 2 },
  payButton: { width: 60, height: 60, borderWidth: 4, alignItems: "center", justifyContent: "center" },
});
