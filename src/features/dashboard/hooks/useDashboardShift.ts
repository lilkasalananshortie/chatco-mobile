import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppState } from "react-native";
import { shiftTotals, transactionSummary } from "../../../core/domain/transaction-summary";
import { api, NetworkError } from "../../../core/api/chatco-api";
import { loadRememberedCapacity, rememberCapacity, rememberedCapacity } from "../../../core/storage/offline-shift-cache";
import type { Capacity, HailRequest, Shift, ShiftEarnings, Transaction } from "../../../core/domain/types";
import { appHaptics } from "../../../core/utils/haptics";
import { audioCues } from "../../../core/utils/audio-cues";
import { connectVehicleHails } from "../../../core/api/hail-realtime";
import { ACCEPTED_HOLD_MS, activeHails, applyLocalAccepts, isAcceptedHail, nextAcceptedExpiry, withoutReleasedAccepts } from "../hail-state";

export interface UseDashboardShiftProps {
  shift: Shift;
  refreshKey: number;
  canOperate: boolean;
  isOnline: boolean;
  onShiftUpdated?: (shift: Shift) => void;
  onShiftEnded?: () => void;
}

export function useDashboardShift({
  shift,
  refreshKey,
  canOperate,
  isOnline,
  onShiftUpdated,
  onShiftEnded,
}: UseDashboardShiftProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [earnings, setEarnings] = useState<ShiftEarnings | null>(null);
  const [capacity, setCapacity] = useState<Capacity>(rememberedCapacity(shift.shiftId));
  const [isOnBreak, setIsOnBreak] = useState(Boolean(shift.isOnBreak));
  const [breakPending, setBreakPending] = useState(false);
  const [breakConfirmOpen, setBreakConfirmOpen] = useState(false);
  const [hails, setHails] = useState<HailRequest[]>([]);
  const [pendingOfflineCount, setPendingOfflineCount] = useState(0);
  const [pendingOfflineError, setPendingOfflineError] = useState("");
  const [syncState, setSyncState] = useState<"idle" | "syncing" | "error">(api.getSyncState());
  const [deviceId, setDeviceId] = useState<string>("");
  const [deviceBusy, setDeviceBusy] = useState(false);
  const [deviceError, setDeviceError] = useState("");
  const [error, setError] = useState("");
  const [hailBusyId, setHailBusyId] = useState<string | null>(null);

  const operationalRefreshInFlight = useRef<Promise<void> | null>(null);
  const breakBusy = useRef(false);
  const seenHailIds = useRef<Set<string> | null>(null);
  const hailActionBusy = useRef(false);
  const localAccepts = useRef(new Map<string, string>());
  const refreshHails = useRef<() => Promise<void>>(async () => undefined);
  const releasedAccepts = useRef(new Set<string>());
  const operationalRefreshAgain = useRef(false);
  const latestIsOnline = useRef(isOnline);
  latestIsOnline.current = isOnline;

  // This unit can no longer pick these commuters up, so their cooldown has ended.
  const releaseAcceptedHails = useCallback((hailIds: string[]) => {
    if (!hailIds.length) return;
    for (const id of hailIds) {
      releasedAccepts.current.add(id);
      localAccepts.current.delete(id);
    }
    setHails(current => withoutReleasedAccepts(current, releasedAccepts.current));
  }, []);

  useEffect(() => {
    void api.getDeviceId().then(setDeviceId).catch(() => {});
  }, []);

  const refreshOperationalData = useCallback(async () => {
    if (operationalRefreshInFlight.current) {
      // The running read may have started before the sale that asked for this one.
      operationalRefreshAgain.current = true;
      return operationalRefreshInFlight.current;
    }
    const request = (async () => {
      try {
        do {
          operationalRefreshAgain.current = false;
          try {
            const [records, pendingCount, syncError, earningsData] = await Promise.all([
              api.transactions(shift.shiftId),
              api.pendingCashCount(shift.shiftId),
              api.pendingCashSyncError(shift.shiftId),
              latestIsOnline.current
                ? api.earnings(shift.shiftId).catch(cause => {
                    if (cause instanceof NetworkError) return null;
                    throw cause;
                  })
                : Promise.resolve(null),
            ]);
            setTransactions(records);
            setPendingOfflineCount(pendingCount);
            setPendingOfflineError(syncError ?? "");
            if (earningsData) setEarnings(earningsData);
            setError("");
          } catch (cause) {
            setError(cause instanceof Error ? cause.message : "Unable to load shift data.");
          }
        } while (operationalRefreshAgain.current);
      } finally {
        operationalRefreshInFlight.current = null;
      }
    })();
    operationalRefreshInFlight.current = request;
    return request;
  }, [isOnline, shift.shiftId]);

  const triggerSync = useCallback(async () => {
    if (syncState === "syncing" || !isOnline) return;
    try {
      const synced = await api.syncPendingCashTransactions();
      if (synced > 0) {
        audioCues.playSyncSound();
      }
      await refreshOperationalData();
    } catch {}
  }, [isOnline, refreshOperationalData, syncState]);

  const prevOnline = useRef(isOnline);
  useEffect(() => {
    if (!prevOnline.current && isOnline) {
      void triggerSync();
    }
    prevOnline.current = isOnline;
  }, [isOnline, triggerSync]);

  useEffect(() => {
    return api.addSyncListener((state) => {
      setSyncState(state);
      if (state === "idle") void refreshOperationalData();
    });
  }, [refreshOperationalData]);

  useEffect(() => {
    void refreshOperationalData();
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") void refreshOperationalData();
    });
    return () => {
      subscription.remove();
    };
  }, [refreshKey, refreshOperationalData]);

  useEffect(() => {
    setIsOnBreak(Boolean(shift.isOnBreak));
  }, [shift.isOnBreak]);

  useEffect(() => {
    let active = true;
    let running = false;
    let rerun = false;
    let liveUpdates = false;
    let lastLoadAt = 0;
    const load = async () => {
      if (!active || !canOperate || !isOnline || isOnBreak || AppState.currentState === "background" || AppState.currentState === "inactive") return;
      if (running) {
        // An event can arrive after this request read the database, so read again.
        rerun = true;
        return;
      }
      running = true;
      lastLoadAt = Date.now();
      try {
        do {
          rerun = false;
          const fetched = await api.hails();
          if (active) {
            const records = withoutReleasedAccepts(activeHails(applyLocalAccepts(fetched, localAccepts.current)), releasedAccepts.current);
            const previous = seenHailIds.current ?? new Set<string>();
            if (records.some(hail => !isAcceptedHail(hail) && !previous.has(hail.id))) audioCues.playHailSound();
            seenHailIds.current = new Set([...previous, ...records.map(hail => hail.id)]);
            setHails(records);
          }
        } while (active && rerun);
      } catch { /* Keep visible hails until a successful refresh or an availability change. */ }
      finally { running = false; }
    };
    refreshHails.current = load;
    const available = canOperate && isOnline && !isOnBreak;
    if (!available) {
      localAccepts.current.clear();
      setHails([]);
    }
    load();
    const realtime = available && shift.vehicleId
      ? connectVehicleHails(shift.vehicleId, api.authorizeBroadcast, {
          onChange: () => void load(),
          onSubscribedChange: subscribed => { liveUpdates = subscribed; },
        })
      : null;
    // A connected socket doesn't guarantee delivery, so keep a slower check while live.
    const timer = setInterval(() => {
      const refreshMs = liveUpdates ? 60000 : 10000;
      if (Date.now() - lastLoadAt >= refreshMs - 250) void load();
    }, 10000);
    const subscription = AppState.addEventListener("change", (state) => {
      realtime?.setActive(state === "active");
      if (state === "active") void load();
    });
    return () => {
      active = false;
      clearInterval(timer);
      subscription.remove();
      realtime?.stop();
    };
  }, [canOperate, isOnline, isOnBreak, shift.vehicleId]);

  // Hide an accepted pin the moment its hold ends instead of at the next poll.
  useEffect(() => {
    const next = nextAcceptedExpiry(hails);
    if (next === null) return;
    const timer = setTimeout(() => setHails(current => activeHails(current)), Math.max(0, next - Date.now()) + 50);
    return () => clearTimeout(timer);
  }, [hails]);

  // Restores Full or Standing after the app was closed during this shift.
  useEffect(() => {
    let active = true;
    void loadRememberedCapacity(shift.shiftId).then(saved => { if (active && saved) setCapacity(saved); });
    return () => { active = false; };
  }, [shift.shiftId]);

  const updateCapacity = async (next: Capacity) => {
    if (!canOperate) return;
    audioCues.playCapacitySound();
    const previous = capacity;
    setCapacity(next);
    setError("");
    try {
      await api.capacity(next);
      void rememberCapacity(shift.shiftId, next);
      if (next === "FULL") releaseAcceptedHails(hails.filter(isAcceptedHail).map(hail => hail.id));
    } catch (cause) {
      setCapacity(previous);
      appHaptics.error();
      setError(cause instanceof Error ? cause.message : "Unable to update capacity.");
    }
  };

  const updateBreak = async (): Promise<boolean> => {
    if (!canOperate || breakBusy.current) return false;
    breakBusy.current = true;
    setBreakPending(true);
    const next = !isOnBreak;
    // Captured now: starting a break clears the visible list before the server answers.
    const acceptedBeforeBreak = hails.filter(isAcceptedHail).map(hail => hail.id);
    setError("");
    setIsOnBreak(next);
    try {
      const updated = await api.breakStatus(next);
      audioCues.playDutySound();
      setIsOnBreak(Boolean(updated.isOnBreak));
      if (updated.isOnBreak) releaseAcceptedHails(acceptedBeforeBreak);
      onShiftUpdated?.(updated);
      return true;
    } catch (cause) {
      setIsOnBreak(!next);
      appHaptics.error();
      setError(cause instanceof Error ? cause.message : "Unable to update break status.");
      return false;
    } finally {
      breakBusy.current = false;
      setBreakPending(false);
    }
  };

  const handleHail = async (hailId: string, action: "accept" | "reject") => {
    if (!canOperate || hailActionBusy.current) return;
    hailActionBusy.current = true;
    setHailBusyId(hailId);
    setError("");
    const patchHail = (patch: Partial<HailRequest>) =>
      setHails((current) => current.map((hail) => (hail.id === hailId ? { ...hail, ...patch } : hail)));
    const previousExpiresAt = hails.find((hail) => hail.id === hailId)?.expiresAt;
    try {
      if (action === "accept") {
        // Turn the pin blue now; the server's answer brings the exact hide time.
        const estimatedEnd = new Date(Date.now() + ACCEPTED_HOLD_MS).toISOString();
        localAccepts.current.set(hailId, estimatedEnd);
        patchHail({ status: "ACCEPTED", expiresAt: estimatedEnd });
        const accepted = await api.acceptHail(hailId);
        const expiresAt = accepted.expiresAt ?? estimatedEnd;
        localAccepts.current.set(hailId, expiresAt);
        patchHail({ status: "ACCEPTED", expiresAt });
        if (capacity === "FULL") releaseAcceptedHails([hailId]);
        void refreshHails.current();
      } else {
        await api.rejectHail(hailId);
        setHails((current) => current.filter((hail) => hail.id !== hailId));
      }
    } catch (cause) {
      appHaptics.error();
      if (action === "accept") {
        localAccepts.current.delete(hailId);
        patchHail({ status: "PENDING", expiresAt: previousExpiresAt });
      }
      // Another unit may have accepted, or the commuter may have cancelled.
      void refreshHails.current();
      setError(cause instanceof Error ? cause.message : "Unable to update pickup request.");
    } finally {
      hailActionBusy.current = false;
      setHailBusyId(null);
    }
  };

  const claimDevice = async () => {
    setDeviceBusy(true);
    setDeviceError("");
    try {
      const updated = await api.claimShiftDevice(shift.shiftId);
      onShiftUpdated?.(updated);
    } catch (cause) {
      setDeviceError(cause instanceof Error ? cause.message : "Unable to claim shift.");
    } finally {
      setDeviceBusy(false);
    }
  };

  const releaseDevice = async () => {
    setDeviceBusy(true);
    setDeviceError("");
    try {
      const online = await api.checkConnectivity().catch(() => false);
      if (!online) {
        setDeviceError("This device is offline. Reconnect to sync its cash fares before handoff.");
        return;
      }
      await api.syncPendingCashTransactions({ drain: true });
      const remaining = await api.pendingCashCount(shift.shiftId);
      if (remaining > 0) {
        setDeviceError("Offline cash fares are still waiting to sync. Keep the app open and try again in a minute.");
        return;
      }
      const updated = await api.releaseShiftDevice(shift.shiftId);
      onShiftUpdated?.(updated);
    } catch (cause) {
      setDeviceError(cause instanceof Error ? cause.message : "Unable to release shift.");
    } finally {
      setDeviceBusy(false);
    }
  };

  const transactionTotals = useMemo(
    () =>
      transactionSummary(transactions),
    [transactions]
  );

  const totals = shiftTotals(transactions, earnings);

  const ownsShift = Boolean(shift.operatingDeviceId && deviceId && shift.operatingDeviceId === deviceId);
  const isOperatingDevice = ownsShift;
  const unclaimed = !shift.operatingDeviceId;
  const recoveredByAdmin = unclaimed && Boolean(shift.latestDeviceRecoveryAt);

  return {
    transactions,
    earnings,
    capacity,
    isOnBreak,
    breakPending,
    breakConfirmOpen,
    setBreakConfirmOpen,
    hails,
    hailBusyId,
    pendingOfflineCount,
    pendingOfflineError,
    syncState,
    deviceId,
    deviceBusy,
    deviceError,
    error,
    setError,
    updateCapacity,
    updateBreak,
    handleHail,
    releaseAcceptedHails,
    claimDevice,
    releaseDevice,
    transactionTotals,
    totals,
    ownsShift,
    isOperatingDevice,
    unclaimed,
    recoveredByAdmin,
    triggerSync,
  };
}
