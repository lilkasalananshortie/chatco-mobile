import * as Speech from "expo-speech";
import { appStorage } from "../storage/app-storage";
import type { FarePoint } from "../domain/types";
import { distanceMeters } from "../../features/dashboard/route-data";

const VOICE_ANNOUNCER_KEY = "chatco_voice_announcer_enabled";
const ANNOUNCER_RADIUS_METERS = 250; // Geofence radius in meters to announce approaching stop
const ANNOUNCER_COOLDOWN_MS = 240000; // 4 minutes cooldown per stop to prevent spam

let isVoiceAnnouncerEnabled = false;
let isAnnouncing = false;
let lastAnnouncedStopKey = "";
let lastAnnouncedTimestamp = 0;

const listeners = new Set<(enabled: boolean) => void>();

export async function initVoiceAnnouncer(): Promise<boolean> {
  try {
    const stored = await appStorage.getItem(VOICE_ANNOUNCER_KEY);
    // Defaults to true (on) so conductors get automated assistance out of the box
    isVoiceAnnouncerEnabled = stored === null ? true : stored === "true";
  } catch {
    isVoiceAnnouncerEnabled = true;
  }
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
    Speech.speak(text, {
      language: "fil-PH",
      pitch: 1.0,
      rate: 0.9,
      onDone: () => {
        isAnnouncing = false;
      },
      onError: () => {
        // Fallback to English if Tagalog voice synthesis is unavailable
        try {
          Speech.speak(text, {
            language: "en-US",
            pitch: 1.0,
            rate: 0.9,
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

export function testVoiceAnnouncement(sampleStop = "Terminal"): void {
  const text = `Susunod na hintuan: ${sampleStop}. Next stop: ${sampleStop}.`;
  try {
    stopAnnouncement();
    Speech.speak(text, {
      language: "fil-PH",
      pitch: 1.0,
      rate: 0.9,
      onError: () => {
        try {
          Speech.speak(text, { language: "en-US", pitch: 1.0, rate: 0.9 });
        } catch {}
      },
    });
  } catch {}
}
