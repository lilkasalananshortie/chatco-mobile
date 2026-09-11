import { appStorage } from "../storage/app-storage";
import type { Transaction } from "../domain/types";
import { distanceMeters, type RouteCoordinate } from "../../features/dashboard/route-data";

export type TripDirection = "SOUTHBOUND" | "NORTHBOUND";

export interface TripRecord {
  tripId: string;
  shiftId: string;
  tripNumber: number;
  direction: TripDirection;
  originTerminal: string;
  destinationTerminal: string;
  startedAt: string; // ISO string
  completedAt: string | null; // ISO string when turnaround occurred
  status: "ACTIVE" | "COMPLETED";
  paxCount?: number;
  revenue?: number;
  cashAmount?: number;
  gcashAmount?: number;
}

export interface TripCycleState {
  shiftId: string;
  currentTripNumber: number;
  activeTrip: TripRecord;
  completedTrips: TripRecord[];
  autoTurnaroundDetected?: {
    terminalName: string;
    detectedAt: string;
  } | null;
}

export interface TripStats {
  paxCount: number;
  revenue: number;
  cashAmount: number;
  gcashAmount: number;
  durationMinutes: number;
}

// ─── Terminal Geofence Definitions ───────────────────────────────────────────
// Northbound Terminus: Calumpit Poblacion / Terminal
export const CALUMPIT_TERMINAL: RouteCoordinate & { name: string } = {
  name: "Calumpit Terminal",
  latitude: 14.925460996033356,
  longitude: 120.76512235423647,
};

// Southbound Terminus: Meycauayan Banga / Terminal
export const MEYCAUAYAN_TERMINAL: RouteCoordinate & { name: string } = {
  name: "Meycauayan Terminal",
  latitude: 14.725646764905104,
  longitude: 120.9604838112117,
};

export const TERMINAL_GEOFENCE_RADIUS_METERS = 550;
export const MIN_TRIP_DURATION_BEFORE_TURNAROUND_MS = 2 * 60 * 1000; // 2 minutes to prevent immediate re-trigger

export function getShiftTripStorageKey(shiftId: string): string {
  return `chatco_trip_cycle_${shiftId}`;
}

export function computeTripStats(trip: TripRecord, transactions: Transaction[]): TripStats {
  const tripStart = new Date(trip.startedAt).getTime();
  const tripEnd = trip.completedAt ? new Date(trip.completedAt).getTime() : Date.now();

  const tripTxns = transactions.filter(t => {
    const time = t.timestamp;
    return time >= tripStart && time <= tripEnd;
  });

  let cash = 0;
  let gcash = 0;
  let pax = 0;

  for (const t of tripTxns) {
    pax += t.totalPassengers ?? 1;
    if (t.paymentMethod === "Cash") {
      cash += t.finalAmount;
    } else if (t.paymentMethod === "GCash") {
      gcash += t.finalAmount;
    }
  }

  const durationMinutes = Math.max(1, Math.round((tripEnd - tripStart) / 60000));

  return {
    paxCount: pax,
    revenue: cash + gcash,
    cashAmount: cash,
    gcashAmount: gcash,
    durationMinutes,
  };
}

export function createInitialTripCycleState(shiftId: string, shiftTimeIn?: string): TripCycleState {
  const startedAt = shiftTimeIn || new Date().toISOString();
  const initialTrip: TripRecord = {
    tripId: `${shiftId}_trip_1`,
    shiftId,
    tripNumber: 1,
    direction: "SOUTHBOUND",
    originTerminal: CALUMPIT_TERMINAL.name,
    destinationTerminal: MEYCAUAYAN_TERMINAL.name,
    startedAt,
    completedAt: null,
    status: "ACTIVE",
  };

  return {
    shiftId,
    currentTripNumber: 1,
    activeTrip: initialTrip,
    completedTrips: [],
    autoTurnaroundDetected: null,
  };
}

export async function loadTripCycleState(
  shiftId: string,
  shiftTimeIn?: string,
): Promise<TripCycleState> {
  try {
    const raw = await appStorage.getItem(getShiftTripStorageKey(shiftId));
    if (raw) {
      const parsed = JSON.parse(raw) as TripCycleState;
      if (parsed && parsed.shiftId === shiftId && parsed.activeTrip) {
        return parsed;
      }
    }
  } catch {}

  const fresh = createInitialTripCycleState(shiftId, shiftTimeIn);
  await saveTripCycleState(fresh);
  return fresh;
}

