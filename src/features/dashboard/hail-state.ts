import type { HailRequest } from "../../core/domain/types";
import { distanceMeters, PICKUP_RADIUS_METERS } from "./route-data";

/** Matches the server's accepted hold. Its expires_at replaces this once it answers. */
export const ACCEPTED_HOLD_MS = 120_000;

export const isAcceptedHail = (hail: Pick<HailRequest, "status">) => hail.status === "ACCEPTED";

export function hailExpiresAtMs(hail: Pick<HailRequest, "expiresAt">): number {
  const value = hail.expiresAt ? Date.parse(hail.expiresAt) : Number.NaN;
  return Number.isFinite(value) ? value : Number.POSITIVE_INFINITY;
}

/**
 * Only accepted pins are timed on the phone. Pending hails are already filtered
 * by the server, so a wrong device clock can't hide a new pickup request.
 */
export function activeHails(hails: HailRequest[], now = Date.now()): HailRequest[] {
  return hails.filter(hail => !isAcceptedHail(hail) || hailExpiresAtMs(hail) > now);
}

export function nextAcceptedExpiry(hails: HailRequest[], now = Date.now()): number | null {
  const times = hails
    .filter(isAcceptedHail)
    .map(hailExpiresAtMs)
    .filter(time => Number.isFinite(time) && time > now);
  return times.length ? Math.min(...times) : null;
}

/**
 * Keeps a just-accepted pin blue when a list request that started before the
 * accept returns it as pending. Entries clear once the server confirms or drops it.
 */
export function applyLocalAccepts(records: HailRequest[], accepted: Map<string, string>): HailRequest[] {
  const present = new Set(records.map(record => record.id));
  for (const id of [...accepted.keys()]) if (!present.has(id)) accepted.delete(id);
  return records.map(record => {
    if (isAcceptedHail(record)) {
      accepted.delete(record.id);
      return record;
    }
    const expiresAt = accepted.get(record.id);
    return expiresAt ? { ...record, status: "ACCEPTED" as const, expiresAt } : record;
  });
}

/** Accepted hails this unit drove past, so its cooldown on the commuter's side has ended. */
export function acceptedHailsOutOfRange(
  hails: HailRequest[],
  position?: { latitude: number; longitude: number } | null,
): string[] {
  if (!position) return [];
  return hails
    .filter(hail => isAcceptedHail(hail) && distanceMeters(position, hail) > PICKUP_RADIUS_METERS)
    .map(hail => hail.id);
}

/**
 * The server keeps returning an accepted hail until its timer ends or the
 * commuter hails again, so a released pin must stay hidden on later polls.
 */
export function withoutReleasedAccepts(hails: HailRequest[], released: ReadonlySet<string>): HailRequest[] {
  return hails.filter(hail => !(isAcceptedHail(hail) && released.has(hail.id)));
}

export function formatHailCountdown(milliseconds: number): string {
  const seconds = Math.max(0, Math.ceil(milliseconds / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

export const hailIdFromMarker = (markerId?: string | null): string | null =>
  markerId?.startsWith("hail-") ? markerId.slice("hail-".length) : null;
