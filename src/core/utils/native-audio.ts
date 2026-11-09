import type { AudioPlayer } from "expo-audio";

export type CueName = "payment" | "capacity" | "hail" | "warning" | "duty" | "sync";

const sources: Record<CueName, number> = {
  payment: require("../../../assets/sounds/payment.wav"),
  capacity: require("../../../assets/sounds/capacity.wav"),
  hail: require("../../../assets/sounds/hail.wav"),
  warning: require("../../../assets/sounds/warning.wav"),
  duty: require("../../../assets/sounds/duty.wav"),
  sync: require("../../../assets/sounds/sync.wav"),
};

const players = new Map<CueName, AudioPlayer>();
let loading: Promise<typeof import("expo-audio")> | undefined;

async function audioModule() {
  loading ??= import("expo-audio").catch(error => {
    loading = undefined;
    throw error;
  });
  return loading;
}

export async function preloadNativeAudio(): Promise<void> {
  try {
    const { createAudioPlayer } = await audioModule();
    for (const name of Object.keys(sources) as CueName[]) {
      if (!players.has(name)) players.set(name, createAudioPlayer(sources[name]));
    }
  } catch {
    // Haptics remain available if audio cannot initialize on this device.
  }
}

export async function playNativeCue(name: CueName): Promise<void> {
  try {
    if (!players.has(name)) await preloadNativeAudio();
    const player = players.get(name);
    if (!player) return;
    await player.seekTo(0);
    player.play();
  } catch {
    // A sound failure should never interrupt a payment or shift action.
  }
}
