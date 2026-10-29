/// <reference types="jest" />
import { groupTripsByDay } from "../trip-history";
import type { TripCycleState, TripRecord } from "../../../core/utils/trip-cycle-tracker";

function trip(tripNumber: number, startedAt: string, status: TripRecord["status"] = "COMPLETED"): TripRecord {
  return {
    tripId: `shift-trip-${tripNumber}`,
    shiftId: "shift-1",
    tripNumber,
    direction: tripNumber % 2 === 0 ? "NORTHBOUND" : "SOUTHBOUND",
    originTerminal: "Origin",
    destinationTerminal: "Destination",
    startedAt,
    completedAt: status === "COMPLETED" ? startedAt : null,
    status,
  };
}

function localTimestamp(year: number, month: number, day: number, hour: number): string {
  return new Date(year, month - 1, day, hour).toISOString();
}

function localKey(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

test("trip log groups records by local day and keeps each day's trips chronological", () => {
  const state: TripCycleState = {
    shiftId: "shift-1",
    currentTripNumber: 3,
    activeTrip: trip(3, localTimestamp(2026, 10, 27, 15), "ACTIVE"),
    completedTrips: [trip(2, localTimestamp(2026, 10, 27, 12)), trip(1, localTimestamp(2026, 10, 26, 9))],
  };

  const groups = groupTripsByDay(state);
  expect(groups.map(group => group.dayKey)).toEqual([localKey(2026, 10, 27), localKey(2026, 10, 26)]);
  expect(groups[0]!.trips.map(record => record.tripNumber)).toEqual([2, 3]);
  expect(groups[1]!.trips.map(record => record.tripNumber)).toEqual([1]);
});

test("trip log is empty until a shift trip cycle is available", () => {
  expect(groupTripsByDay(null)).toEqual([]);
});
