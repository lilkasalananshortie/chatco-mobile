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
const played = new Set<CueName>();
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
    const { createAudioPlayer, setAudioModeAsync } = await audioModule();
    try {
      await setAudioModeAsync({ playsInSilentMode: true, interruptionMode: "mixWithOthers" });
    } catch (error) {
      console.warn("Unable to configure conductor sound playback", error);
    }
    for (const name of Object.keys(sources) as CueName[]) {
      if (!players.has(name)) players.set(name, createAudioPlayer(sources[name]));
    }
  } catch (error) {
    console.warn("Unable to preload conductor sounds", error);
  }
}

export async function playNativeCue(name: CueName): Promise<void> {
  try {
    if (!players.has(name)) await preloadNativeAudio();
    const player = players.get(name);
    if (!player) return;
    // The first play can arrive while the bundled source is still loading.
    // Seeking at that point can fail on iOS, so only rewind after a prior play.
    if (played.has(name)) await player.seekTo(0);
    player.play();
    played.add(name);
  } catch (error) {
    console.warn(`Unable to play ${name} conductor sound`, error);
  }
}
