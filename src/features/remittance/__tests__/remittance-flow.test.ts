/// <reference types="jest" />
import React from "react";
import { ReportScreen } from "../ReportScreen";
import { api, syncPendingCashTransactions } from "../../../core/api/chatco-api";
import { readShiftAccess } from "../../../core/api/shift-access";
let mockStates: any[] = [], mockRefs: any[] = [], mockEffects: Array<() => any> = [];
let mockIndex = 0, mockRefIndex = 0;
jest.mock("react", () => ({ ...jest.requireActual("react"), useMemo: (fn: any) => fn(), useCallback: (fn: any) => fn,
  useState: (initial: any) => { const i = mockIndex++; if (!(i in mockStates)) mockStates[i] = initial; return [mockStates[i], (v: any) => { mockStates[i] = typeof v === "function" ? v(mockStates[i]) : v; }]; },
  useRef: (v: any) => { const i = mockRefIndex++; return mockRefs[i] ?? (mockRefs[i] = { current: v }); }, useEffect: (fn: any) => mockEffects.push(fn) }));
jest.mock("react-native", () => ({ View: "View", Pressable: "Button", Animated: { Value: class { stopAnimation() {} setValue() {} }, View: "AnimatedView" }, Platform: { OS: "android" }, Share: {}, Alert: {}, AppState: { currentState: "active", addEventListener: jest.fn(() => ({ remove: jest.fn() })) } }));
jest.mock("../../../shared/ui/useWebEntrance", () => ({ useReducedMotion: () => false }));
jest.mock("@expo/vector-icons", () => ({ Ionicons: "Icon" }));
jest.mock("../../../shared/ui/BrandText", () => ({ Text: "Text" }));
jest.mock("../../../shared/ui/ConductorIcon", () => ({ ConductorIcon: "Icon" }));
jest.mock("../ReportPage", () => ({ ReportPage: "Page" }));
jest.mock("../report-styles", () => ({ useReportTheme: () => ({ colors: {}, styles: {} }) }));
jest.mock("../../../core/utils/thermal-printer", () => ({ thermalPrinter: {} }));
jest.mock("../../../core/api/chatco-api", () => ({ api: { transactions: jest.fn(), earnings: jest.fn(), pendingCashCount: jest.fn(), remit: jest.fn() }, syncPendingCashTransactions: jest.fn() }));
jest.mock("../../../core/api/shift-access", () => ({ ...jest.requireActual("../../../core/domain/shift-access"), readShiftAccess: jest.fn() }));
jest.mock("../components/RemittanceConfirmModal", () => ({ RemittanceConfirmModal: "Confirm" }));
jest.mock("../components/RemittanceSuccessModal", () => ({ RemittanceSuccessModal: "Success" }));
jest.mock("../components/RemittanceReportSlipModal", () => ({ RemittanceReportSlipModal: "Slip" }));
jest.mock("../components/RemittanceCollectionsCard", () => ({ RemittanceCollectionsCard: "Collections" }));
jest.mock("../components/RemittanceHistorySection", () => ({ RemittanceHistorySection: "History" }));
const shift = { shiftId: "old", isActive: true, timeIn: "2026-11-09T04:00:00+08:00" } as any;
const record = { shift_id: "old", cash_total: 850, gcash_total: 120, remittance_status: "PENDING", date: "2026-11-08" };
const ended = jest.fn(), submitting = jest.fn();
function walk(n: any): any[] { if (Array.isArray(n)) return n.flatMap(walk); if (!React.isValidElement(n)) return []; const e = n as React.ReactElement<any>; return [e, ...walk(e.props.children)]; }
function render(late = false) { mockIndex = 0; mockRefIndex = 0; mockEffects = []; return walk(ReportScreen({ shift, outstanding: late ? record : undefined, refreshKey: 0, canOperate: !late, onEnded: ended, onSubmitting: submitting })); }
async function settle() { for (let i = 0; i < 15; i++) await Promise.resolve(); }
async function mount(late = false) { render(late); const cleanup = mockEffects[2]!(); await settle(); return cleanup; }
async function confirm(late = false) { render(late).find(e => e.type === "Confirm").props.onConfirm(); await settle(); }
beforeEach(() => { jest.useFakeTimers(); jest.clearAllMocks(); mockStates = []; mockRefs = [];
  (api.transactions as jest.Mock).mockResolvedValue([{ transactionId: "receipt", paymentMethod: "Cash", finalAmount: 40 }]); (api.earnings as jest.Mock).mockResolvedValue({ cashTotal: 40, gcashTotal: 20, total: 60 });
  (api.pendingCashCount as jest.Mock).mockResolvedValue(0); (api.remit as jest.Mock).mockResolvedValue({ remittance: record });
  (syncPendingCashTransactions as jest.Mock).mockResolvedValue(0); (readShiftAccess as jest.Mock).mockResolvedValue({ kind: "unremitted", remittance: record }); });
