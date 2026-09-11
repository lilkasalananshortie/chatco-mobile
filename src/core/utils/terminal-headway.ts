import { appStorage } from "../storage/app-storage";

// ─── Terminal Headway Timer ──────────────────────────────────────────────────
// Simple flow: Trip done → 15 min countdown → sound plays → start next trip
// (manually via button/slider OR auto-start when jeep is moving)

const HEADWAY_MINUTES_KEY = "chatco_headway_minutes";
const DEFAULT_HEADWAY_MINUTES = 15;

export type HeadwayPhase = "IDLE" | "WAITING" | "READY";

export interface HeadwayTimerState {
  phase: HeadwayPhase;
  /** When the timer started (ISO string) */
  startedAt: string | null;
  /** Total seconds to wait */
  totalSeconds: number;
  /** Remaining seconds (updated by tick) */
  remainingSeconds: number;
}

// ─── Persisted setting (admin-adjustable minutes) ────────────────────────────

export async function getHeadwayMinutes(): Promise<number> {
  try {
    const raw = await appStorage.getItem(HEADWAY_MINUTES_KEY);
    if (raw) {
      const parsed = parseInt(raw, 10);
      if (!isNaN(parsed) && parsed >= 1 && parsed <= 60) return parsed;
    }
  } catch {}
  return DEFAULT_HEADWAY_MINUTES;
}

export async function setHeadwayMinutes(minutes: number): Promise<void> {
  const clamped = Math.max(1, Math.min(60, Math.round(minutes)));
  await appStorage.setItem(HEADWAY_MINUTES_KEY, String(clamped)).catch(() => null);
}

// ─── Timer State Helpers ─────────────────────────────────────────────────────

export function createIdleHeadway(): HeadwayTimerState {
  return { phase: "IDLE", startedAt: null, totalSeconds: 0, remainingSeconds: 0 };
}

export function startHeadwayTimer(minutes: number): HeadwayTimerState {
  const totalSeconds = minutes * 60;
  return {
    phase: "WAITING",
    startedAt: new Date().toISOString(),
    totalSeconds,
    remainingSeconds: totalSeconds,
  };
}

/** Call every second to tick down. Returns updated state + whether it just became READY. */
export function tickHeadway(state: HeadwayTimerState): { state: HeadwayTimerState; justBecameReady: boolean } {
  if (state.phase !== "WAITING" || !state.startedAt) {
    return { state, justBecameReady: false };
  }

  const elapsed = Math.floor((Date.now() - new Date(state.startedAt).getTime()) / 1000);
  const remaining = Math.max(0, state.totalSeconds - elapsed);

  if (remaining <= 0) {
    return {
      state: { ...state, phase: "READY", remainingSeconds: 0 },
      justBecameReady: true,
    };
  }

  return {
    state: { ...state, remainingSeconds: remaining },
    justBecameReady: false,
  };
}

/** Format seconds as MM:SS */
export function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/** Progress 0→1 (how much time has passed) */
export function headwayProgress(state: HeadwayTimerState): number {
  if (state.totalSeconds <= 0) return 0;
  return Math.min(1, 1 - state.remainingSeconds / state.totalSeconds);
}
