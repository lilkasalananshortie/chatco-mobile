import type { CommuterType, FareConfig, FarePoint } from "../../core/domain/types";

export const DEFAULT_FARE_CONFIG: FareConfig = {
  baseBarangayCount: 4,
  baseFareRegular: 17,
  baseFareDiscounted: 13.6,
  succeedingFareRegular: 2.25,
  succeedingFareDiscounted: 1.8,
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
    case "SENIOR":
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
  // Match Laravel FareRules: both endpoints count as traversed barangays.
  // Stored stop fares are for trips from stop 1, not cumulative distances.
  const round = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;
  const traversed = getBarangaysTraversed(from, to);
  const regular = round(config.baseFareRegular + Math.max(0, traversed - config.baseBarangayCount) * config.succeedingFareRegular);
  const rate = config.discountRate ?? ((1 - config.baseFareDiscounted / config.baseFareRegular) * 100);
  return isDiscounted ? round(regular * (100 - rate) / 100) : regular;
}

export function getBarangaysTraversed(from: FarePoint, to: FarePoint): number {
  return Math.abs(to.pointNumber - from.pointNumber) + 1;
}
