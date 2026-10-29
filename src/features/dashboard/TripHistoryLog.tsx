import { useMemo } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "../../core/theme/ThemeProvider";
import type { TripCycleState, TripRecord } from "../../core/utils/trip-cycle-tracker";
import { groupTripsByDay } from "./trip-history";
import { Text } from "../../shared/ui/BrandText";
import { View } from "react-native";

function formatTime(timestamp: string): string {
  const date = new Date(timestamp);
  return Number.isNaN(date.getTime()) ? "Time unavailable" : date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function formatDay(dayKey: string): string {
  if (dayKey === "unknown") return "Date unavailable";
  const year = Number(dayKey.slice(0, 4));
  const month = Number(dayKey.slice(5, 7));
  const day = Number(dayKey.slice(8, 10));
  return new Date(year, month - 1, day).toLocaleDateString([], { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}

function TripLogEntry({ trip, isLofi }: { trip: TripRecord; isLofi: boolean }) {
  const completed = trip.status === "COMPLETED";
  const line = isLofi ? "#E5E7EB" : "rgba(255,255,255,0.1)";
  const text = isLofi ? "#111827" : "#FFFFFF";
  const muted = isLofi ? "#6B7280" : "rgba(255,255,255,0.55)";
  const stateColor = completed ? (isLofi ? "#16705A" : "#34D399") : (isLofi ? "#0369A1" : "#7DD3FC");
  const timeLabel = `${formatTime(trip.startedAt)} – ${trip.completedAt ? formatTime(trip.completedAt) : "In progress"}`;

  return (
    <View style={{ flexDirection: "row", gap: 12, paddingHorizontal: 20 }}>
      <View style={{ width: 20, alignItems: "center" }}>
        <View style={{ width: 10, height: 10, marginTop: 15, borderRadius: 5, backgroundColor: stateColor }} />
        <View style={{ width: 1, flex: 1, minHeight: 12, backgroundColor: line }} />
      </View>
      <View style={{ flex: 1, marginBottom: 10, padding: 12, borderWidth: 1, borderColor: line, borderRadius: 12, backgroundColor: isLofi ? "#FFFFFF" : "rgba(255,255,255,0.03)" }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <Text style={{ flex: 1, color: text, fontSize: 13, fontWeight: "800" }}>Trip #{trip.tripNumber} · {trip.direction === "SOUTHBOUND" ? "Southbound" : "Northbound"}</Text>
          <Text style={{ color: stateColor, fontSize: 9, fontWeight: "800", letterSpacing: 0.5 }}>{completed ? "COMPLETED" : "IN PROGRESS"}</Text>
        </View>
        <Text style={{ marginTop: 5, color: muted, fontSize: 12, lineHeight: 18 }}>{trip.originTerminal} → {trip.destinationTerminal}</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 5, marginTop: 8 }}>
          <Ionicons name="time-outline" size={13} color={muted} />
          <Text style={{ color: muted, fontSize: 11 }}>{timeLabel}</Text>
        </View>
        {trip.paxCount != null ? <Text style={{ marginTop: 6, color: muted, fontSize: 11 }}>{trip.paxCount} passenger{trip.paxCount === 1 ? "" : "s"} recorded</Text> : null}
      </View>
    </View>
  );
}

export function TripHistoryLog({ state }: { state: TripCycleState | null }) {
  const { isLofi } = useAppTheme();
  const groups = useMemo(() => groupTripsByDay(state), [state]);
  const text = isLofi ? "#111827" : "#FFFFFF";
  const muted = isLofi ? "#6B7280" : "rgba(255,255,255,0.55)";

  if (!state) {
    return <View accessibilityRole="progressbar" style={{ flex: 1, minHeight: 180, alignItems: "center", justifyContent: "center", padding: 24 }}>
      <Text style={{ color: muted, fontSize: 12 }}>Loading trip log…</Text>
    </View>;
  }

  if (groups.length === 0) {
    return <View style={{ flex: 1, minHeight: 180, alignItems: "center", justifyContent: "center", padding: 24 }}>
      <Ionicons name="map-outline" size={30} color={muted} />
      <Text style={{ marginTop: 10, color: text, fontSize: 14, fontWeight: "700" }}>No trips logged yet</Text>
      <Text style={{ maxWidth: 270, marginTop: 4, color: muted, fontSize: 12, lineHeight: 18, textAlign: "center" }}>Trip records for this shift will appear here, grouped by day.</Text>
    </View>;
  }

  return <View style={{ paddingTop: 16, paddingBottom: 8 }}>
    <View style={{ paddingHorizontal: 20, paddingBottom: 12 }}>
      <Text style={{ color: muted, fontSize: 11, lineHeight: 17 }}>Trips recorded for this shift, grouped by day.</Text>
    </View>
    {groups.map(group => <View key={group.dayKey}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, paddingHorizontal: 20, paddingTop: 8, paddingBottom: 10 }}>
        <Text style={{ color: text, fontSize: 12, fontWeight: "800" }}>{formatDay(group.dayKey)}</Text>
        <Text style={{ color: muted, fontSize: 10 }}>{group.trips.length} trip{group.trips.length === 1 ? "" : "s"}</Text>
      </View>
      {group.trips.map((trip, index) => <TripLogEntry key={`${trip.tripId}-${index}`} trip={trip} isLofi={isLofi} />)}
    </View>)}
  </View>;
}
