import { Platform, StyleSheet } from "react-native";
import type { useAppTheme } from "../../../core/theme/ThemeProvider";

export function createLocationStyles(colors: ReturnType<typeof useAppTheme>["colors"], isLofi: boolean, isLowFidelity = false) {
  return StyleSheet.create({
    fullscreenContainer: {
      flex: 1,
      backgroundColor: colors.background,
    },
    topBar: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: isLowFidelity ? 1.5 : 1,
      borderBottomColor: colors.border,
      backgroundColor: colors.surface,
    },
    topBarLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      flex: 1,
      minWidth: 0,
    },
    topBarTitle: {
      flexShrink: 1,
      fontSize: 17,
      fontWeight: "700",
      color: colors.text,
    },
    topBarRight: {
      flexShrink: 0,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    methodBadge: {
      paddingHorizontal: 6,
      paddingVertical: 4,
      borderRadius: 4,
      borderWidth: 0,
    },
    methodBadgeBlue: {
      backgroundColor: isLofi ? colors.surface2 : "rgba(59, 130, 246, 0.15)",
      borderColor: isLofi ? colors.primary : "rgba(59, 130, 246, 0.25)",
    },
    methodBadgeGreen: {
      backgroundColor: isLofi ? colors.surface2 : "rgba(16, 185, 129, 0.15)",
      borderColor: isLofi ? colors.success : "rgba(16, 185, 129, 0.25)",
    },
    methodBadgeViolet: {
      backgroundColor: isLofi ? colors.surface2 : "rgba(139, 92, 246, 0.15)",
      borderColor: isLofi ? "#6D28D9" : "rgba(139, 92, 246, 0.25)",
    },
    methodBadgeText: {
      fontSize: 10,
      fontWeight: "700",
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    methodBadgeTextBlue: { color: isLofi ? colors.primary : "#60A5FA" },
    methodBadgeTextGreen: { color: isLofi ? colors.success : "#34D399" },
    methodBadgeTextViolet: { color: isLofi ? "#6D28D9" : "#A78BFA" },
    iconButton: {
      flexShrink: 0,
      width: 44,
      height: 44,
      alignItems: "center",
      justifyContent: "center",
    },

    // Location Selector Section
    locationSelectorSection: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: colors.surface,
      borderBottomWidth: isLowFidelity ? 1.5 : 1,
      borderBottomColor: colors.border,
    },
    cardWrapper: {
      position: "relative",
    },
    locationCard: {
      borderRadius: isLowFidelity ? 4 : 12,
      borderWidth: isLowFidelity ? 1.5 : 1,
      padding: 12,
      paddingRight: 38,
    },
    locationCardInactive: {
      backgroundColor: isLofi ? colors.surface2 : "rgba(255,255,255,0.05)",
      borderColor: colors.border,
    },
    locationCardHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    dot: {
      width: 9,
      height: 9,
      borderRadius: 5,
    },
    miniDot: {
      width: 7,
      height: 7,
      borderRadius: 4,
    },
    locationCardLabel: {
      fontSize: 10,
      fontWeight: "700",
      letterSpacing: 0.6,
    },
    locationCardBody: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginTop: 4,
      marginLeft: 17,
    },
    locationCardText: {
      fontSize: 14,
      fontWeight: "500",
      flex: 1,
    },
    locationCardTextActive: {
      color: colors.text,
    },
    locationCardTextPlaceholder: {
      color: colors.muted,
    },
    brgyPill: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 4,
      marginLeft: 8,
    },
    brgyPillText: {
      fontSize: 10,
      fontWeight: "600",
    },
    clearButton: {
      position: "absolute",
      right: 8,
      top: 12,
      width: 28,
      height: 28,
      alignItems: "center",
      justifyContent: "center",
    },
    swapButtonWrapper: {
      alignItems: "center",
      marginVertical: 4,
    },
    swapButton: {
      width: 36,
      height: 36,
      alignItems: "center",
      justifyContent: "center",
    },
    sameBarangayNotice: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      backgroundColor: isLofi ? colors.surface2 : "rgba(139, 92, 246, 0.1)",
      borderWidth: isLowFidelity ? 1.5 : 1,
      borderColor: isLofi ? "#6D28D9" : "rgba(139, 92, 246, 0.2)",
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: isLowFidelity ? 4 : 8,
      marginTop: 8,
    },
    sameBarangayNoticeText: {
      fontSize: 10,
      fontWeight: "500",
      color: isLofi ? "#6D28D9" : "#C4B5FD",
    },

    // Passenger mode container
    passengerModeContainer: {
      marginTop: 10,
    },
    passengerModeHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    sectionLabel: {
      fontSize: 10,
      fontWeight: "700",
      color: colors.muted,
      letterSpacing: 0.6,
    },
    segmentedControl: {
      flexDirection: "row",
      backgroundColor: isLofi ? colors.surface2 : "rgba(255,255,255,0.05)",
      borderRadius: isLowFidelity ? 4 : 8,
      padding: 2,
      borderWidth: isLowFidelity ? 1.5 : 1,
      borderColor: colors.border,
    },
    segmentButton: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: isLowFidelity ? 3 : 6,
    },
    segmentButtonActive: {
      backgroundColor: colors.primary,
    },
    segmentButtonText: {
      fontSize: 11,
      fontWeight: "600",
      color: colors.muted,
    },
    segmentButtonTextActive: {
      color: "#FFFFFF",
    },
    passengerModeNote: {
      fontSize: 10,
      color: colors.muted,
      marginTop: 4,
    },
    commuterChipsRow: {
      flexDirection: "row",
      gap: 6,
      marginTop: 8,
      paddingBottom: 2,
    },
    commuterChip: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: isLowFidelity ? 4 : 8,
      backgroundColor: isLofi ? colors.surface2 : "rgba(255,255,255,0.05)",
      borderWidth: isLowFidelity ? 1.5 : 0,
      borderColor: isLofi ? colors.border : "transparent",
    },
    commuterChipActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    commuterChipText: {
      fontSize: 11,
      fontWeight: "500",
      color: colors.muted,
    },
    commuterChipTextActive: {
      color: "#FFFFFF",
      fontWeight: "600",
    },
    multipleSelectedNotice: {
      fontSize: 10,
      color: isLofi ? colors.primary : "#93C5FD",
      marginTop: 6,
    },

    // Search Section
    searchSection: {
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 8,
      backgroundColor: colors.background,
    },
    searchContainer: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.surface,
      borderRadius: isLowFidelity ? 4 : 12,
      borderWidth: isLowFidelity ? 1.5 : 1,
      borderColor: colors.border,
      paddingHorizontal: 12,
      height: 42,
    },
    searchBarWrapper: {
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 8,
      backgroundColor: colors.background,
    },
    searchBar: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: isLofi ? colors.surface2 : "rgba(255, 255, 255, 0.08)",
      borderRadius: isLowFidelity ? 4 : 10,
      borderWidth: isLowFidelity ? 1.5 : 1,
      borderColor: colors.border,
      paddingHorizontal: 12,
      height: 44,
    },
    searchIcon: {
      marginRight: 8,
    },
    searchInput: {
      flex: 1,
      fontSize: 14,
      color: isLofi ? "#0F172A" : "#FFFFFF",
      paddingVertical: 8,
      paddingHorizontal: 8,
    },
    searchTip: {
      fontSize: 10,
      color: colors.muted,
      marginTop: 6,
    },

    // Barangay Points List
    pointsList: {
      flex: 1,
      backgroundColor: colors.background,
    },
    pointsListContent: {
      paddingHorizontal: 16,
      paddingBottom: 20,
      gap: 6,
    },
    pointItemWrapper: {
      marginBottom: 4,
    },
    pointItemCard: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      padding: 12,
      borderRadius: isLowFidelity ? 4 : 12,
      borderWidth: isLowFidelity ? 1.5 : 1,
    },
    pointItemLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      flex: 1,
    },
    pointBadge: {
      alignItems: "center",
      width: 28,
    },
    pointBadgePt: {
      fontSize: 9,
      fontWeight: "700",
      color: colors.muted,
    },
    pointBadgeNum: {
      fontSize: 14,
      fontWeight: "700",
      color: colors.text,
    },
    pointItemDetails: {
      flex: 1,
    },
    pointItemNameRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    pointItemName: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.text,
      flexShrink: 1,
    },
    pointItemBrgy: {
      fontSize: 9,
      fontWeight: "600",
      color: colors.muted,
    },
    pointItemSubstops: {
      fontSize: 10,
      color: colors.muted,
      marginTop: 2,
    },
    pointItemRight: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      marginLeft: 8,
    },
    statusTag: {
      paddingHorizontal: 6,
      paddingVertical: 3,
      borderRadius: isLowFidelity ? 2 : 4,
    },
    statusTagText: {
      fontSize: 9,
      fontWeight: "700",
      color: "#FFFFFF",
    },
    expandChevronButton: {
      width: 28,
      height: 28,
      borderRadius: isLowFidelity ? 3 : 8,
      backgroundColor: isLofi ? colors.surface2 : "rgba(255,255,255,0.05)",
      borderWidth: isLowFidelity ? 1.5 : 1,
      borderColor: colors.border,
      alignItems: "center",
      justifyContent: "center",
    },

    // Expanded Sub-Stops Box
    expandedSubstopsBox: {
      marginLeft: 40,
      marginTop: 6,
      paddingLeft: 8,
      borderLeftWidth: isLowFidelity ? 2 : 1,
      borderLeftColor: colors.border,
      gap: 6,
    },
    expandedSubstopsTitle: {
      fontSize: 10,
      color: colors.muted,
      textTransform: "uppercase",
      letterSpacing: 0.5,
      fontWeight: "600",
      marginBottom: 2,
    },
    usePointAreaButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingHorizontal: 8,
      paddingVertical: 6,
      borderRadius: isLowFidelity ? 3 : 6,
      backgroundColor: isLofi ? colors.surface2 : "rgba(245, 158, 11, 0.05)",
      borderWidth: isLowFidelity ? 1.5 : 1,
      borderColor: isLofi ? colors.warning : "rgba(245, 158, 11, 0.15)",
    },
    usePointAreaText: {
      fontSize: 11,
      fontWeight: "500",
      color: isLofi ? colors.warning : "#FBBF24",
    },
    substopRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingHorizontal: 8,
      paddingVertical: 6,
      borderRadius: isLowFidelity ? 3 : 6,
      backgroundColor: isLofi ? colors.surface : "rgba(255,255,255,0.02)",
      borderWidth: 1,
      borderColor: "transparent",
    },
    substopName: {
      fontSize: 11,
      color: colors.text,
      flex: 1,
    },
    substopTag: {
      paddingHorizontal: 5,
      paddingVertical: 2,
      borderRadius: isLowFidelity ? 2 : 4,
      backgroundColor: isLofi ? colors.surface2 : "rgba(255,255,255,0.08)",
    },
    substopTagText: {
      fontSize: 8,
      fontWeight: "700",
      color: isLofi ? colors.success : "#34D399",
    },

    // Bottom Action Bar
    bottomBarContainer: {
      borderTopWidth: isLowFidelity ? 1.5 : 1,
      borderTopColor: colors.border,
      backgroundColor: colors.background,
      paddingHorizontal: 16,
      paddingTop: 14,
      paddingBottom: 16,
    },
    routeConfirmRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginBottom: 8,
    },
    routePointInline: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      flex: 1,
    },
    routePointInlineText: {
      fontSize: 12,
      fontWeight: "500",
      color: colors.text,
    },
    fareExplanationBox: {
      backgroundColor: isLofi ? colors.surface2 : "rgba(255,255,255,0.03)",
      borderWidth: isLowFidelity ? 1.5 : 1,
      borderColor: colors.border,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: isLowFidelity ? 3 : 8,
      marginBottom: 10,
    },
    fareExplanationText: {
      fontSize: 10,
      color: colors.muted,
    },
    fareTotalRow: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: isLowFidelity ? 4 : 12,
      backgroundColor: isLofi ? colors.surface2 : "rgba(255,255,255,0.03)",
      paddingHorizontal: 16,
      paddingVertical: 12,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 12,
    },
    fareRouteSub: {
      fontSize: 10,
      fontWeight: "600",
      color: colors.muted,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    fareStrikethrough: {
      fontSize: 11,
      color: colors.muted,
      textDecorationLine: "line-through",
    },
    fareFinalLarge: {
      fontSize: 24,
      fontWeight: "800",
      color: colors.text,
    },
    fareSavingsText: {
      fontSize: 10,
      fontWeight: "600",
      color: isLofi ? colors.success : "#34D399",
    },
    cashActionButton: {
      backgroundColor: "#009966",
      paddingVertical: 14,
      borderRadius: isLowFidelity ? 4 : 12,
      alignItems: "center",
      justifyContent: "center",
    },
    cashActionButtonText: {
      fontSize: 14,
      fontWeight: "700",
      color: "#FFFFFF",
    },
    gcashActionButton: {
      backgroundColor: colors.primary,
      paddingVertical: 14,
      borderRadius: isLowFidelity ? 4 : 12,
      alignItems: "center",
      justifyContent: "center",
    },
    gcashActionButtonText: {
      fontSize: 14,
      fontWeight: "700",
      color: "#FFFFFF",
    },
    voucherActionButton: {
      backgroundColor: isLofi ? "#6D28D9" : "#7C3AED",
      paddingVertical: 14,
      borderRadius: isLowFidelity ? 4 : 12,
      alignItems: "center",
      justifyContent: "center",
    },
    bottomHintText: {
      fontSize: 10,
      color: colors.muted,
      textAlign: "center",
      marginTop: 8,
    },
    bottomPlaceholderText: {
      fontSize: 12,
      color: colors.muted,
      textAlign: "center",
      paddingVertical: 8,
    },

    // Modal Cards for other steps
  });
}