afterEach(() => { jest.clearAllTimers(); jest.useRealTimers(); });

test("an active shift without transactions has no pending remittance and cannot submit", async () => {
  (api.transactions as jest.Mock).mockResolvedValue([]);
  await mount();
  const nodes = render();
  const button = nodes.find(e => e.type === "Button" && walk(e).some(child => child.props.children === "No pending remittance"));
  expect(button.props.disabled).toBe(true);
  expect(button.props.accessibilityState.disabled).toBe(true);
  button.props.onPress(); await settle();
  expect(render().find(e => e.type === "Confirm").props.visible).toBe(false);
  await confirm();
  expect(syncPendingCashTransactions).not.toHaveBeenCalled();
  expect(api.remit).not.toHaveBeenCalled();
});

test("recorded transactions enable the remittance action", async () => {
  await mount();
  const button = render().find(e => e.type === "Button" && walk(e).some(child => child.props.children === "Remit to Admin"));
  expect(button.props.disabled).toBe(false);
  button.props.onPress(); await settle();
  expect(render().find(e => e.type === "Confirm").props.visible).toBe(true);
});

test("an outstanding remittance remains actionable without current transactions", async () => {
  (api.transactions as jest.Mock).mockResolvedValue([]);
  await mount(true);
  const button = render(true).find(e => e.type === "Button" && walk(e).some(child => child.props.children === "Remit to Admin"));
  expect(button.props.disabled).toBe(false);
  await confirm(true);
  expect(api.remit).toHaveBeenCalledWith(shift, 850, 120);
});
test("late remittance uses original totals, skips empty earnings, and keeps signed-in navigation", async () => {
  await mount(true); await confirm(true);
  expect(api.earnings).not.toHaveBeenCalled(); expect(api.remit).toHaveBeenCalledWith(shift, 850, 120);
  expect(render(true).find(e => e.type === "Success").props).toMatchObject({ late: true, accountableTotals: { cash: 850, gcash: 120, all: 970 } });
});
test("today uses fresh earnings and displays the captured server totals", async () => {
  await mount(); await confirm(); expect(api.remit).toHaveBeenCalledWith(shift, 40, 20);
  expect(render().find(e => e.type === "Success").props.accountableTotals.all).toBe(970);
});
test.each([false, true])("Done and the three-second timer complete only once (late=%s)", async late => {
  await mount(late); await confirm(late); const nodes = render(late); const cleanup = mockEffects[4]!();
  nodes.find(e => e.type === "Success").props.onClose(); jest.advanceTimersByTime(3000);
  expect(ended).toHaveBeenCalledTimes(1); cleanup();
});
test("unmount cleans up the success timer", async () => {
  await mount(); await confirm(); render(); const cleanup = mockEffects[4]!(); cleanup(); jest.advanceTimersByTime(3000); expect(ended).not.toHaveBeenCalled();
});
test("rapid submission and completion presses make one remittance request", async () => {
  await mount(); await Promise.all([confirm(), confirm()]); await confirm(); expect(api.remit).toHaveBeenCalledTimes(1);
});
test("unsynced cash blocks remittance and retains data", async () => {
  await mount(true); (api.pendingCashCount as jest.Mock).mockResolvedValue(2); await confirm(true);
  expect(api.remit).not.toHaveBeenCalled(); expect(render(true).some(e => String(e.props.children).includes("waiting to sync"))).toBe(true);
});
test("failed remittance retains original data and allows retry", async () => {
  await mount(true); (api.remit as jest.Mock).mockRejectedValueOnce(new Error("Network failed")); await confirm(true);
  expect(submitting).toHaveBeenLastCalledWith(false); expect(ended).not.toHaveBeenCalled();
  await confirm(true); expect(api.remit).toHaveBeenCalledTimes(2);
});
test("changed server state cannot remit a settled or awaiting-declaration shift again", async () => {
  await mount(true); (readShiftAccess as jest.Mock).mockResolvedValue({ kind: "waiting", remittance: record }); await confirm(true);
  expect(api.remit).not.toHaveBeenCalled(); expect(ended).not.toHaveBeenCalled();
});
