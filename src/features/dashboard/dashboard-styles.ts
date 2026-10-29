import { StyleSheet } from "react-native";
import type { useAppTheme } from "../../core/theme/ThemeProvider";

export function createDashStyles(_colors: ReturnType<typeof useAppTheme>["colors"], light: boolean) {
  const text = light ? "#111827" : "#FFFFFF";
  const border = light ? "#E5E7EB" : "rgba(255,255,255,0.1)";
  return StyleSheet.create({
    cardWrapper: { backgroundColor: light ? "rgba(255,255,255,0.95)" : "rgba(7,26,46,0.95)", borderBottomWidth: 1, borderBottomColor: border },
    topRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
    unitTitle: { color: text, fontSize: 14, lineHeight: 20, fontWeight: "700" },
    routeSubtitle: { color: light ? "#6B7280" : "rgba(255,255,255,0.4)", fontSize: 10, lineHeight: 15, fontWeight: "500", marginTop: 2 },
    avatarCircle: { width: 32, height: 32, borderRadius: 16, borderWidth: 2, overflow: "hidden", alignItems: "center", justifyContent: "center" },
    breakButton: { minHeight: 44, borderRadius: 12, borderWidth: 1, borderColor: border, backgroundColor: light ? "#FFFFFF" : "#131C2E", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingHorizontal: 16, paddingVertical: 10 },
    breakButtonText: { fontSize: 14, lineHeight: 20, fontWeight: "700", color: text },
    statusHistoryRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    statusBox: { flex: 1, borderRadius: 12, borderWidth: 1, borderColor: border, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: light ? "#F9FAFB" : "#0B223A" },
    statusIndicatorRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 },
    statusDot: { width: 8, height: 8, borderRadius: 4 },
    statusHeaderLabel: { fontSize: 10, lineHeight: 15, fontWeight: "700", letterSpacing: 1, textTransform: "uppercase", color: light ? "#6B7280" : "rgba(255,255,255,0.5)" },
    statusCurrentValue: { marginLeft: "auto", fontSize: 10, lineHeight: 15, fontWeight: "700", color: light ? "#374151" : "rgba(255,255,255,0.6)" },
    chipsRow: { flexDirection: "row", gap: 6 },
    chip: { flex: 1, borderRadius: 8, borderWidth: 1, borderColor: border, backgroundColor: light ? "#FFFFFF" : "#12304F", paddingHorizontal: 8, paddingVertical: 6, alignItems: "center", justifyContent: "center" },
    chipSelected: { backgroundColor: "#1A5FB4", borderColor: "#1A5FB4" },
    chipText: { color: light ? "#374151" : "rgba(255,255,255,0.75)", fontSize: 10, lineHeight: 15, fontWeight: "700" },
    historyButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, backgroundColor: light ? "#F9FAFB" : "rgba(255,255,255,0.05)", borderWidth: 1, borderColor: border, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12 },
    historyButtonText: { color: light ? "#374151" : "rgba(255,255,255,0.7)", fontSize: 10, lineHeight: 15, fontWeight: "600" },
    totalCollectedCard: { borderRadius: 12, borderWidth: 1, borderColor: light ? "#DAEEFF" : "rgba(26,95,180,0.2)", backgroundColor: light ? "#F0F7FF" : "rgba(26,95,180,0.1)", padding: 12 },
    totalCollectedTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
    totalCollectedLabel: { color: light ? "rgba(26,95,180,0.7)" : "rgba(98,160,234,0.6)", fontSize: 9, lineHeight: 14, fontWeight: "600", letterSpacing: 1, textTransform: "uppercase" },
    totalCollectedAmount: { color: light ? "#1A5FB4" : "#62A0EA", fontSize: 20, lineHeight: 28, fontWeight: "800" },
    colCard: { flex: 1, padding: 8, borderRadius: 8, borderWidth: 1, borderColor: light ? "#DAEEFF" : "rgba(255,255,255,0.05)", backgroundColor: light ? "#FFFFFF" : "rgba(255,255,255,0.05)" },
    colLabel: { color: light ? "#6B7280" : "rgba(255,255,255,0.4)", fontSize: 8, lineHeight: 12, fontWeight: "600", letterSpacing: 0.8, textTransform: "uppercase" },
    colValue: { color: text, fontSize: 14, lineHeight: 20, fontWeight: "800" },
    collapseButton: { alignItems: "center", justifyContent: "center", paddingVertical: 6, borderTopWidth: 1, borderTopColor: light ? "#E5E7EB" : "rgba(255,255,255,0.05)" },
  });
}
