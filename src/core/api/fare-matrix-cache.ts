import type { FareConfig, FareMatrix, FarePoint } from "../domain/types";
import { appStorage } from "../storage/app-storage";

const PREFIX = "chatco_published_fares_v2:";
export const FARE_CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000;
export const CURRENT_FARE_DEFAULTS: FareConfig = {
  baseBarangayCount: 4, baseFareRegular: 17, baseFareDiscounted: 13.6,
  succeedingFareRegular: 2.25, succeedingFareDiscounted: 1.8, totalPoints: 0,
};
function list(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value !== "string") return [];
  try { const parsed = JSON.parse(value); if (Array.isArray(parsed)) return parsed.map(String); } catch { /* Older matrices use comma-separated landmarks. */ }
  return value.split(",").map((v) => v.trim()).filter(Boolean);
}
export function normalizePublishedFares(raw: any, requestedRoute?: string): FareMatrix {
  if (!Array.isArray(raw?.points) || raw.points.length === 0) throw new Error("No published fare matrix is available. Reconnect and refresh before collecting fares.");
  if (requestedRoute && raw.route?.id && raw.route.id !== requestedRoute) throw new Error("The fare matrix belongs to a different route.");
  const points: FarePoint[] = raw.points.map((p: any) => ({
    id: String(p.id ?? ""), pointNumber: Number(p.pointNumber ?? p.point_number), code: String(p.code ?? ""), name: String(p.name ?? ""),
    landmarks: list(p.landmarks), subStops: list(p.subStops ?? p.sub_stops),
    latitude: p.latitude == null ? undefined : Number(p.latitude), longitude: p.longitude == null ? undefined : Number(p.longitude),
    regularFare: Number(p.regularFare ?? p.regular_fare), discountedFare: Number(p.discountedFare ?? p.discounted_fare),
  }));
  if (points.some((p) => !p.id || !p.name || !Number.isFinite(p.pointNumber) || !Number.isFinite(p.regularFare) || p.regularFare < 0 || !Number.isFinite(p.discountedFare) || p.discountedFare < 0)
    || new Set(points.map((p) => p.id)).size !== points.length) throw new Error("The published fare matrix is invalid. Refresh before collecting fares.");
  const config = Object.fromEntries(Object.entries(CURRENT_FARE_DEFAULTS).map(([key, fallback]) => [key, Number(raw.config?.[key] ?? fallback)])) as unknown as FareConfig;
  config.totalPoints = points.length;
  if (Object.entries(config).some(([key, value]) => !Number.isFinite(value) || (key === "totalPoints" ? value < 0 : value <= 0))) throw new Error("The published fare configuration is invalid.");
  return { points, config, routeId: raw.route?.id ?? raw.routeId ?? requestedRoute };
}
export async function savePublishedFares(matrix: FareMatrix, routeId?: string, at = Date.now()): Promise<void> {
  await appStorage.setItem(PREFIX + (routeId ?? "active"), JSON.stringify({ version: 2, savedAt: at, matrix }));
}
export async function cachedPublishedFares(routeId?: string, at = Date.now()): Promise<FareMatrix | null> {
  const stored = await appStorage.getItem(PREFIX + (routeId ?? "active"));
  if (!stored) return null;
  try {
    const data = JSON.parse(stored);
    if (data.version !== 2 || !Number.isFinite(data.savedAt) || data.savedAt > at || at - data.savedAt > FARE_CACHE_MAX_AGE_MS) return null;
    if (routeId && data.matrix?.routeId !== routeId) return null;
    const matrix = normalizePublishedFares(data.matrix, routeId);
    return { ...matrix, isCached: true, loadedAt: data.savedAt };
  } catch { return null; } // Never replace corrupted cache or invent fare points.
}
