"""Generate short, bundled PCM cues matching the browser tone signatures."""

import math
import struct
import wave
from pathlib import Path


SAMPLE_RATE = 22050
OUT = Path(__file__).resolve().parents[1] / "assets" / "sounds"


def sample(kind: str, phase: float) -> float:
    if kind == "triangle":
        return 2 / math.pi * math.asin(math.sin(phase))
    if kind == "square":
        return 1.0 if math.sin(phase) >= 0 else -1.0
    return math.sin(phase)


def write_cue(name: str, tones: list[tuple[float, str, int, int, float]]) -> None:
    length_ms = max(delay + duration for _, _, duration, delay, _ in tones) + 25
    frames = bytearray()
    for frame in range(math.ceil(length_ms * SAMPLE_RATE / 1000)):
        time_ms = frame * 1000 / SAMPLE_RATE
        mixed = 0.0
        for frequency, kind, duration, delay, gain in tones:
            elapsed = time_ms - delay
            if 0 <= elapsed < duration:
                attack = min(1.0, elapsed / 5)
                decay = math.exp(-5 * elapsed / duration)
                mixed += gain * attack * decay * sample(kind, 2 * math.pi * frequency * elapsed / 1000)
        frames.extend(struct.pack("<h", round(max(-1, min(1, mixed)) * 32767)))
    OUT.mkdir(parents=True, exist_ok=True)
    with wave.open(str(OUT / f"{name}.wav"), "wb") as output:
        output.setnchannels(1)
        output.setsampwidth(2)
        output.setframerate(SAMPLE_RATE)
        output.writeframes(frames)


write_cue("payment", [(2400, "sine", 70, 0, 0.25), (3200, "triangle", 90, 45, 0.22)])
write_cue("capacity", [(220, "triangle", 45, 0, 0.35)])
write_cue("hail", [(2100, "sine", 80, 0, 0.3), (2600, "sine", 95, 85, 0.32)])
write_cue("warning", [(880, "square", 80, 0, 0.25), (880, "square", 80, 110, 0.25)])
write_cue("duty", [(587.33, "sine", 160, 0, 0.3), (440, "sine", 240, 120, 0.25)])
write_cue("sync", [(1100, "sine", 50, 0, 0.15)])
