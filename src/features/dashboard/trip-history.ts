import type { TripCycleState, TripRecord } from "../../core/utils/trip-cycle-tracker";

export interface TripDayGroup {
  dayKey: string;
  trips: TripRecord[];
}

function localDayKey(timestamp: string): string {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "unknown";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Group the active-shift trip log by the conductor device's local calendar day. */
export function groupTripsByDay(state: TripCycleState | null): TripDayGroup[] {
  if (!state) return [];

  const trips = [...state.completedTrips, state.activeTrip];
  const groups = new Map<string, TripRecord[]>();

  for (const trip of trips) {
    const key = localDayKey(trip.startedAt);
    const group = groups.get(key) ?? [];
    group.push(trip);
    groups.set(key, group);
  }

  return [...groups.entries()]
    .sort(([left], [right]) => right.localeCompare(left))
    .map(([dayKey, dayTrips]) => ({
      dayKey,
      trips: dayTrips.sort((left, right) => left.startedAt.localeCompare(right.startedAt)),
    }));
}
