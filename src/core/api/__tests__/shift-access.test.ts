/// <reference types="jest" />
jest.mock("../shift-service", () => ({ shiftService: { activeShift: jest.fn() } }));
jest.mock("../fleet-service", () => ({ fleetService: { remittancesPage: jest.fn() } }));
jest.mock("../../storage/app-storage", () => ({ appStorage: { getItem: jest.fn().mockResolvedValue("session") } }));
import { appStorage } from "../../storage/app-storage";
import { shiftService } from "../shift-service";
import { fleetService } from "../fleet-service";
import { checkShiftAccess, ShiftAccessUnavailableError } from "../shift-access";
import { remittanceShift, remittanceState, remittanceTotals, resolveShiftAccess } from "../../domain/shift-access";
import type { Remittance, Shift } from "../../domain/types";
const active = { shiftId: "active", isActive: true, timeOut: null } as Shift;
const row = (input: Partial<Remittance> = {}): Remittance => ({ shift_id: "old", date: "2026-11-08", remittance_status: "PENDING", cash_total: 850, gcash_total: 120, ...input });
beforeEach(() => { jest.clearAllMocks(); (appStorage.getItem as jest.Mock).mockResolvedValue("session"); });
test("valid active shifts resume before outstanding ended remittances", () => {
  expect(resolveShiftAccess(active, [row()])).toEqual({ kind: "active", shift: active });
});
test("oldest unremitted shift takes priority over pending admin declaration", () => {
  const oldest = row({ shift_id: "oldest", date: "2026-11-06" });
  expect(resolveShiftAccess(null, [row({ remitted_at: "2026-11-09" }), row(), oldest])).toEqual({ kind: "unremitted", record: oldest });
});
test("unremitted cash remains Not Remitted even if its old deadline passed", () => {
  expect(remittanceState(row({ is_overdue: true }))).toBe("Not Remitted");
  expect(remittanceState(row({ remitted_at: "2026-11-08", is_overdue: true }))).toBe("Overdue");
});
test.each(["COMPLETE", "SHORTAGE", "OVERAGE"])("%s settlement unlocks selection", status => {
  expect(resolveShiftAccess(null, [row({ remittance_status: status })])).toEqual({ kind: "ready" });
});
test("automatically closed shifts with no cash owed do not block", () => {
  expect(resolveShiftAccess(null, [row({ cash_total: 0, remittance_status: "COMPLETE" })])).toEqual({ kind: "ready" });
});
test("late remit retains its original date, ended state and authoritative totals", () => {
  const record = row({ time_in: "2026-11-08T04:00:00+08:00", time_out: "2026-11-09T00:00:00+08:00" });
  expect(remittanceShift(record)).toMatchObject({ shiftId: "old", timeIn: record.time_in, isActive: false });
  expect(remittanceTotals(record)).toEqual({ cash: 850, gcash: 120, all: 970 });
  expect(() => remittanceTotals(row({ cash_total: "bad" }))).toThrow();
});
test("all history pages are checked and simultaneous requests share one read", async () => {
  (shiftService.activeShift as jest.Mock).mockResolvedValue(null);
  (fleetService.remittancesPage as jest.Mock).mockImplementation(async page => ({ items: page === 1 ? [row({ remittance_status: "COMPLETE" })] : [row()], lastPage: 2 }));
  const a = checkShiftAccess(), b = checkShiftAccess();
  expect((await a).kind).toBe("unremitted");
  expect(await b).toEqual(await a);
  expect(shiftService.activeShift).toHaveBeenCalledTimes(1);
  expect(fleetService.remittancesPage).toHaveBeenCalledTimes(2);
});
test("read failures reject and never authorize a shift; next check can recover", async () => {
  (shiftService.activeShift as jest.Mock).mockRejectedValueOnce(new Error("Offline"));
  await expect(checkShiftAccess()).rejects.toThrow("Offline");
  (shiftService.activeShift as jest.Mock).mockResolvedValue(null);
  (fleetService.remittancesPage as jest.Mock).mockRejectedValueOnce(new Error("History unavailable"));
  await expect(checkShiftAccess()).rejects.toThrow("History unavailable");
  (fleetService.remittancesPage as jest.Mock).mockResolvedValue({ items: [], lastPage: 1 });
  await expect(checkShiftAccess()).resolves.toEqual({ kind: "ready" });
});
test("fresh foreground check cannot resume a shift the server ended overnight", async () => {
  (shiftService.activeShift as jest.Mock).mockResolvedValueOnce(active).mockResolvedValueOnce(null);
  (fleetService.remittancesPage as jest.Mock).mockResolvedValue({ items: [row()], lastPage: 1 });
  expect((await checkShiftAccess()).kind).toBe("active");
  expect((await checkShiftAccess()).kind).toBe("unremitted");
});
test("confirmed ended shift remains distinguishable when the subsequent history read fails", async () => {
  (shiftService.activeShift as jest.Mock).mockResolvedValue(null);
  (fleetService.remittancesPage as jest.Mock).mockRejectedValue(new Error("History offline"));
  await expect(checkShiftAccess()).rejects.toBeInstanceOf(ShiftAccessUnavailableError);
});
test("a stale access result cannot authorize a replacement login", async () => {
  let finish!: (value: Shift) => void;
  (shiftService.activeShift as jest.Mock).mockReturnValue(new Promise(done => { finish = done; }));
  const access = checkShiftAccess(); await Promise.resolve();
  (appStorage.getItem as jest.Mock).mockResolvedValue("replacement-session");
  finish(active);
  await expect(access).rejects.toThrow("Session changed");
});
