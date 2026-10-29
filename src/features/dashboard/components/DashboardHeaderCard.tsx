import { useState } from "react";
import { Image, Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "../../../shared/ui/BrandText";
import { ConductorIcon } from "../../../shared/ui/ConductorIcon";
import type { Capacity, Shift } from "../../../core/domain/types";

export interface DashboardHeaderCardProps {
  profilePictureUrl?: string | null;
  shift: Shift;
  dashStyles: any;
  colors: any;
  isLofi: boolean;
  canOperate: boolean;
  isOnBreak: boolean;
  breakPending: boolean;
  onOpenBreakConfirm: () => void;
  capacity: Capacity;
  onUpdateCapacity: (cap: Capacity) => void;
  onOpenHistory: () => void;
  onOpenActions?: () => void;
  totals: { total: number; cash: number; gcash: number; voucher?: number };
  pendingOfflineCount: number;
}

const peso = (amount: number) => new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);

/** Native translation of conductor/dashboard/mobile-dashboard-card.tsx. */
export function DashboardHeaderCard({ profilePictureUrl, shift, dashStyles: s, isLofi, canOperate, isOnBreak, breakPending, onOpenBreakConfirm, capacity, onUpdateCapacity, onOpenHistory, onOpenActions, totals, pendingOfflineCount }: DashboardHeaderCardProps) {
  const [failedPhoto, setFailedPhoto] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(true);
  const text = isLofi ? "#111827" : "#FFFFFF";
  const muted = isLofi ? "#6B7280" : "rgba(255,255,255,0.4)";
  const status = isOnBreak ? "On Break" : capacity === "AVAILABLE" ? "Available" : capacity === "STANDING" ? "Standing" : "Full";

  return <View style={s.cardWrapper}>
    <View style={s.topRow}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text numberOfLines={1} style={s.unitTitle}>Unit: {shift.unitNumber}</Text>
        <Text numberOfLines={1} style={s.routeSubtitle}>{shift.route}</Text>
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel={`${shift.conductorName}, ${isOnBreak ? "on break" : "on duty"}. Open conductor actions`} onPress={onOpenActions} hitSlop={6} style={[s.avatarCircle, { backgroundColor: isOnBreak ? "#0EA5E9" : "#1A5FB4", borderColor: isOnBreak ? "#7DD3FC" : isLofi ? "#DAEEFF" : "rgba(255,255,255,0.2)" }]}>
        {profilePictureUrl && failedPhoto !== profilePictureUrl
          ? <Image source={{ uri: profilePictureUrl }} onError={() => setFailedPhoto(profilePictureUrl)} style={{ width: "100%", height: "100%" }} />
          : <Ionicons name="person" size={16} color="#FFFFFF" />}
      </Pressable>
    </View>
    {expanded ? <View style={{ paddingHorizontal: 16, paddingBottom: 12, gap: 12 }}>
      <Pressable accessibilityRole="button" accessibilityState={{ disabled: !canOperate || breakPending }} disabled={!canOperate || breakPending} onPress={onOpenBreakConfirm} style={[s.breakButton, (!canOperate || breakPending) && { opacity: 0.6 }]}>
        <ConductorIcon name={isOnBreak ? "play" : "pause"} size={14} color={isLofi ? "#6B7280" : "rgba(255,255,255,0.6)"} strokeWidth={2.25} />
        <Text style={s.breakButtonText}>{breakPending ? "Updating..." : isOnBreak ? "Resume Duty" : "Take a Break"}</Text>
      </Pressable>
      <View style={s.statusHistoryRow}>
        <View style={s.statusBox}>
          <View style={s.statusIndicatorRow}>
            <View style={[s.statusDot, { backgroundColor: isOnBreak ? "#38BDF8" : capacity === "AVAILABLE" ? "#34D399" : capacity === "STANDING" ? "#FBBF24" : "#F87171" }]} />
            <Text style={s.statusHeaderLabel}>Status</Text>
            <Text style={[s.statusCurrentValue, isOnBreak && { color: isLofi ? "#0369A1" : "#7DD3FC" }]}>{status}</Text>
          </View>
          <View style={s.chipsRow}>
            {(["AVAILABLE", "STANDING", "FULL"] as Capacity[]).map((value) => {
              const selected = capacity === value;
              return <Pressable key={value} accessibilityRole="button" accessibilityState={{ selected, disabled: isOnBreak || !canOperate }} disabled={isOnBreak || !canOperate} onPress={() => onUpdateCapacity(value)} style={[s.chip, selected && s.chipSelected, (isOnBreak || !canOperate) && { opacity: 0.4 }]}>
                <Text style={[s.chipText, selected && { color: "#FFFFFF" }]}>{value === "AVAILABLE" ? "Available" : value === "STANDING" ? "Standing" : "Full"}</Text>
              </Pressable>;
            })}
          </View>
        </View>
        <Pressable accessibilityRole="button" onPress={onOpenHistory} style={s.historyButton}>
          <ConductorIcon name="history" size={14} color={isLofi ? "#374151" : "rgba(255,255,255,0.7)"} strokeWidth={1.5} />
          <Text style={s.historyButtonText}>History</Text>
        </Pressable>
      </View>
      <View style={s.totalCollectedCard}>
        <View style={s.totalCollectedTop}>
          <Text style={s.totalCollectedLabel}>Total Collected</Text>
          <Text style={s.totalCollectedAmount}>{peso(totals.total)}</Text>
        </View>
        <View style={{ flexDirection: "row", gap: 8 }}>
          {[{ label: "GCash", value: totals.gcash }, { label: "Cash", value: totals.cash }].map(item => <View key={item.label} style={s.colCard}>
            <Text style={s.colLabel}>{item.label}</Text>
            <Text style={s.colValue}>{peso(item.value)}</Text>
          </View>)}
        </View>
      </View>
      {pendingOfflineCount > 0 ? <Text style={{ color: muted, fontSize: 10 }}>{pendingOfflineCount} cash transaction{pendingOfflineCount === 1 ? "" : "s"} waiting to sync</Text> : null}
    </View> : null}
    <Pressable accessibilityRole="button" accessibilityState={{ expanded }} accessibilityLabel={expanded ? "Collapse dashboard card" : "Expand dashboard card"} onPress={() => setExpanded(value => !value)} style={s.collapseButton}>
      <ConductorIcon name={expanded ? "down" : "up"} size={16} color={isLofi ? "#9CA3AF" : "rgba(255,255,255,0.3)"} strokeWidth={2} />
    </Pressable>
  </View>;
}