export async function saveTripCycleState(state: TripCycleState): Promise<void> {
  try {
    await appStorage.setItem(getShiftTripStorageKey(state.shiftId), JSON.stringify(state));
  } catch {}
}

export function evaluateTerminalArrival(
  latitude: number,
  longitude: number,
  state: TripCycleState,
): { isAtTerminal: boolean; terminalName: string | null } {
  const currentCoord: RouteCoordinate = { latitude, longitude };
  const distToCalumpit = distanceMeters(currentCoord, CALUMPIT_TERMINAL);
  const distToMeycauayan = distanceMeters(currentCoord, MEYCAUAYAN_TERMINAL);

  const tripElapsed = Date.now() - new Date(state.activeTrip.startedAt).getTime();
  if (tripElapsed < MIN_TRIP_DURATION_BEFORE_TURNAROUND_MS) {
    return { isAtTerminal: false, terminalName: null };
  }

  // If vehicle is traveling SOUTHBOUND towards Meycauayan Terminal
  if (state.activeTrip.direction === "SOUTHBOUND" && distToMeycauayan <= TERMINAL_GEOFENCE_RADIUS_METERS) {
    return { isAtTerminal: true, terminalName: MEYCAUAYAN_TERMINAL.name };
  }

  // If vehicle is traveling NORTHBOUND towards Calumpit Terminal
  if (state.activeTrip.direction === "NORTHBOUND" && distToCalumpit <= TERMINAL_GEOFENCE_RADIUS_METERS) {
    return { isAtTerminal: true, terminalName: CALUMPIT_TERMINAL.name };
  }

  return { isAtTerminal: false, terminalName: null };
}

export function completeAndAdvanceTrip(
  currentState: TripCycleState,
  transactions: Transaction[],
): TripCycleState {
  const now = new Date().toISOString();
  const activeStats = computeTripStats(currentState.activeTrip, transactions);

  const finalizedTrip: TripRecord = {
    ...currentState.activeTrip,
    completedAt: now,
    status: "COMPLETED",
    paxCount: activeStats.paxCount,
    revenue: activeStats.revenue,
    cashAmount: activeStats.cashAmount,
    gcashAmount: activeStats.gcashAmount,
  };

  const nextTripNumber = currentState.currentTripNumber + 1;
  const nextDirection: TripDirection =
    currentState.activeTrip.direction === "SOUTHBOUND" ? "NORTHBOUND" : "SOUTHBOUND";
  const nextOrigin = currentState.activeTrip.destinationTerminal;
  const nextDest = currentState.activeTrip.originTerminal;

  const nextActiveTrip: TripRecord = {
    tripId: `${currentState.shiftId}_trip_${nextTripNumber}`,
    shiftId: currentState.shiftId,
    tripNumber: nextTripNumber,
    direction: nextDirection,
    originTerminal: nextOrigin,
    destinationTerminal: nextDest,
    startedAt: now,
    completedAt: null,
    status: "ACTIVE",
  };

  return {
    shiftId: currentState.shiftId,
    currentTripNumber: nextTripNumber,
    activeTrip: nextActiveTrip,
    completedTrips: [finalizedTrip, ...currentState.completedTrips],
    autoTurnaroundDetected: null,
  };
}

export function switchActiveTripDirection(currentState: TripCycleState): TripCycleState {
  const toggledDirection: TripDirection =
    currentState.activeTrip.direction === "SOUTHBOUND" ? "NORTHBOUND" : "SOUTHBOUND";
  const origin = currentState.activeTrip.destinationTerminal;
  const dest = currentState.activeTrip.originTerminal;

  return {
    ...currentState,
    activeTrip: {
      ...currentState.activeTrip,
      direction: toggledDirection,
      originTerminal: origin,
      destinationTerminal: dest,
    },
    autoTurnaroundDetected: null,
  };
}

export function undoLastTurnaround(currentState: TripCycleState): TripCycleState {
  if (currentState.completedTrips.length === 0) return currentState;

  const lastCompleted = currentState.completedTrips[0];
  if (!lastCompleted) return currentState;

  const remainingCompleted = currentState.completedTrips.slice(1);
  const restoredActive: TripRecord = {
    ...lastCompleted,
    completedAt: null,
    status: "ACTIVE",
  };

  return {
    shiftId: currentState.shiftId,
    currentTripNumber: lastCompleted.tripNumber,
    activeTrip: restoredActive,
    completedTrips: remainingCompleted,
    autoTurnaroundDetected: null,
  };
}
