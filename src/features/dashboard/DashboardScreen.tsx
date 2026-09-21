import { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useKeepAwake } from "expo-keep-awake";
import { Ionicons } from "@expo/vector-icons";
import type { Shift } from "../../core/domain/types";
import { useAppTheme } from "../../core/theme/ThemeProvider";
import { Header, ScreenShell } from "../../shared/ui";
import { SosConfirmModal } from "../../shared/ui/SosConfirmModal";
import { TransactionHistoryModal } from "./TransactionHistoryModal";
import { createDashStyles } from "./dashboard-styles";
import { useDashboardShift } from "./hooks/useDashboardShift";
import { useDashboardGps } from "./hooks/useDashboardGps";
import { DeviceOwnershipBanner } from "./components/DeviceOwnershipBanner";
import { DashboardHeaderCard } from "./components/DashboardHeaderCard";
import { RouteMapSection } from "./components/RouteMapSection";
import { BreakConfirmModal } from "./components/BreakConfirmModal";

export function DashboardScreen({
  shift,
  refreshKey,
  canOperate,
  isOnline,
  onShiftUpdated,
  onShiftEnded,
}: {
  shift: Shift;
  refreshKey: number;
  canOperate: boolean;
  isOnline: boolean;
  onShiftUpdated?: (shift: Shift) => void;
  onShiftEnded?: () => void;
}) {
  const { colors, styles, isLofi } = useAppTheme();
  useKeepAwake();
  const dashStyles = useMemo(() => createDashStyles(colors, isLofi), [colors, isLofi]);

  const [history, setHistory] = useState(false);
  const [sos, setSos] = useState(false);

  const shiftData = useDashboardShift({
    shift,
    refreshKey,
    canOperate,
    isOnline,
    onShiftUpdated,
    onShiftEnded,
  });

  const gpsData = useDashboardGps({
    shift,
    canOperate,
    refreshKey,
  });

  const combinedError = shiftData.error || gpsData.gpsError;

  return (
    <ScreenShell>
      <Header
        title={`Unit ${shift.unitNumber}`}
        subtitle={`${shift.route || "Active route"} · ${shift.driverName}`}
        eyebrow="Conductor Dashboard"
      />

      {/* Sync Status Banner */}
      {shiftData.syncState === "syncing" ? (
        <View
          style={[
            dashStyles.syncBar,
            {
              backgroundColor: isLofi ? "#FEF3C7" : "rgba(245, 158, 11, 0.1)",
              borderColor: isLofi ? colors.warning : "rgba(245, 158, 11, 0.3)",
            },
          ]}
        >
          <Ionicons name="sync" size={14} color={isLofi ? colors.warning : "#FBBF24"} />
          <Text style={[dashStyles.syncBarText, { color: isLofi ? "#92400E" : "#FDE68A" }]}>
            Syncing offline transactions with cloud…
          </Text>
        </View>
      ) : null}

      {/* Live sync pill */}
      {isOnline ? (
        <View
          style={[
            dashStyles.liveSyncPill,
            {
              backgroundColor: isLofi ? colors.surface2 : "rgba(22, 112, 90, 0.15)",
              borderColor: isLofi ? colors.success : "rgba(52, 211, 153, 0.3)",
            },
          ]}
        >
          <View
            style={{
              width: 6,
              height: 6,
              borderRadius: 3,
              backgroundColor: isLofi ? colors.success : "#34D399",
            }}
          />
          <Text
            style={{
              color: isLofi ? colors.success : "#34D399",
              fontSize: 10,
              fontWeight: "700",
              textTransform: "uppercase",
            }}
          >
            Live Sync Active
          </Text>
        </View>
      ) : (
        <View style={dashStyles.offlineBanner}>
          <Ionicons name="cloud-offline-outline" size={16} color={isLofi ? colors.warning : "#FBBF24"} />
          <Text style={dashStyles.offlineBannerText}>
            You are offline. Cash transactions and GPS positions will queue locally and upload when reconnected.
          </Text>
        </View>
      )}

      {/* Device Ownership / Multi-Device Handoff Banner */}
      <DeviceOwnershipBanner
        shift={shift}
        isOperatingDevice={shiftData.isOperatingDevice}
        canOperate={canOperate}
        ownsShift={shiftData.ownsShift}
        unclaimed={shiftData.unclaimed}
        recoveredByAdmin={shiftData.recoveredByAdmin}
        deviceBusy={shiftData.deviceBusy}
        deviceError={shiftData.deviceError}
        claimDevice={shiftData.claimDevice}
        releaseDevice={shiftData.releaseDevice}
      />

      {/* Conductor Mobile Dashboard Header Card */}
      <DashboardHeaderCard
        shift={shift}
        dashStyles={dashStyles}
        colors={colors}
        isLofi={isLofi}
        canOperate={canOperate}
        isOnBreak={shiftData.isOnBreak}
        breakPending={shiftData.breakPending}
        onOpenBreakConfirm={() => shiftData.setBreakConfirmOpen(true)}
        capacity={shiftData.capacity}
        onUpdateCapacity={(cap) => void shiftData.updateCapacity(cap)}
        onOpenHistory={() => setHistory(true)}
        totals={shiftData.totals}
        transactionTotals={shiftData.transactionTotals}
        pendingOfflineCount={shiftData.pendingOfflineCount}
      />

      {/* Route Map and Pickup Hails */}
      <RouteMapSection
        shift={shift}
        canOperate={canOperate}
        announcements={shiftData.announcements}
        onMarkAnnouncementRead={shiftData.handleMarkAnnouncementRead}
        mapEnabled={gpsData.mapEnabled}
        setMapEnabled={gpsData.setMapEnabled}
        position={gpsData.position}
        hails={shiftData.hails}
        routeCoordinates={gpsData.routeCoordinates}
        routeSource={gpsData.routeSource}
        onHail={(id, action) => void shiftData.handleHail(id, action)}
      />

      {combinedError ? <Text style={styles.error}>{combinedError}</Text> : null}

      {/* Emergency SOS Button */}
      <Pressable onPress={() => setSos(true)} style={dashStyles.sosTriggerButton}>
        <Ionicons name="warning-outline" size={18} color={colors.danger} />
        <Text style={dashStyles.sosTriggerText}>Emergency SOS</Text>
      </Pressable>

      {/* Transaction History Modal */}
      <TransactionHistoryModal
        visible={history}
        shiftId={shift.shiftId}
        transactions={shiftData.transactions}
        onClose={() => setHistory(false)}
      />

      {/* Break Confirm Modal */}
      <BreakConfirmModal
        visible={shiftData.breakConfirmOpen}
        isOnBreak={shiftData.isOnBreak}
        breakPending={shiftData.breakPending}
        onClose={() => shiftData.setBreakConfirmOpen(false)}
        onConfirm={async () => {
          if (await shiftData.updateBreak()) {
            shiftData.setBreakConfirmOpen(false);
          }
        }}
      />

      {/* Emergency SOS Modal */}
      <SosConfirmModal isOpen={sos} onClose={() => setSos(false)} />
    </ScreenShell>
  );
}
