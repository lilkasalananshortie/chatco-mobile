import { Platform, StyleSheet } from "react-native";
import type { useAppTheme } from "../../../core/theme/ThemeProvider";

export function createConfirmationStyles(colors: ReturnType<typeof useAppTheme>["colors"], isLofi: boolean) {
  return StyleSheet.create({
    confirmDetailsBox: {
      backgroundColor: isLofi ? colors.surface2 : "rgba(255,255,255,0.02)",
      borderWidth: isLofi ? 1.5 : 1,
      borderColor: colors.border,
      padding: 14,
      borderRadius: isLofi ? 4 : 14,
      gap: 8,
    },
    confirmRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 8,
    },
    confirmRowLabel: {
      fontSize: 12,
      color: colors.muted,
    },
    confirmRowValue: {
      fontSize: 12,
      fontWeight: "500",
      color: colors.text,
      textAlign: "right",
      flex: 1,
    },
    confirmDividerTotal: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      borderTopWidth: isLofi ? 1.5 : 1,
      borderTopColor: colors.border,
      paddingTop: 10,
      marginTop: 4,
    },
    confirmTotalLabel: {
      fontSize: 14,
      fontWeight: "700",
      color: colors.text,
    },
    confirmTotalValue: {
      fontSize: 20,
      fontWeight: "800",
      color: colors.text,
    },
    gcashNoticeBox: {
      backgroundColor: isLofi ? colors.surface2 : "rgba(26, 95, 180, 0.12)",
      borderWidth: isLofi ? 1.5 : 1,
      borderColor: isLofi ? colors.primary : "rgba(26, 95, 180, 0.25)",
      padding: 12,
      borderRadius: isLofi ? 4 : 12,
      gap: 4,
    },
    noticeHeaderRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    gcashNoticeTitle: {
      fontSize: 11,
      fontWeight: "700",
      color: isLofi ? colors.primary : "#62A0EA",
    },
    gcashNoticeText: {
      fontSize: 10,
      color: colors.muted,
      lineHeight: 14,
    },
    cashNoticeBox: {
      backgroundColor: isLofi ? colors.surface2 : "rgba(16, 185, 129, 0.1)",
      borderWidth: isLofi ? 1.5 : 1,
      borderColor: isLofi ? colors.success : "rgba(16, 185, 129, 0.2)",
      padding: 12,
      borderRadius: isLofi ? 4 : 12,
      gap: 4,
    },
    cashNoticeTitle: {
      fontSize: 11,
      fontWeight: "700",
      color: isLofi ? colors.success : "#34D399",
    },
    cashNoticeText: {
      fontSize: 10,
      color: colors.muted,
      lineHeight: 14,
    },
    voucherInputBox: {
      gap: 4,
    },
    voucherInputLabel: {
      fontSize: 11,
      fontWeight: "600",
      color: colors.text,
    },
    voucherTextInput: {
      backgroundColor: isLofi ? colors.surface : "rgba(255,255,255,0.05)",
      borderWidth: isLofi ? 1.5 : 1,
      borderColor: colors.border,
      borderRadius: isLofi ? 4 : 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 14,
      color: colors.text,
      fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    },
    voucherInputSubtext: {
      fontSize: 10,
      color: colors.muted,
      lineHeight: 14,
    },
    actionButtonsRow: {
      flexDirection: "row",
      gap: 10,
      marginTop: 6,
    },
    btnSecondary: {
      flex: 1,
      borderWidth: isLofi ? 1.5 : 1,
      borderColor: colors.border,
      backgroundColor: isLofi ? colors.surface2 : "transparent",
      paddingVertical: 13,
      borderRadius: isLofi ? 4 : 12,
      alignItems: "center",
      justifyContent: "center",
    },
    btnSecondaryText: {
      fontSize: 13,
      fontWeight: "600",
      color: colors.text,
    },
    btnPrimary: {
      flex: 1,
      backgroundColor: colors.primary,
      paddingVertical: 13,
      borderRadius: isLofi ? 4 : 12,
      alignItems: "center",
      justifyContent: "center",
    },
    btnPrimaryText: {
      fontSize: 13,
      fontWeight: "700",
      color: "#FFFFFF",
    },

    // QR Code Modal Step
  });
}
