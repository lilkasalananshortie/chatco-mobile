import type { CommuterType, FareConfig, FarePoint } from "../../core/domain/types";
import { ROUTE_POINTS } from "../dashboard/route-data";

export const DEFAULT_FARE_CONFIG: FareConfig = {
  baseBarangayCount: 4,
  baseFareRegular: 15,
  baseFareDiscounted: 12,
  succeedingFareRegular: 2.25,
  succeedingFareDiscounted: 1.75,
  totalPoints: 34,
};

export function formatCurrency(amount: number): string {
  return `₱${amount.toFixed(2)}`;
}

export function getCommuterTypeLabel(type: CommuterType): string {
  switch (type) {
    case "STUDENT":
      return "Student";
    case "SENIOR_CITIZEN":
      return "Senior Citizen";
    case "PWD":
      return "PWD";
    default:
      return "Regular";
  }
}

export function subDropoffPoints(point: FarePoint): string[] {
  return Array.from(
    new Set(
      [...(point.subStops ?? []), ...(point.landmarks ?? [])]
        .map((name) => name.trim())
        .filter(Boolean)
    )
  );
}

export function selectedPointName(point: FarePoint, subPoint: string | null): string {
  return subPoint ? `${point.name} · ${subPoint}` : point.name;
}

export function getFareBetween(
  from: FarePoint,
  to: FarePoint,
  config: FareConfig,
  isDiscounted: boolean
): number {
  if (from.pointNumber === to.pointNumber) {
    return isDiscounted ? config.baseFareDiscounted : config.baseFareRegular;
  }
  const rawFare = isDiscounted
    ? Math.abs(from.discountedFare - to.discountedFare)
    : Math.abs(from.regularFare - to.regularFare);
  return (
    Math.round(
      Math.max(rawFare, isDiscounted ? config.baseFareDiscounted : config.baseFareRegular) * 100
    ) / 100
  );
}

export function getBarangaysTraversed(from: FarePoint, to: FarePoint): number {
  return Math.abs(to.pointNumber - from.pointNumber) + 1;
}

export function findNearestPoint(
  lat: number,
  lng: number,
  points: FarePoint[]
): FarePoint | null {
  if (!points || points.length === 0) return null;

  const pointsWithCoords = points.filter(
    (p) =>
      typeof p.latitude === "number" &&
      typeof p.longitude === "number" &&
      Number.isFinite(p.latitude) &&
      Number.isFinite(p.longitude)
  );

  const rad = Math.PI / 180;
  const cosLat = Math.cos(lat * rad);

  if (pointsWithCoords.length > 0) {
    const firstCoordPoint = pointsWithCoords[0];
    if (!firstCoordPoint) return null;
    let nearest: FarePoint = firstCoordPoint;
    let minDistanceSq = Infinity;

    for (const pt of pointsWithCoords) {
      const dLat = pt.latitude! - lat;
      const dLng = (pt.longitude! - lng) * cosLat;
      const dSq = dLat * dLat + dLng * dLng;
      if (dSq < minDistanceSq) {
        minDistanceSq = dSq;
        nearest = pt;
      }
    }
    return nearest;
  }

  // Fallback: Map current coordinate to closest route vertex in ROUTE_POINTS, then interpolate to pointNumber
  if (ROUTE_POINTS.length > 0) {
    let nearestRouteIdx = 0;
    let minDistanceSq = Infinity;

    for (let i = 0; i < ROUTE_POINTS.length; i++) {
      const pt = ROUTE_POINTS[i];
      if (!pt) continue;
      const [rLat, rLng] = pt;
      const dLat = rLat - lat;
      const dLng = (rLng - lng) * cosLat;
      const dSq = dLat * dLat + dLng * dLng;
      if (dSq < minDistanceSq) {
        minDistanceSq = dSq;
        nearestRouteIdx = i;
      }
    }

    const ratio = nearestRouteIdx / Math.max(1, ROUTE_POINTS.length - 1);
    const targetPointNum = Math.min(
      points.length,
      Math.max(1, Math.round(ratio * (points.length - 1)) + 1)
    );
    const matched = points.find((p) => p.pointNumber === targetPointNum);
    return (matched ?? points[0]) ?? null;
  }

  return points[0] ?? null;
}
