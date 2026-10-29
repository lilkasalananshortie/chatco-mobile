import type { Capacity } from "../../core/domain/types";

export const JEEPNEY_PATH = "M19,13V7H20V4H4V7H5V13H2C2,13.93 2.5,14.71 3.5,14.93V20A1,1 0 0,0 4.5,21H5.5A1,1 0 0,0 6.5,20V19H17.5V20A1,1 0 0,0 18.5,21H19.5A1,1 0 0,0 20.5,20V14.93C21.5,14.7 22,13.93 22,13H19M8,15A1.5,1.5 0 0,1 6.5,13.5A1.5,1.5 0 0,1 8,12A1.5,1.5 0 0,1 9.5,13.5A1.5,1.5 0 0,1 8,15M16,15A1.5,1.5 0 0,1 14.5,13.5A1.5,1.5 0 0,1 16,12A1.5,1.5 0 0,1 17.5,13.5A1.5,1.5 0 0,1 16,15M17.5,10.5C15.92,10.18 14.03,10 12,10C9.97,10 8,10.18 6.5,10.5V7H17.5V10.5Z";
export const ACCOUNT_PATH = "M12,4A4,4 0 0,1 16,8A4,4 0 0,1 12,12A4,4 0 0,1 8,8A4,4 0 0,1 12,4M12,14C16.42,14 20,15.79 20,18V20H4V18C4,15.79 7.58,14 12,14Z";

export function markerPresentation(capacity: Capacity = "AVAILABLE", onBreak = false) {
  return onBreak ? { color: "#38BDF8", glow: "rgba(56,189,248,0.35)", label: "On Break" }
    : capacity === "STANDING" ? { color: "#FBBF24", glow: "rgba(251,191,36,0.35)", label: "Standing" }
    : capacity === "FULL" ? { color: "#F87171", glow: "rgba(248,113,113,0.35)", label: "Full" }
    : { color: "#34D399", glow: "rgba(52,211,153,0.35)", label: "Available" };
}

export function vehicleMarkerHtml(capacity?: Capacity, onBreak?: boolean, surfaceColor = "#071A2E") {
  const { color, glow } = markerPresentation(capacity, onBreak);
  return `<div style="width:44px;height:44px;box-sizing:border-box;background:${surfaceColor};border-radius:50%;border:2.5px solid ${color};display:flex;align-items:center;justify-content:center;box-shadow:0 0 12px rgba(0,0,0,0.5),0 0 10px ${glow}"><svg width="24" height="24" viewBox="0 0 24 24" fill="${color}"><path d="${JEEPNEY_PATH}"/></svg></div>`;
}

export const HAIL_MARKER_HTML = `<div style="width:30px;height:30px;box-sizing:border-box;background:#FF6D3A;border:2px solid white;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,0.5)"><svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="${ACCOUNT_PATH}"/></svg></div>`;
