import type { ReactNode } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
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
          borderTopLeftRadius: isLofi ? 0 : 26,
          borderTopRightRadius: isLofi ? 0 : 26,
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

const tabs: { id: Screen; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: "home", label: "Home", icon: "home-outline" },
  { id: "report", label: "Report", icon: "document-text-outline" },
  { id: "metrics", label: "Metrics", icon: "stats-chart-outline" },
  { id: "settings", label: "Settings", icon: "settings-outline" },
];

export function BottomNav({ current, onNavigate, onPayment, isPaymentDisabled = false }: {
  current: Screen; onNavigate: (screen: Screen) => void; onPayment: () => void; isPaymentDisabled?: boolean;
}) {
  const { colors, isLofi } = useAppTheme();
  return (
    <SafeAreaView style={[local.navSafe, { backgroundColor: colors.surface }]}>
      <View style={[local.nav, { borderColor: colors.border }]}>
        {tabs.slice(0, 2).map(tab => <NavItem key={tab.id} {...tab} active={current === tab.id} onPress={() => onNavigate(tab.id)} />)}
        <Pressable
          style={[local.payWrap, isPaymentDisabled && { opacity: 0.55 }]}
          onPress={onPayment}
          accessibilityLabel={isPaymentDisabled ? "Payment (Disabled during break)" : "Collect payment"}
        >
          <View style={[local.payButton, {
            backgroundColor: isPaymentDisabled ? colors.surface2 : colors.primary,
            borderColor: colors.surface,
            borderRadius: isLofi ? 2 : 27,
          }]}>
            <Ionicons
              name="wallet-outline"
              size={24}
              color={isPaymentDisabled ? colors.muted : (isLofi ? colors.text : "#fff")}
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
  label: string; icon: keyof typeof Ionicons.glyphMap; active: boolean; onPress: () => void;
}) {
  const { colors, isLofi } = useAppTheme();
  return (
    <Pressable style={local.navItem} onPress={onPress} accessibilityLabel={label}>
      <View style={[local.navIcon, {
        backgroundColor: active ? colors.primary : "transparent",
        borderRadius: isLofi ? 2 : 12,
      }]}>
        <Ionicons name={icon} size={19} color={active ? (isLofi ? colors.text : "#fff") : colors.muted} />
      </View>
      <Text style={[local.navLabel, { color: active ? colors.text : colors.muted }]}>{label}</Text>
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
  nav: { height: 78, borderTopWidth: 1, flexDirection: "row", alignItems: "center", justifyContent: "space-around" },
  navItem: { width: 62, alignItems: "center" },
  navIcon: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  navLabel: { fontSize: 9, marginTop: 3, fontWeight: "700" },
  payWrap: { alignItems: "center", marginTop: -28 },
  payButton: { width: 56, height: 56, borderWidth: 4, alignItems: "center", justifyContent: "center" },
});
