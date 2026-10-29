import { useMemo } from "react";
import { StyleSheet } from "react-native";
import { useAppTheme } from "../../core/theme/ThemeProvider";

/** Values copied from the web end-of-day page and APP_DIALOG styles. */
export function useReportTheme() {
  const { isLofi, colors: appColors } = useAppTheme();
  return useMemo(() => {
    const colors = {
      ...appColors,
      action: appColors.primary,
      subtle: isLofi ? appColors.muted : "rgba(255,255,255,0.25)",
      secondary: isLofi ? "#374151" : "rgba(255,255,255,0.7)",
      hairline: appColors.border,
      dialog: appColors.surface,
    };
    const styles = StyleSheet.create({
      screen: { flex: 1, backgroundColor: colors.background },
      content: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 112, gap: 20 },
      pageHeader: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderColor: isLofi ? "#E5E7EB" : "rgba(255,255,255,0.05)" },
      back: { width: 36, height: 36, borderRadius: 12, backgroundColor: isLofi ? "#FFFFFF" : "rgba(255,255,255,0.05)", borderWidth: 1, borderColor: isLofi ? "#D1D5DB" : "rgba(255,255,255,0.1)", alignItems: "center", justifyContent: "center" },
      title: { color: colors.text, fontSize: 18, lineHeight: 28, fontWeight: "700" },
      subtitle: { color: colors.muted, fontSize: 11, lineHeight: 16 },
      card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: 16 },
      cardTitle: { color: colors.text, fontSize: 14, lineHeight: 20, fontWeight: "700" },
      label: { color: colors.muted, fontSize: 10, lineHeight: 15, fontWeight: "700", textTransform: "uppercase", letterSpacing: 1 },
      button: { minHeight: 52, paddingVertical: 16, paddingHorizontal: 16, backgroundColor: colors.action, borderRadius: 16, alignItems: "center", justifyContent: "center" },
      buttonText: { color: "#FFFFFF", fontWeight: "700", fontSize: 14, lineHeight: 20 },
      secondaryButton: { backgroundColor: isLofi ? "#FFFFFF" : "#10273F", borderWidth: 1, borderColor: isLofi ? "#D1D5DB" : "#1C3350", borderRadius: 8, minHeight: 44, paddingVertical: 10 },
      secondaryButtonText: { color: colors.text, fontWeight: "600" },
      error: { color: colors.danger, fontSize: 12, lineHeight: 18, textAlign: "center" },
    });
    return { colors, styles, isLofi };
  }, [appColors, isLofi]);
}
