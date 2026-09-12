import * as Speech from "expo-speech";
import { appStorage } from "../storage/app-storage";
import type { FarePoint } from "../domain/types";
import { distanceMeters } from "../../features/dashboard/route-data";

const VOICE_ANNOUNCER_KEY = "chatco_voice_announcer_enabled";
const ANNOUNCER_RADIUS_METERS = 250; // Geofence radius in meters to announce approaching stop
const ANNOUNCER_COOLDOWN_MS = 240000; // 4 minutes cooldown per stop to prevent spam

export const FEMALE_VOICE_PITCH = 1.2; // Elevated pitch for a clear, crisp, natural female announcer tone
export const ANNOUNCER_SPEECH_RATE = 0.92; // Articulate, steady pacing for transit stop announcements

let isVoiceAnnouncerEnabled = false;
let isAnnouncing = false;
let lastAnnouncedStopKey = "";
let lastAnnouncedTimestamp = 0;

let cachedFemaleVoiceId: string | null = null;
let voiceDetectionAttempted = false;

export async function getPreferredFemaleVoice(): Promise<string | undefined> {
  if (cachedFemaleVoiceId) return cachedFemaleVoiceId;
  if (voiceDetectionAttempted) return undefined;
  voiceDetectionAttempted = true;

  try {
    const voices = await Speech.getAvailableVoicesAsync();
    if (!voices || !Array.isArray(voices) || voices.length === 0) {
      return undefined;
    }

    // 1. Priority: Filipino female voice
    const filFemale = voices.find((v) => {
      const lang = (v.language || "").toLowerCase();
      const name = (v.name || "").toLowerCase();
      const id = (v.identifier || "").toLowerCase();
      const isFil = lang.startsWith("fil") || lang.startsWith("tl");
      const isFemale =
        name.includes("female") ||
        name.includes("woman") ||
        id.includes("female") ||
        id.includes("-fie-") ||
        id.includes("-fid-");
      return isFil && isFemale;
    });
    if (filFemale) {
      cachedFemaleVoiceId = filFemale.identifier;
      return cachedFemaleVoiceId;
    }

    // 2. Fallback: Any Filipino voice (pitch 1.2 shifts formant into female register)
    const anyFil = voices.find((v) => {
      const lang = (v.language || "").toLowerCase();
      return lang.startsWith("fil") || lang.startsWith("tl");
    });
    if (anyFil) {
      cachedFemaleVoiceId = anyFil.identifier;
      return cachedFemaleVoiceId;
    }

    // 3. Fallback: English female voice (e.g. en-PH, en-US)
    const enFemale = voices.find((v) => {
      const lang = (v.language || "").toLowerCase();
      const name = (v.name || "").toLowerCase();
      const id = (v.identifier || "").toLowerCase();
      const isEn = lang.startsWith("en");
      const isFemale =
        name.includes("female") ||
        name.includes("woman") ||
        id.includes("female") ||
        id.includes("-f-") ||
        id.includes("sfg") ||
        id.includes("tpf");
      return isEn && isFemale;
    });
    if (enFemale) {
      cachedFemaleVoiceId = enFemale.identifier;
      return cachedFemaleVoiceId;
    }
  } catch {
    // getAvailableVoicesAsync not supported or failed
  }

  return undefined;
}

const listeners = new Set<(enabled: boolean) => void>();

export async function initVoiceAnnouncer(): Promise<boolean> {
  try {
    const stored = await appStorage.getItem(VOICE_ANNOUNCER_KEY);
    // Defaults to true (on) so conductors get automated assistance out of the box
    isVoiceAnnouncerEnabled = stored === null ? true : stored === "true";
  } catch {
    isVoiceAnnouncerEnabled = true;
  }
  void getPreferredFemaleVoice();
  notifyListeners();
  return isVoiceAnnouncerEnabled;
}

export function isVoiceAnnouncerActive(): boolean {
  return isVoiceAnnouncerEnabled;
}

export async function setVoiceAnnouncerActive(enabled: boolean): Promise<void> {
  isVoiceAnnouncerEnabled = enabled;
  if (!enabled) {
    stopAnnouncement();
  }
  await appStorage.setItem(VOICE_ANNOUNCER_KEY, enabled ? "true" : "false").catch(() => null);
  notifyListeners();
}

