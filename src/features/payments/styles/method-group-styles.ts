import { Platform, StyleSheet } from "react-native";
import type { useAppTheme } from "../../../core/theme/ThemeProvider";

export function createMethodGroupStyles(colors: ReturnType<typeof useAppTheme>["colors"], isLofi: boolean) {
  return StyleSheet.create({
    modalBackdrop: {
      flex: 1,
      backgroundColor: colors.overlay,
      justifyContent: "center",
      alignItems: "center",
      padding: 16,
    },
    modalCard: {
      width: "100%",
      maxWidth: 400,
      backgroundColor: colors.surface,
      borderRadius: isLofi ? 4 : 20,
      borderWidth: isLofi ? 1.5 : 1,
      borderColor: colors.border,
      overflow: "hidden",
    },
    modalHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      padding: 18,
      borderBottomWidth: isLofi ? 1.5 : 1,
      borderBottomColor: colors.border,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: "700",
      color: colors.text,
    },
    modalSubtitle: {
      fontSize: 12,
      color: colors.muted,
      marginTop: 2,
    },
    modalBody: {
      padding: 18,
      gap: 12,
    },
    offlineNotice: {
      backgroundColor: isLofi ? colors.surface2 : "rgba(245, 158, 11, 0.1)",
      borderWidth: isLofi ? 1.5 : 1,
      borderColor: isLofi ? colors.warning : "rgba(245, 158, 11, 0.25)",
      padding: 10,
      borderRadius: isLofi ? 4 : 10,
    },
    offlineNoticeText: {
      fontSize: 11,
      color: isLofi ? colors.warning : "#FDE68A",
      lineHeight: 16,
    },
    methodOptionCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      padding: 14,
      borderRadius: isLofi ? 4 : 14,
      borderWidth: isLofi ? 1.5 : 1,
      borderColor: colors.border,
      backgroundColor: isLofi ? colors.surface2 : "rgba(255,255,255,0.03)",
    },
    methodIconBox: {
      width: 44,
      height: 44,
      borderRadius: isLofi ? 4 : 12,
      borderWidth: isLofi ? 1.5 : 1,
      alignItems: "center",
      justifyContent: "center",
    },
    methodTextBox: {
      flex: 1,
    },
    methodTitle: {
      fontSize: 14,
      fontWeight: "700",
    },
    methodDescription: {
      fontSize: 11,
      color: colors.muted,
      marginTop: 2,
      lineHeight: 15,
    },
    footerNoteText: {
      fontSize: 10,
      color: colors.muted,
      textAlign: "center",
      marginTop: 4,
      lineHeight: 14,
    },

    // Group Counter Rows
    groupCounterRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      padding: 12,
      borderRadius: isLofi ? 4 : 12,
      backgroundColor: isLofi ? colors.surface2 : "rgba(255,255,255,0.03)",
      borderWidth: isLofi ? 1.5 : 1,
      borderColor: colors.border,
    },
    groupCounterLabel: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.text,
    },
    groupCounterFare: {
      fontSize: 10,
      color: colors.muted,
      marginTop: 2,
    },
    groupCounterSubtotal: {
      fontSize: 10,
      color: isLofi ? colors.primary : "#93C5FD",
      marginTop: 1,
    },
    stepperContainer: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    stepperMinus: {
      width: 32,
      height: 32,
      borderRadius: isLofi ? 3 : 8,
      borderWidth: isLofi ? 1.5 : 1,
      borderColor: colors.border,
      backgroundColor: isLofi ? colors.surface : "rgba(255,255,255,0.05)",
      alignItems: "center",
      justifyContent: "center",
    },
    stepperPlus: {
      width: 32,
      height: 32,
      borderRadius: isLofi ? 3 : 8,
      backgroundColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
    },
    stepperBtnText: {
      fontSize: 16,
      fontWeight: "700",
      color: colors.text,
    },
    stepperCountText: {
      fontSize: 15,
      fontWeight: "700",
      color: colors.text,
      minWidth: 20,
      textAlign: "center",
    },

    // Group summary box
    groupSummaryBox: {
      backgroundColor: isLofi ? colors.surface2 : "rgba(59, 130, 246, 0.1)",
      borderWidth: isLofi ? 1.5 : 1,
      borderColor: isLofi ? colors.primary : "rgba(59, 130, 246, 0.2)",
      padding: 14,
      borderRadius: isLofi ? 4 : 14,
      gap: 6,
    },
    summaryLine: {
      flexDirection: "row",
      justifyContent: "space-between",
    },
    summaryLineLabel: {
      fontSize: 12,
      color: colors.muted,
    },
    summaryLineValue: {
      fontSize: 13,
      fontWeight: "600",
      color: colors.text,
    },
    badgeTagsRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 6,
      marginTop: 4,
    },
    summaryPill: {
      backgroundColor: isLofi ? colors.surface : "rgba(255,255,255,0.1)",
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: isLofi ? 3 : 999,
      borderWidth: isLofi ? 1 : 0,
      borderColor: isLofi ? colors.border : "transparent",
    },
    summaryPillText: {
      fontSize: 10,
      color: colors.text,
    },
    summaryDividerTotal: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      borderTopWidth: isLofi ? 1.5 : 1,
      borderTopColor: colors.border,
      paddingTop: 8,
      marginTop: 4,
    },
    summaryTotalLabel: {
      fontSize: 13,
      fontWeight: "600",
      color: colors.text,
    },
    summaryTotalAmount: {
      fontSize: 18,
      fontWeight: "800",
      color: colors.text,
    },

    // Confirm step details
  });
}
