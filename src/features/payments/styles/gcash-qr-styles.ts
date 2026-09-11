import { Platform, StyleSheet } from "react-native";
import type { useAppTheme } from "../../../core/theme/ThemeProvider";

export function createGcashQrStyles(colors: ReturnType<typeof useAppTheme>["colors"], isLofi: boolean) {
  return StyleSheet.create({
    qrCard: {
      width: "100%",
      maxWidth: 340,
      backgroundColor: colors.surface,
      borderRadius: isLofi ? 4 : 24,
      borderWidth: isLofi ? 1.5 : 1,
      borderColor: colors.border,
      padding: 20,
      alignItems: "center",
    },
    qrIconCircle: {
      width: 52,
      height: 52,
      borderRadius: isLofi ? 4 : 26,
      backgroundColor: isLofi ? colors.surface2 : "rgba(59, 130, 246, 0.15)",
      borderWidth: isLofi ? 1.5 : 2,
      borderColor: isLofi ? colors.primary : "rgba(59, 130, 246, 0.3)",
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 10,
    },
    qrTitle: {
      fontSize: 18,
      fontWeight: "700",
      color: colors.text,
    },
    qrSubtitle: {
      fontSize: 11,
      color: colors.muted,
      textAlign: "center",
      marginTop: 4,
      lineHeight: 15,
    },
    qrSvgContainer: {
      backgroundColor: "#FFFFFF",
      padding: 14,
      borderRadius: isLofi ? 4 : 16,
      borderWidth: isLofi ? 1.5 : 0,
      borderColor: colors.border,
      marginVertical: 14,
    },
    qrDetailsBox: {
      alignItems: "center",
      gap: 4,
      width: "100%",
    },
    qrRouteText: {
      fontSize: 11,
      color: colors.muted,
    },
    qrAmountText: {
      fontSize: 13,
      color: colors.text,
    },
    qrStatusRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      marginTop: 4,
    },
    qrStatusText: {
      fontSize: 11,
      fontWeight: "600",
    },
    qrCountdownText: {
      fontSize: 11,
      color: colors.muted,
      marginTop: 2,
    },
    qrErrorBox: {
      backgroundColor: isLofi ? colors.surface2 : "rgba(239, 68, 68, 0.1)",
      borderWidth: isLofi ? 1.5 : 1,
      borderColor: isLofi ? colors.danger : "rgba(239, 68, 68, 0.2)",
      padding: 8,
      borderRadius: isLofi ? 4 : 8,
      marginTop: 8,
      width: "100%",
    },
    qrErrorText: {
      fontSize: 10,
      color: isLofi ? colors.danger : "#FCA5A5",
    },
    devSimulateButton: {
      marginTop: 10,
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: isLofi ? 4 : 8,
      borderWidth: isLofi ? 1.5 : 1,
      borderColor: isLofi ? colors.warning : "rgba(245, 158, 11, 0.25)",
      backgroundColor: isLofi ? colors.surface2 : "rgba(245, 158, 11, 0.1)",
    },
    devSimulateButtonText: {
      fontSize: 10,
      fontWeight: "600",
      color: isLofi ? colors.warning : "#FBBF24",
    },
    btnCancelGcash: {
      flex: 1,
      borderWidth: isLofi ? 1.5 : 1,
      borderColor: isLofi ? colors.danger : "rgba(239, 68, 68, 0.3)",
      backgroundColor: isLofi ? colors.surface2 : "transparent",
      paddingVertical: 12,
      borderRadius: isLofi ? 4 : 12,
      alignItems: "center",
      justifyContent: "center",
    },
    btnCancelGcashText: {
      fontSize: 12,
      fontWeight: "700",
      color: isLofi ? colors.danger : "#F87171",
    },

    // Success Step
  });
}
