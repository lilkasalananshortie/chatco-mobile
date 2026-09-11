import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppState } from "react-native";
import { api } from "../../../core/api/chatco-api";
import type { Announcement, Capacity, HailRequest, Shift, ShiftEarnings, Transaction } from "../../../core/domain/types";
import { audioCues } from "../../../core/utils/audio-cues";
import { appHaptics } from "../../../core/utils/haptics";

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
  const [capacity, setCapacity] = useState<Capacity>("AVAILABLE");
  const [isOnBreak, setIsOnBreak] = useState(Boolean(shift.isOnBreak));
  const [breakPending, setBreakPending] = useState(false);
  const [breakConfirmOpen, setBreakConfirmOpen] = useState(false);
  const [hails, setHails] = useState<HailRequest[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [pendingOfflineCount, setPendingOfflineCount] = useState(0);
  const [syncState, setSyncState] = useState<"idle" | "syncing" | "error">(api.getSyncState());
  const [deviceId, setDeviceId] = useState<string>("");
  const [deviceBusy, setDeviceBusy] = useState(false);
  const [deviceError, setDeviceError] = useState("");
  const [error, setError] = useState("");

  const operationalRefreshInFlight = useRef<Promise<void> | null>(null);
  const breakBusy = useRef(false);

  useEffect(() => {
    void api.getDeviceId().then(setDeviceId);
  }, []);

  const refreshOperationalData = useCallback(async () => {
    if (operationalRefreshInFlight.current) return operationalRefreshInFlight.current;
    const request = (async () => {
      try {
        const [records, pendingCount, earningsData] = await Promise.all([
          api.transactions(shift.shiftId),
          api.pendingCashCount(shift.shiftId),
          isOnline ? api.earnings(shift.shiftId) : Promise.resolve(null),
        ]);
        setTransactions(records);
        setPendingOfflineCount(pendingCount);
        if (earningsData) setEarnings(earningsData);
        setError("");
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Unable to load shift data.");
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
      if (shift.isProvisional) {
        await api.reconcileProvisionalShift().catch(() => null);
      }
      const synced = await api.syncPendingCashTransactions();
      if (synced > 0) {
        audioCues.playSyncSound();
      }
      await refreshOperationalData();
    } catch {}
  }, [isOnline, refreshOperationalData, shift.isProvisional, syncState]);

  const prevOnline = useRef(isOnline);
  useEffect(() => {
    if (!prevOnline.current && isOnline) {
      void triggerSync();
    }
    prevOnline.current = isOnline;
  }, [isOnline, triggerSync]);

  useEffect(() => {
    return api.addSyncListener((state, count) => {
      setSyncState(state);
      setPendingOfflineCount(count);
    });
  }, []);

  useEffect(() => {
    void refreshOperationalData();
    const timer = setInterval(() => void refreshOperationalData(), 15000);
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") void refreshOperationalData();
    });
    return () => {
      clearInterval(timer);
      subscription.remove();
    };
  }, [refreshKey, refreshOperationalData]);

  useEffect(() => {
    setIsOnBreak(Boolean(shift.isOnBreak));
    const loadAnnouncements = () => void api.announcements().then(setAnnouncements).catch(() => undefined);
    loadAnnouncements();
    const announcementTimer = setInterval(loadAnnouncements, 30000);
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") loadAnnouncements();
    });
    return () => {
      clearInterval(announcementTimer);
      subscription.remove();
    };
  }, [refreshKey, shift.shiftId, shift.isOnBreak]);

  useEffect(() => {
    const load = () => void api.hails().then(setHails).catch(() => undefined);
    load();
    const timer = setInterval(load, 10000);
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") load();
    });
    return () => {
      clearInterval(timer);
      subscription.remove();
    };
  }, []);

  const updateCapacity = async (next: Capacity) => {
    if (!canOperate) return;
    audioCues.playCapacitySound();
    const previous = capacity;
    setCapacity(next);
    setError("");
    try {
      await api.capacity(next);
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
    setError("");
    setIsOnBreak(next);
    try {
      const updated = await api.breakStatus(next);
      audioCues.playDutySound();
      setIsOnBreak(Boolean(updated.isOnBreak));
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
    if (!canOperate) return;
    if (action === "accept") {
      audioCues.playHailSound();
    }
    try {
      if (action === "accept") {
        await api.acceptHail(hailId);
      } else {
        await api.rejectHail(hailId);
      }
      setHails((current) => current.filter((hail) => hail.id !== hailId));
    } catch (cause) {
      appHaptics.error();
      setError(cause instanceof Error ? cause.message : "Unable to update pickup request.");
    }
  };

  const handleMarkAnnouncementRead = (id: string) => {
    setAnnouncements((current) =>
      current.map((row) => (row.id === id ? { ...row, isRead: true } : row))
    );
    void api.markAnnouncementRead(id).catch(() => undefined);
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
      transactions.reduce(
        (sum, transaction) => {
          sum.total += transaction.finalAmount;
          if (transaction.paymentMethod === "Cash") sum.cash += transaction.finalAmount;
          else if (transaction.paymentMethod === "Voucher") sum.voucher += transaction.finalAmount;
          else sum.gcash += transaction.finalAmount;
          return sum;
        },
        { total: 0, cash: 0, gcash: 0, voucher: 0 }
      ),
    [transactions]
  );

  const totals = earnings
    ? { ...transactionTotals, total: earnings.total, cash: earnings.cashTotal, gcash: earnings.gcashTotal }
    : transactionTotals;

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
    announcements,
    pendingOfflineCount,
    syncState,
    deviceId,
    deviceBusy,
    deviceError,
    error,
    setError,
    updateCapacity,
    updateBreak,
    handleHail,
    handleMarkAnnouncementRead,
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
