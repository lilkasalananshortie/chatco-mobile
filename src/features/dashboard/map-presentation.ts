import type { Capacity } from "../../core/domain/types";
import { BUS_MARKER_SVGS } from "./bus-marker-assets";

export type BusFacing = keyof typeof BUS_MARKER_SVGS;
export type TripDirection = "SOUTHBOUND" | "NORTHBOUND";
type Coordinate = readonly [number, number];

export const JEEPNEY_PATH = "M19,13V7H20V4H4V7H5V13H2C2,13.93 2.5,14.71 3.5,14.93V20A1,1 0 0,0 4.5,21H5.5A1,1 0 0,0 6.5,20V19H17.5V20A1,1 0 0,0 18.5,21H19.5A1,1 0 0,0 20.5,20V14.93C21.5,14.7 22,13.93 22,13H19M8,15A1.5,1.5 0 0,1 6.5,13.5A1.5,1.5 0 0,1 8,12A1.5,1.5 0 0,1 9.5,13.5A1.5,1.5 0 0,1 8,15M16,15A1.5,1.5 0 0,1 14.5,13.5A1.5,1.5 0 0,1 16,12A1.5,1.5 0 0,1 17.5,13.5A1.5,1.5 0 0,1 16,15M17.5,10.5C15.92,10.18 14.03,10 12,10C9.97,10 8,10.18 6.5,10.5V7H17.5V10.5Z";
export const ACCOUNT_PATH = "M12,4A4,4 0 0,1 16,8A4,4 0 0,1 12,12A4,4 0 0,1 8,8A4,4 0 0,1 12,4M12,14C16.42,14 20,15.79 20,18V20H4V18C4,15.79 7.58,14 12,14Z";

export function markerPresentation(capacity: Capacity = "AVAILABLE", onBreak = false) {
  return onBreak ? { color: "#38BDF8", label: "On Break" }
    : capacity === "STANDING" ? { color: "#FBBF24", label: "Standing" }
    : capacity === "FULL" ? { color: "#F87171", label: "Full" }
    : { color: "#34D399", label: "Available" };
}

function facingFor(bearing: number): BusFacing {
  return (["n", "ne", "e", "se", "s", "sw", "w", "nw"] as const)[Math.round(bearing / 45) % 8]!;
}

/** Match the web map's route-oriented, eight-facing jeep artwork. */
export function vehicleHeading(route: Coordinate[], position: Coordinate, direction: TripDirection = "SOUTHBOUND") {
  if (route.length < 2 || !position.every(Number.isFinite)) return { facing: "s" as BusFacing, arrow: null as number | null };

  const lat0 = route.reduce((sum, point) => sum + point[0], 0) / route.length;
  const kx = 111_320 * Math.cos((lat0 * Math.PI) / 180);
  const x = route.map(([, lng]) => lng * kx);
  const y = route.map(([lat]) => lat * 111_320);
  const along = [0];
  for (let i = 1; i < route.length; i++) along.push(along[i - 1]! + Math.hypot(x[i]! - x[i - 1]!, y[i]! - y[i - 1]!));
  const px = position[1] * kx, py = position[0] * 111_320;
  let bestDistance = Infinity, at = 0;
  for (let i = 1; i < route.length; i++) {
    const dx = x[i]! - x[i - 1]!, dy = y[i]! - y[i - 1]!;
    const lengthSquared = dx * dx + dy * dy;
    const t = lengthSquared ? Math.min(1, Math.max(0, ((px - x[i - 1]!) * dx + (py - y[i - 1]!) * dy) / lengthSquared)) : 0;
    const distanceSquared = (x[i - 1]! + t * dx - px) ** 2 + (y[i - 1]! + t * dy - py) ** 2;
    if (distanceSquared < bestDistance) {
      bestDistance = distanceSquared;
      at = along[i - 1]! + t * Math.sqrt(lengthSquared);
    }
  }
  const pointAt = (distance: number): Coordinate => {
    const d = Math.min(along[along.length - 1]!, Math.max(0, distance));
    let lo = 1, hi = along.length - 1;
    while (lo < hi) { const mid = (lo + hi) >> 1; if (along[mid]! < d) lo = mid + 1; else hi = mid; }
    const span = along[lo]! - along[lo - 1]!;
    const t = span > 0 ? (d - along[lo - 1]!) / span : 0;
    return [x[lo - 1]! + t * (x[lo]! - x[lo - 1]!), y[lo - 1]! + t * (y[lo]! - y[lo - 1]!)];
  };
  const sign = direction === "NORTHBOUND" ? -1 : 1;
  const bearing = (lookahead: number) => {
    const total = along[along.length - 1]!;
    let from = at, to = Math.min(total, Math.max(0, at + sign * lookahead));
    if (Math.abs(to - from) < 1) { from = Math.min(total, Math.max(0, at - sign * lookahead)); to = at; }
    const [ax, ay] = pointAt(from), [bx, by] = pointAt(to);
    return ((Math.atan2(bx - ax, by - ay) * 180 / Math.PI + 360) % 360 + 360) % 360;
  };
  const busBearing = bearing(100), arrowBearing = bearing(30);
  return { facing: facingFor(busBearing), arrow: (Math.round(arrowBearing / 15) * 15) % 360 };
}

