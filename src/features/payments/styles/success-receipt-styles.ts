import { Platform, StyleSheet } from "react-native";
import type { useAppTheme } from "../../../core/theme/ThemeProvider";

export function createSuccessReceiptStyles(colors: ReturnType<typeof useAppTheme>["colors"], isLofi: boolean) {
  return StyleSheet.create({
    successCheckCircle: {
      width: 56,
      height: 56,
      borderRadius: isLofi ? 4 : 28,
      backgroundColor: isLofi ? colors.surface2 : "rgba(16, 185, 129, 0.12)",
      borderWidth: isLofi ? 1.5 : 1,
      borderColor: isLofi ? colors.success : "rgba(16, 185, 129, 0.25)",
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 10,
    },
    successTitle: {
      fontSize: 18,
      fontWeight: "700",
      color: colors.text,
    },
    successSubtitle: {
      fontSize: 12,
      color: colors.muted,
      marginTop: 2,
      marginBottom: 14,
    },
    successSummaryCard: {
      width: "100%",
      backgroundColor: isLofi ? colors.surface2 : "rgba(255,255,255,0.03)",
      borderWidth: isLofi ? 1.5 : 1,
      borderColor: colors.border,
      borderRadius: isLofi ? 4 : 14,
      padding: 14,
      gap: 8,
      marginBottom: 12,
    },
    receiptAccordionToggle: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      width: "100%",
      backgroundColor: isLofi ? colors.surface2 : "rgba(255,255,255,0.04)",
      borderWidth: isLofi ? 1.5 : 1,
      borderColor: colors.border,
      borderRadius: isLofi ? 4 : 12,
      padding: 12,
      marginBottom: 12,
    },
    receiptAccordionTitle: {
      fontSize: 13,
      fontWeight: "700",
      color: colors.text,
    },
    receiptAccordionSubtitle: {
      fontSize: 10,
      color: colors.muted,
      marginTop: 2,
    },
    receiptContainer: {
      width: "100%",
      alignItems: "center",
      marginBottom: 12,
    },
    printReceiptButton: {
      width: "100%",
      borderWidth: isLofi ? 1.5 : 1,
      borderColor: colors.border,
      backgroundColor: isLofi ? colors.surface2 : "rgba(255,255,255,0.08)",
      paddingVertical: 12,
      borderRadius: isLofi ? 4 : 12,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 10,
    },
    printReceiptButtonText: {
      fontSize: 13,
      fontWeight: "700",
      color: colors.text,
    },

    // Failed Step
    failedCheckCircle: {
      width: 56,
      height: 56,
      borderRadius: isLofi ? 4 : 28,
      backgroundColor: isLofi ? colors.surface2 : "rgba(239, 68, 68, 0.12)",
      borderWidth: isLofi ? 1.5 : 1,
      borderColor: isLofi ? colors.danger : "rgba(239, 68, 68, 0.25)",
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 10,
    },
    failedTitle: {
      fontSize: 18,
      fontWeight: "700",
      color: colors.text,
    },
    failedSubtitle: {
      fontSize: 12,
      color: colors.muted,
      textAlign: "center",
      marginTop: 4,
      lineHeight: 16,
    },

    // Auto-GPS Pickup Badge
    autoGpsBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      backgroundColor: isLofi ? colors.surface2 : "rgba(59, 130, 246, 0.15)",
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: isLofi ? 2 : 6,
      borderWidth: isLofi ? 1 : 0,
      borderColor: isLofi ? colors.primary : "transparent",
      alignSelf: "flex-start",
    },
    autoGpsBadgeText: {
      fontSize: 10,
      fontWeight: "700",
      color: isLofi ? colors.primary : "#60A5FA",
    },
  });
}
