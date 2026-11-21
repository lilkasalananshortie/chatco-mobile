/** Matches the web theme transition: 220ms total, split around the color swap. */
export const THEME_FADE_HALF_MS = 110;

export type ThemeFadeSteps = {
  /** Skip the animation (Reduce Motion or Lo-Fi). */
  isInstant: () => boolean;
  /** Color the veil with the incoming background while it is still invisible. */
  prepare: (isLight: boolean) => void;
  fade: (toOpacity: 0 | 1, durationMs: number, done: () => void) => void;
  /** Apply the theme, then call `painted` once the new colors are on screen. */
  apply: (isLight: boolean, painted: () => void) => void;
};

/**
 * Sequences one theme change at a time so the colors only swap behind a fully
 * opaque veil. A change requested mid-fade runs after the current one ends.
 */
export function createThemeFade(initial: boolean, steps: ThemeFadeSteps) {
  let shown = initial;
  let wanted = initial;
  let running = false;

  const advance = () => {
    if (wanted === shown) {
      running = false;
      return;
    }
    const next = wanted;
    if (steps.isInstant()) {
      shown = next;
      running = false;
      steps.apply(next, () => {});
      return;
    }
    running = true;
    steps.prepare(next);
    steps.fade(1, THEME_FADE_HALF_MS, () => {
      shown = next;
      steps.apply(next, () => steps.fade(0, THEME_FADE_HALF_MS, advance));
    });
  };

  return {
    /** Adopt a value loaded from storage without animating. */
    sync(value: boolean) {
      if (running) return;
      shown = value;
      wanted = value;
    },
    switchTo(value: boolean) {
      wanted = value;
      if (!running) advance();
    },
  };
}