export function vehicleMarkerSvg(capacity?: Capacity, onBreak?: boolean, direction: TripDirection = "SOUTHBOUND", route: Coordinate[] = [], position: Coordinate = [Number.NaN, Number.NaN]) {
  const { color } = markerPresentation(capacity, onBreak);
  const { facing, arrow } = vehicleHeading(route, position, direction);
  const arrowMarkup = arrow === null ? "" : (() => {
    const x = 43 + 34 * Math.sin(arrow * Math.PI / 180) - 9;
    const y = 40 - 31 * Math.cos(arrow * Math.PI / 180) - 9;
    return `<svg x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="18" height="18" viewBox="0 0 24 24"><path d="M12 2.5 20 20 12 15.5 4 20Z" transform="rotate(${arrow} 12 12)" fill="#1A5FB4" stroke="#ffffff" stroke-width="2" stroke-linejoin="round"/></svg>`;
  })();
  const busMarkup = BUS_MARKER_SVGS[facing].replace(/^<svg[^>]*>/, "").replace("</svg>", "");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="86" height="80" viewBox="0 0 86 80"><svg x="17" y="17" width="52" height="46" viewBox="-48 -56 96 84">${busMarkup}</svg><circle cx="25" cy="25" r="6" fill="${color}" stroke="#071A2E" stroke-width="2"/>${arrowMarkup}</svg>`;
}

export function vehicleMarkerDataUri(...args: Parameters<typeof vehicleMarkerSvg>) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(vehicleMarkerSvg(...args))}`;
}

export function vehicleMarkerHtml(capacity?: Capacity, onBreak?: boolean, _surfaceColor = "#071A2E", direction: TripDirection = "SOUTHBOUND", route: Coordinate[] = [], position: Coordinate = [Number.NaN, Number.NaN]) {
  const { label } = markerPresentation(capacity, onBreak);
  const image = vehicleMarkerDataUri(capacity, onBreak, direction, route, position);
  return `<div aria-label="${label}" style="width:86px;height:80px;display:flex;align-items:center;justify-content:center"><img src="${image}" width="86" height="80" alt="" draggable="false" style="display:block;width:86px;height:80px;pointer-events:none" /></div>`;
}

export const HAIL_MARKER_HTML = `<div style="width:30px;height:30px;box-sizing:border-box;background:#FF6D3A;border:2px solid white;border-radius:50%;display:flex;align-items:center;justify-content:center"><svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="${ACCOUNT_PATH}"/></svg></div>`;
