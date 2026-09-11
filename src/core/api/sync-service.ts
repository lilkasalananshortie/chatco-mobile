import { appStorage } from "../storage/app-storage";
import {
  getPendingCash,
  pendingCashCount,
  reassignPendingShiftId,
  removePendingCash,
  updatePendingCash,
} from "../storage/offline-cash-queue";
import { CONDUCTOR_DEVICE_TYPE, getConductorDeviceId } from "../storage/device-id";
import type { Shift } from "../domain/types";
import { NetworkError, post, request, PROVISIONAL_SHIFT_KEY } from "./api-client";
import { mapShift } from "./api-mappers";

export type SyncState = "idle" | "syncing" | "error";
let currentSyncState: SyncState = "idle";
const syncListeners = new Set<(state: SyncState, pendingCount: number) => void>();

export function addSyncListener(listener: (state: SyncState, pendingCount: number) => void): () => void {
  syncListeners.add(listener);
  return () => {
    syncListeners.delete(listener);
  };
}

export function getSyncState(): SyncState {
  return currentSyncState;
}

export function notifySyncState(state: SyncState, count: number) {
  currentSyncState = state;
  for (const listener of syncListeners) {
    try {
      listener(state, count);
    } catch {}
  }
}

/**
 * Reconciles a provisional offline shift with the official backend once online.
 * Promotes the local shift to the server, and reassigns all queued pending items.
 */
export async function reconcileProvisionalShift(): Promise<Shift | null> {
  const provisionalRaw = await appStorage.getItem(PROVISIONAL_SHIFT_KEY);
  if (!provisionalRaw) return null;

  try {
    const provisional = JSON.parse(provisionalRaw) as Shift;
    if (!provisional.isProvisional || !provisional.provisionalPayload) {
      await appStorage.removeItem(PROVISIONAL_SHIFT_KEY);
      return null;
    }
    const deviceId = await getConductorDeviceId();
    const response = await post<any>("/conductor/shifts/start", {
      vehicle_id: provisional.provisionalPayload.unitId,
      driver_id: provisional.provisionalPayload.driverId,
      route_id: provisional.provisionalPayload.routeId ?? null,
      device_id: deviceId,
      device_type: CONDUCTOR_DEVICE_TYPE,
    });
    const officialShift = mapShift(response);

    // Reassign queued pending cash transactions to the official shift ID
    await reassignPendingShiftId(provisional.shiftId, officialShift.shiftId);
    await appStorage.removeItem(PROVISIONAL_SHIFT_KEY);
    return officialShift;
  } catch (cause) {
    if (cause instanceof NetworkError) return null;
    // If backend reports shift conflict / already started, fetch active shift to resolve
    try {
      const active = await request<any | null>("/conductor/shift");
      if (active) {
        const officialShift = mapShift(active);
        const provisional = JSON.parse(provisionalRaw) as Shift;
        await reassignPendingShiftId(provisional.shiftId, officialShift.shiftId);
        await appStorage.removeItem(PROVISIONAL_SHIFT_KEY);
        return officialShift;
      }
    } catch {}
    return null;
  }
}

/** Retry durable offline cash writes in order. */
let syncInFlight: Promise<number> | null = null;

export async function syncPendingCashTransactions(): Promise<number> {
  if (syncInFlight) return syncInFlight;
  syncInFlight = (async () => {
    let pending = await getPendingCash();
    notifySyncState("syncing", pending.length);

    try {
      // 1. Reconcile provisional shift if exists
      await reconcileProvisionalShift().catch(() => null);

      // Re-read queue after provisional shift reassignment
      pending = await getPendingCash();
      const currentDeviceId = await getConductorDeviceId();
      let synced = 0;

      for (const item of pending) {
        try {
          if (item.deviceId && item.deviceId !== currentDeviceId) continue;
          await post("/conductor/transactions", {
            ...item.payload,
            device_id: item.deviceId ?? currentDeviceId,
            device_type: CONDUCTOR_DEVICE_TYPE,
            offline_created_at: item.offlineCreatedAt ?? new Date(item.createdAt).toISOString(),
          });
          await removePendingCash(item.id);
          synced += item.localTransactions.length;
        } catch (cause) {
          if (cause instanceof NetworkError) {
            break;
          }
          await updatePendingCash(item.id, {
            attempts: (item.attempts ?? 0) + 1,
            lastAttemptAt: Date.now(),
            lastError: cause instanceof Error ? cause.message : "Synchronization failed.",
          });
        }
      }
      const remaining = await pendingCashCount();
      notifySyncState("idle", remaining);
      return synced;
    } catch {
      const remaining = await pendingCashCount().catch(() => 0);
      notifySyncState("idle", remaining);
      return 0;
    }
  })();
  try {
    return await syncInFlight;
  } finally {
    syncInFlight = null;
  }
}
