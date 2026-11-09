import { useEffect } from "react";
import { activateKeepAwakeAsync, deactivateKeepAwake, isAvailableAsync } from "expo-keep-awake";

/** Release only an acquired lock, including activation that completes after
 * navigation/unmount. Unsupported browsers and denied requests stay nonfatal. */
export function useDashboardKeepAwake(): void {
  useEffect(() => {
    // A distinct tag per effect also isolates Strict Mode and fast remounts.
    const tag = `chatco-dashboard-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    let disposed = false;
    let acquired = false;
    const release = () => {
      if (!acquired) return;
      acquired = false;
      void deactivateKeepAwake(tag).catch(() => undefined);
    };
    void (async () => {
      try {
        if (!await isAvailableAsync() || disposed) return;
        await activateKeepAwakeAsync(tag);
        acquired = true;
        if (disposed) release();
      } catch { /* Sleep prevention is optional when the browser or OS denies it. */ }
    })();
    return () => { disposed = true; release(); };
  }, []);
}
