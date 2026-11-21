/// <reference types="jest" />
import { createThemeFade, THEME_FADE_HALF_MS } from "../theme-fade";

function harness(initial = false, instant = false) {
  const log: string[] = [];
  const pending: Array<() => void> = [];
  const fade = createThemeFade(initial, {
    isInstant: () => instant,
    prepare: value => { log.push(`veil:${value ? "light" : "dark"}`); },
    fade: (to, ms, done) => { log.push(`fade:${to}:${ms}`); pending.push(done); },
    apply: (value, painted) => { log.push(`apply:${value ? "light" : "dark"}`); pending.push(painted); },
  });
  const flush = () => { while (pending.length) pending.shift()!(); };
  return { fade, log, pending, flush };
}

test("colors swap only while the veil is fully opaque, then the veil clears", () => {
  const { fade, log, flush } = harness();
  fade.switchTo(true);
  flush();
  expect(log).toEqual([
    "veil:light",
    `fade:1:${THEME_FADE_HALF_MS}`,
    "apply:light",
    `fade:0:${THEME_FADE_HALF_MS}`,
  ]);
});

test("reduced motion and Lo-Fi apply the theme with no fade", () => {
  const { fade, log, flush } = harness(false, true);
  fade.switchTo(true);
  flush();
  expect(log).toEqual(["apply:light"]);
});

test("a change during a fade waits, then runs once", () => {
  const { fade, log, pending, flush } = harness();
  fade.switchTo(true);
  pending.shift()!();
  fade.switchTo(false);
  flush();
  expect(log.filter(entry => entry.startsWith("apply"))).toEqual(["apply:light", "apply:dark"]);
  expect(log.at(-1)).toBe(`fade:0:${THEME_FADE_HALF_MS}`);
});

test("tapping back before the swap still settles on the latest choice", () => {
  const { fade, log, flush } = harness();
  fade.switchTo(true);
  fade.switchTo(false);
  flush();
  expect(log.filter(entry => entry.startsWith("apply")).at(-1)).toBe("apply:dark");
});

test("choosing the theme already shown does nothing", () => {
  const { fade, log } = harness(true);
  fade.switchTo(true);
  expect(log).toEqual([]);
});

test("a saved theme loaded at startup does not animate", () => {
  const { fade, log } = harness(false);
  fade.sync(true);
  fade.switchTo(true);
  expect(log).toEqual([]);
});
