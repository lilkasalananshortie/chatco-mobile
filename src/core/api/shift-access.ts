import { shiftService } from "./shift-service";
import { fleetService } from "./fleet-service";
import { resolveShiftAccess, type ShiftAccess } from "../domain/shift-access";
import { appStorage } from "../storage/app-storage";
import { restoreActiveShift } from "../storage/offline-shift-cache";
import { NetworkError, TOKEN_KEY } from "./api-client";
export { remittanceShift, remittanceTotals } from "../domain/shift-access";

/** Active-shift lookup succeeded, but history could not be verified. */
export class ShiftAccessUnavailableError extends Error {
  constructor(cause: unknown) {
    super(cause instanceof Error ? cause.message : "Unable to verify remittances. Check again.");
    this.name = "ShiftAccessUnavailableError";
  }
}

export async function readShiftAccess() {
  const access = await checkShiftAccess();
  if (access.kind === "unremitted" || access.kind === "waiting") return { kind: access.kind, remittance: access.record };
  return access;
}

/**
 * For reopening the app: without signal, continue today's server-confirmed shift.
 * A server answer of "no active shift" is never overridden by the saved copy.
 */
export async function readStartupShiftAccess(userId: string) {
  try {
    return await readShiftAccess();
  } catch (cause) {
    if (cause instanceof NetworkError) {
      const shift = await restoreActiveShift(userId);
      if (shift) return { kind: "active" as const, shift };
    }
    throw cause;
  }
}

// Only share concurrent reads. A completed check never authorizes a later start.
let inFlight: Promise<ShiftAccess> | null = null;
let inFlightToken: string | null = null;
export async function checkShiftAccess(): Promise<ShiftAccess> {
  const token = await appStorage.getItem(TOKEN_KEY);
  if (inFlight && inFlightToken === token) return inFlight;
  const pending = (async () => {
    const shift = await shiftService.activeShift();
    if (shift?.isActive && !shift.timeOut) return resolveShiftAccess(shift, []);
    try {
      const first = await fleetService.remittancesPage(1, "ALL", 100);
      const records = [...first.items];
      for (let page = 2; page <= first.lastPage; page++) {
        records.push(...(await fleetService.remittancesPage(page, "ALL", 100)).items);
      }
      return resolveShiftAccess(null, records);
    } catch (cause) {
      throw new ShiftAccessUnavailableError(cause);
    }
  })();
  const checked = pending.then(async access => {
    if (await appStorage.getItem(TOKEN_KEY) !== token) throw new Error("Session changed. Check shift access again.");
    return access;
  });
  inFlight = checked;
  inFlightToken = token;
  void checked.finally(() => { if (inFlight === checked) inFlight = null; }).catch(() => {});
  return checked;
}
