/**
 * dashboard-styles.ts
 *
 * Theme-aware StyleSheet factory for DashboardScreen.
 * Separated from the screen component to keep DashboardScreen focused on
 * behavior and layout composition rather than style definitions.
 *
 * Usage:
 *   const dashStyles = useMemo(() => createDashStyles(colors, isLofi), [colors, isLofi]);
 */

import { StyleSheet } from "react-native";
import type { useAppTheme } from "../../core/theme/ThemeProvider";

export function createDashStyles(colors: ReturnType<typeof useAppTheme>["colors"], isLofi: boolean) {
  return StyleSheet.create({
    offlineBanner: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      backgroundColor: isLofi ? "#FEF3C7" : "rgba(245, 158, 11, 0.1)",
      borderWidth: isLofi ? 1.5 : 1,
      borderColor: isLofi ? colors.warning : "rgba(245, 158, 11, 0.25)",
      borderRadius: isLofi ? 4 : 12,
      padding: 12,
      marginBottom: 12,
    },
    offlineBannerText: {
      color: isLofi ? "#92400E" : "#FDE68A",
      fontSize: 12,
      lineHeight: 16,
      flex: 1,
      fontWeight: isLofi ? "600" : "400",
    },
    syncBar: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      borderWidth: isLofi ? 1.5 : 1,
      borderRadius: isLofi ? 4 : 12,
      padding: 10,
      marginBottom: 12,
    },
    syncBarText: {
      fontSize: 12,
      lineHeight: 16,
      fontWeight: isLofi ? "600" : "500",
      flex: 1,
    },
    liveSyncPill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      alignSelf: "flex-start",
      borderWidth: 1,
      borderRadius: isLofi ? 2 : 999,
      paddingHorizontal: 10,
      paddingVertical: 4,
      marginBottom: 10,
    },
    cardWrapper: {
      backgroundColor: colors.surface,
      borderWidth: isLofi ? 1.5 : 1,
      borderColor: colors.border,
      borderRadius: isLofi ? 4 : 20,
      padding: 14,
      marginBottom: 14,
    },
    topRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 12,
    },
    unitTitle: {
      color: colors.text,
      fontWeight: "800",
      fontSize: 16,
    },
    routeSubtitle: {
      color: colors.muted,
      fontSize: 11,
      fontWeight: "500",
      marginTop: 2,
    },
    avatarCircle: {
      width: 36,
      height: 36,
      borderRadius: isLofi ? 4 : 18,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: isLofi ? 1.5 : 2,
    },
    avatarOnDuty: {
      backgroundColor: colors.primary,
      borderColor: isLofi ? colors.border : "rgba(255,255,255,0.2)",
    },
    avatarOnBreak: {
      backgroundColor: isLofi ? colors.surface2 : "#0284C7",
      borderColor: isLofi ? colors.border : "#7DD3FC",
    },
    avatarInitial: {
      color: "#FFFFFF",
      fontWeight: "800",
      fontSize: 14,
    },
    breakButton: {
      minHeight: 44,
      width: "100%",
      borderRadius: isLofi ? 4 : 14,
      borderWidth: isLofi ? 1.5 : 1,
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 10,
    },
    breakButtonOnDuty: {
      borderColor: isLofi ? colors.warning : "rgba(245, 158, 11, 0.4)",
      backgroundColor: isLofi ? colors.surface2 : "rgba(245, 158, 11, 0.15)",
    },
    breakButtonOnBreak: {
      borderColor: isLofi ? colors.success : "rgba(52, 211, 153, 0.4)",
      backgroundColor: isLofi ? colors.surface2 : "rgba(52, 211, 153, 0.15)",
    },
    breakButtonText: {
      fontSize: 14,
      fontWeight: "800",
    },
    breakButtonTextOnDuty: {
      color: isLofi ? colors.warning : "#FBBF24",
    },
    breakButtonTextOnBreak: {
      color: isLofi ? colors.success : "#34D399",
    },
    onBreakNotice: {
      color: isLofi ? colors.warning : "rgba(251, 191, 36, 0.8)",
      fontSize: 11,
      textAlign: "center",
      marginTop: 6,
    },
    statusHistoryRow: {
      flexDirection: "row",
      gap: 8,
      marginTop: 12,
    },
    statusBox: {
      flex: 1,
      backgroundColor: colors.surface2,
      borderWidth: isLofi ? 1.5 : 1,
      borderColor: colors.border,
      borderRadius: isLofi ? 4 : 14,
      padding: 10,
    },
    statusIndicatorRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 8,
    },
    statusDot: {
      width: 7,
      height: 7,
      borderRadius: isLofi ? 1 : 4,
      marginRight: 6,
    },
    statusHeaderLabel: {
      fontSize: 10,
      fontWeight: "800",
      textTransform: "uppercase",
      letterSpacing: 0.8,
      color: colors.muted,
    },
    statusCurrentValue: {
      marginLeft: "auto",
      fontSize: 10,
      fontWeight: "700",
      color: colors.text,
    },
    chipsRow: {
      flexDirection: "row",
      gap: 6,
    },
    chip: {
      flex: 1,
      paddingVertical: 6,
      paddingHorizontal: 4,
      borderRadius: isLofi ? 2 : 8,
      borderWidth: isLofi ? 1.5 : 1,
      borderColor: colors.border,
      backgroundColor: isLofi ? colors.surface : "transparent",
      alignItems: "center",
      justifyContent: "center",
    },
    chipAvailable: {
      backgroundColor: isLofi ? "rgba(22, 112, 90, 0.15)" : "rgba(52, 211, 153, 0.15)",
      borderColor: isLofi ? colors.success : "rgba(52, 211, 153, 0.35)",
    },
    chipStanding: {
      backgroundColor: isLofi ? "rgba(118, 92, 16, 0.15)" : "rgba(245, 158, 11, 0.15)",
      borderColor: isLofi ? colors.warning : "rgba(245, 158, 11, 0.35)",
    },
    chipFull: {
      backgroundColor: isLofi ? colors.surface2 : "rgba(255,255,255,0.08)",
      borderColor: isLofi ? colors.border : "rgba(255,255,255,0.15)",
    },
    chipText: {
      fontSize: 10,
      fontWeight: "800",
      color: colors.muted,
    },
    historyButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 4,
      backgroundColor: colors.surface2,
      borderWidth: isLofi ? 1.5 : 1,
      borderColor: colors.border,
      borderRadius: isLofi ? 4 : 14,
      paddingHorizontal: 12,
    },
    historyButtonText: {
      color: colors.text,
      fontSize: 11,
      fontWeight: "700",
    },
    totalCollectedCard: {
      backgroundColor: isLofi ? colors.surface2 : "rgba(26, 95, 180, 0.1)",
      borderWidth: isLofi ? 1.5 : 1,
      borderColor: isLofi ? colors.border : "rgba(26, 95, 180, 0.2)",
      borderRadius: isLofi ? 4 : 14,
      padding: 12,
      marginTop: 10,
    },
    totalCollectedTop: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 8,
    },
    totalCollectedLabel: {
      fontSize: 9,
      fontWeight: "700",
      textTransform: "uppercase",
      letterSpacing: 0.8,
      color: isLofi ? colors.primary : "rgba(98, 160, 234, 0.7)",
    },
    totalCollectedAmount: {
      fontSize: 20,
      fontWeight: "900",
      color: colors.primary,
    },
    threeCols: {
      flexDirection: "row",
      gap: 6,
    },
    colCard: {
      flex: 1,
      backgroundColor: colors.surface,
      borderWidth: isLofi ? 1.5 : 1,
      borderColor: colors.border,
      borderRadius: isLofi ? 3 : 8,
      padding: 8,
    },
    colLabelBlue: {
      fontSize: 8,
      fontWeight: "700",
      textTransform: "uppercase",
      letterSpacing: 0.5,
      color: colors.primary,
    },
    colValueBlue: {
      fontSize: 13,
      fontWeight: "900",
      color: colors.primary,
      marginTop: 2,
    },
    colLabelEmerald: {
      fontSize: 8,
      fontWeight: "700",
      textTransform: "uppercase",
      letterSpacing: 0.5,
      color: colors.success,
    },
    colValueEmerald: {
      fontSize: 13,
      fontWeight: "900",
      color: colors.success,
      marginTop: 2,
    },
    colLabelAmber: {
      fontSize: 8,
      fontWeight: "700",
      textTransform: "uppercase",
      letterSpacing: 0.5,
      color: colors.warning,
    },
    colValueAmber: {
      fontSize: 13,
      fontWeight: "900",
      color: colors.warning,
      marginTop: 2,
    },
    syncPendingBox: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: isLofi ? "#FEF3C7" : "rgba(245, 158, 11, 0.1)",
      borderWidth: isLofi ? 1.5 : 1,
      borderColor: isLofi ? colors.warning : "rgba(245, 158, 11, 0.2)",
      borderRadius: isLofi ? 3 : 10,
      padding: 8,
      marginTop: 8,
    },
    syncPendingText: {
      fontSize: 11,
      color: isLofi ? "#92400E" : "#FDE68A",
      fontWeight: "600",
    },
    sosTriggerButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      backgroundColor: isLofi ? "#FEE2E2" : "rgba(239, 68, 68, 0.08)",
      borderWidth: isLofi ? 1.5 : 1,
      borderColor: isLofi ? colors.danger : "rgba(239, 68, 68, 0.2)",
      borderRadius: isLofi ? 4 : 14,
      paddingVertical: 13,
      marginTop: 22,
    },
    sosTriggerText: {
      color: colors.danger,
      fontWeight: "800",
      fontSize: 14,
    },
  });
}
