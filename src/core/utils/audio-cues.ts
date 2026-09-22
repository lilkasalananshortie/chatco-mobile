import { Platform } from "react-native";
import { appHaptics } from "./haptics";
import { appStorage } from "../storage/app-storage";

const AUDIO_CUES_STORAGE_KEY = "chatco_audio_cues_enabled";

let isAudioEnabled = true;
let sharedCtx: any = null;

function getAudioContext(): any {
  if (Platform.OS !== "web" || typeof window === "undefined") return null;
  const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
  if (!AudioCtx) return null;
  try {
    if (!sharedCtx) {
      sharedCtx = new AudioCtx();
    }
    if (sharedCtx.state === "suspended") {
      void sharedCtx.resume();
    }
    return sharedCtx;
  } catch {
    return null;
  }
}

export async function initAudioCues(): Promise<boolean> {
  try {
    const stored = await appStorage.getItem(AUDIO_CUES_STORAGE_KEY);
    isAudioEnabled = stored === null ? true : stored === "true";
  } catch {
    isAudioEnabled = true;
  }
  return isAudioEnabled;
}

export function isAudioCuesActive(): boolean {
  return isAudioEnabled;
}

export async function setAudioCuesActive(enabled: boolean): Promise<void> {
  isAudioEnabled = enabled;
  await appStorage.setItem(AUDIO_CUES_STORAGE_KEY, enabled ? "true" : "false").catch(() => null);
}

export async function toggleAudioCues(): Promise<boolean> {
  const next = !isAudioEnabled;
  await setAudioCuesActive(next);
  return next;
}

// ─── Web Audio Tone Synthesizers ─────────────────────────────────────────────

function playTone(freq: number, type: OscillatorType, durationMs: number, delayMs = 0, gainLevel = 0.2) {
  const ctx = getAudioContext();
  if (!ctx) return;

  setTimeout(() => {
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);

      gain.gain.setValueAtTime(gainLevel, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + durationMs / 1000);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + durationMs / 1000);
    } catch {}
  }, delayMs);
}

// ─── 6 Unified Category Sound Signatures ──────────────────────────────────────

export const audioCues = {
  /**
   * Category 1: Fare & Payment Collection
   * Unified Sound: Crisp Double Coin Clink ("Kalansing")
   */
  playPaymentSound() {
    if (!isAudioEnabled) return;
    appHaptics.success();
    // High metallic coin harmonics
    playTone(2400, "sine", 70, 0, 0.25);
    playTone(3200, "triangle", 90, 45, 0.22);
  },

  /**
   * Category 2: Vehicle Capacity Status
   * Unified Sound: Solid Latch Click ("Tuk!")
   */
  playCapacitySound() {
    if (!isAudioEnabled) return;
    appHaptics.medium();
    // Short mechanical low-mid thump
    playTone(220, "triangle", 45, 0, 0.35);
  },

  /**
   * Category 3: Commuter Hails & Roadside Pickups
   * Unified Sound: Jeepney Conductor Whistle ("Sipol")
   */
  playHailSound() {
    if (!isAudioEnabled) return;
    appHaptics.medium();
    setTimeout(() => appHaptics.medium(), 85);
    // High piercing double whistle chirp
    playTone(2100, "sine", 80, 0, 0.3);
    playTone(2600, "sine", 95, 85, 0.32);
  },

  /**
   * Category 4: Safety & Speed Warnings
   * Unified Sound: Caution Warning Beep
   */
  playWarningSound() {
    if (!isAudioEnabled) return;
    appHaptics.error();
    // Urgent dual square-wave beeps
    playTone(880, "square", 80, 0, 0.25);
    playTone(880, "square", 80, 110, 0.25);
  },

  /**
   * Category 5: Shift & Trip Operations
   * Unified Sound: Resonant Departure Bell ("Ding-Dong!")
   */
  playDutySound() {
    if (!isAudioEnabled) return;
    appHaptics.success();
    // Transport two-tone bell chime (D5 then A4)
    playTone(587.33, "sine", 160, 0, 0.3);
    playTone(440.0, "sine", 240, 120, 0.25);
  },

  /**
   * Category 6: Cloud Sync & System State
   * Unified Sound: Water-Drop Micro-Pop ("Plip!")
   */
  playSyncSound() {
    if (!isAudioEnabled) return;
    appHaptics.light();
    // Delicate upward sweep
    playTone(1100, "sine", 50, 0, 0.15);
  },
};
