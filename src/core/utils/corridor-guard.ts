import { ROUTE_POINTS } from "../../features/dashboard/route-data";
import { appHaptics } from "./haptics";
import * as Speech from "expo-speech";
import { isVoiceAnnouncerActive } from "./voice-announcer";

// Matches backend LocationService speed limit & admin monitoring threshold (50 km/h)
export const SPEED_LIMIT_KMH = 50;

// Warning zone threshold (45 km/h)
export const SPEED_WARNING_THRESHOLD_KMH = 45;

// Distance off franchise route to trigger corridor deviation alert (in meters)
export const CORRIDOR_DEVIATION_THRESHOLD_METERS = 300;

// Earth radius in meters
const EARTH_RADIUS_METERS = 6371000;

// Converts degrees to radians
function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

// Distance between two lat/lng coordinates in meters
function distanceBetween(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_METERS * c;
}

// Minimum distance from a point to a line segment in meters
function distanceToSegment(
  pLat: number,
  pLng: number,
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number
): number {
  const radLat = toRad((aLat + bLat) / 2);
  const cosLat = Math.cos(radLat);

  // Flat approximation around the local segment
  const ax = toRad(aLng) * cosLat;
  const ay = toRad(aLat);
  const bx = toRad(bLng) * cosLat;
  const by = toRad(bLat);
  const px = toRad(pLng) * cosLat;
  const py = toRad(pLat);

  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;

  if (lenSq === 0) {
    return distanceBetween(pLat, pLng, aLat, aLng);
  }

  // Projection parameter t clamped to [0, 1]
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lenSq));
  const projX = ax + t * dx;
  const projY = ay + t * dy;

  const distRad = Math.hypot(px - projX, py - projY);
  return distRad * EARTH_RADIUS_METERS;
}

/**
 * Calculates the shortest distance in meters from the vehicle's position to
 * any point on the authorized franchise corridor.
 */
export function getDistanceToCorridorMeters(lat: number, lng: number): number {
  if (ROUTE_POINTS.length < 2) return 0;

  let minDistance = Infinity;

  for (let i = 0; i < ROUTE_POINTS.length - 1; i++) {
    const ptA = ROUTE_POINTS[i];
    const ptB = ROUTE_POINTS[i + 1];
    if (!ptA || !ptB) continue;

    const [aLat, aLng] = ptA;
    const [bLat, bLng] = ptB;
    const dist = distanceToSegment(lat, lng, aLat, aLng, bLat, bLng);
    if (dist < minDistance) {
      minDistance = dist;
    }
  }

  return Math.round(minDistance);
}

// Cooldown tracker for voice warning to prevent rapid repeats
let lastOverspeedSpokenAt = 0;
const OVERSPEED_VOICE_COOLDOWN_MS = 20000; // 20 seconds

/**
 * Evaluates current GPS speed and triggers warning cues if exceeding the 50 km/h limit.
 */
export function evaluateSpeedWarning(speedMps: number | null | undefined): {
  speedKmh: number;
  isOverspeed: boolean;
  isNearLimit: boolean;
} {
  if (speedMps == null || !Number.isFinite(speedMps) || speedMps < 0) {
    return { speedKmh: 0, isOverspeed: false, isNearLimit: false };
  }

  // W3C Geolocation speed is m/s -> convert to km/h
  const speedKmh = Math.round(speedMps * 3.6);
  const isOverspeed = speedKmh > SPEED_LIMIT_KMH;
  const isNearLimit = !isOverspeed && speedKmh >= SPEED_WARNING_THRESHOLD_KMH;

  if (isOverspeed) {
    // Haptic feedback alert
    appHaptics.error();

    // Audible speech alert if voice announcer is enabled and cooldown has passed
    const now = Date.now();
    if (isVoiceAnnouncerActive() && now - lastOverspeedSpokenAt > OVERSPEED_VOICE_COOLDOWN_MS) {
      lastOverspeedSpokenAt = now;
      try {
        void Speech.speak(`Warning: ${speedKmh} kilometers per hour. Please slow down.`, {
          language: "en-US",
          rate: 1.0,
        });
      } catch {
        // Audio unavailable
      }
    }
  }

  return { speedKmh, isOverspeed, isNearLimit };
}
