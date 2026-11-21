import type { PendingCashItem } from "../storage/offline-cash-queue";

/** One refusal can be a passing server error; a second means someone must look at it. */
export const REFUSALS_BEFORE_REVIEW = 2;
/** Tickets in review keep retrying, slowly, so a later server fix still saves them. */
export const REVIEW_RETRY_MS = 10 * 60 * 1000;

type ReviewFields = Pick<PendingCashItem, "shiftId" | "deviceId" | "refusals" | "lastAttemptAt">;

/** Legacy provisional tickets and another device's tickets are never submitted from here. */
export function canSyncFromDevice(item: ReviewFields, deviceId: string | null): boolean {
  return Boolean(item.shiftId)
    && !item.shiftId.startsWith("PROV-")
    && (!item.deviceId || !deviceId || item.deviceId === deviceId);
}

/** Saved cash that retrying alone won't fix, so it must not block the conductor. */
export function needsAdminReview(item: ReviewFields, deviceId: string | null): boolean {
  return !canSyncFromDevice(item, deviceId) || (item.refusals ?? 0) >= REFUSALS_BEFORE_REVIEW;
}

export function isDueForSync(item: ReviewFields, now: number, retryRefused: boolean): boolean {
  return retryRefused
    || (item.refusals ?? 0) < REFUSALS_BEFORE_REVIEW
    || now - (item.lastAttemptAt ?? 0) >= REVIEW_RETRY_MS;
}