export async function toggleVoiceAnnouncer(): Promise<boolean> {
  const next = !isVoiceAnnouncerEnabled;
  await setVoiceAnnouncerActive(next);
  return next;
}

export function subscribeVoiceAnnouncer(listener: (enabled: boolean) => void): () => void {
  listeners.add(listener);
  listener(isVoiceAnnouncerEnabled);
  return () => {
    listeners.delete(listener);
  };
}

function notifyListeners() {
  for (const listener of listeners) {
    try {
      listener(isVoiceAnnouncerEnabled);
    } catch {}
  }
}

export function stopAnnouncement(): void {
  try {
    Speech.stop();
  } catch {}
  isAnnouncing = false;
}

export async function playAnnouncement(text: string): Promise<void> {
  if (!isVoiceAnnouncerEnabled) return;
  try {
    stopAnnouncement();
    isAnnouncing = true;
    const femaleVoice = await getPreferredFemaleVoice().catch(() => undefined);

    Speech.speak(text, {
      language: "fil-PH",
      pitch: FEMALE_VOICE_PITCH,
      rate: ANNOUNCER_SPEECH_RATE,
      ...(femaleVoice ? { voice: femaleVoice } : {}),
      onDone: () => {
        isAnnouncing = false;
      },
      onError: () => {
        // Fallback to English female voice if Tagalog voice synthesis is unavailable
        try {
          Speech.speak(text, {
            language: "en-US",
            pitch: FEMALE_VOICE_PITCH,
            rate: ANNOUNCER_SPEECH_RATE,
            ...(femaleVoice ? { voice: femaleVoice } : {}),
            onDone: () => {
              isAnnouncing = false;
            },
          });
        } catch {
          isAnnouncing = false;
        }
      },
    });
  } catch {
    isAnnouncing = false;
  }
}

/**
 * Evaluates the vehicle's current location against all route fare points.
 * Rule: ONLY the MAIN stop name (point.name) is announced.
 * Sub-stops, intermediate street corners, and minor landmarks are excluded.
 */
export function checkAndAnnounceApproachingStop(
  latitude: number,
  longitude: number,
  points: FarePoint[]
): FarePoint | null {
  if (!isVoiceAnnouncerEnabled || !points || points.length === 0) return null;

  const now = Date.now();

  for (const point of points) {
    // Only check points with valid latitude & longitude
    if (
      typeof point.latitude !== "number" ||
      typeof point.longitude !== "number" ||
      !Number.isFinite(point.latitude) ||
      !Number.isFinite(point.longitude)
    ) {
      continue;
    }

    const dist = distanceMeters(
      { latitude, longitude },
      { latitude: point.latitude, longitude: point.longitude }
    );

    if (dist <= ANNOUNCER_RADIUS_METERS) {
      const stopKey = point.id || point.code || point.name;

      // Debounce: prevent re-announcing the same stop if stuck in traffic within 4 minutes
      if (lastAnnouncedStopKey === stopKey && now - lastAnnouncedTimestamp < ANNOUNCER_COOLDOWN_MS) {
        return null;
      }

      lastAnnouncedStopKey = stopKey;
      lastAnnouncedTimestamp = now;

      // CRITICAL REQUIREMENT: ANNOUNCE ONLY THE MAIN OPTION (point.name)
      const mainStopName = point.name.trim();
      const announcement = `Susunod na hintuan: ${mainStopName}. Next stop: ${mainStopName}.`;

      void playAnnouncement(announcement);
      return point;
    }
  }

  return null;
}

export async function testVoiceAnnouncement(sampleStop = "Terminal"): Promise<void> {
  const text = `Susunod na hintuan: ${sampleStop}. Next stop: ${sampleStop}.`;
  try {
    stopAnnouncement();
    const femaleVoice = await getPreferredFemaleVoice().catch(() => undefined);
    Speech.speak(text, {
      language: "fil-PH",
      pitch: FEMALE_VOICE_PITCH,
      rate: ANNOUNCER_SPEECH_RATE,
      ...(femaleVoice ? { voice: femaleVoice } : {}),
      onError: () => {
        try {
          Speech.speak(text, {
            language: "en-US",
            pitch: FEMALE_VOICE_PITCH,
            rate: ANNOUNCER_SPEECH_RATE,
            ...(femaleVoice ? { voice: femaleVoice } : {}),
          });
        } catch {}
      },
    });
  } catch {}
}
