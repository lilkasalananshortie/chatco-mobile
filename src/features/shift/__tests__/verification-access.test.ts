/// <reference types="jest" />
import React from "react";
import { VerificationScreen } from "../VerificationScreen";
import { api } from "../../../core/api/chatco-api";
import { readShiftAccess } from "../../../core/api/shift-access";
import { AppState } from "react-native";
let mockStates: any[] = [], mockRefs: any[] = [], mockEffects: Array<() => any> = [];
let mockI = 0, mockR = 0;
jest.mock("react", () => ({ ...jest.requireActual("react"), useCallback: (fn: any) => fn,
  useState: (initial: any) => { const i = mockI++; if (!(i in mockStates)) mockStates[i] = initial; return [mockStates[i], (v: any) => { mockStates[i] = typeof v === "function" ? v(mockStates[i]) : v; }]; },
  useRef: (initial: any) => { const i = mockR++; return mockRefs[i] ?? (mockRefs[i] = { current: initial }); }, useEffect: (fn: any) => mockEffects.push(fn) }));
jest.mock("react-native", () => ({ Alert: {}, Pressable: "Button", ScrollView: "Scroll", Text: "Text", View: "View", AppState: { addEventListener: jest.fn(() => ({ remove: jest.fn() })) } }));
jest.mock("@expo/vector-icons", () => ({ Ionicons: "Icon" }));
jest.mock("../../../../assets/logo-transparent.png", () => "chatco-logo");
jest.mock("../../../core/api/chatco-api", () => ({ api: { units: jest.fn(), drivers: jest.fn(), startShift: jest.fn() } }));
jest.mock("../../../core/api/shift-access", () => ({ readShiftAccess: jest.fn() }));
jest.mock("../../../core/theme/ThemeProvider", () => ({ useAppTheme: () => ({ styles: {}, colors: {} }) }));
jest.mock("../../../shared/ui", () => ({ Header: "Header", Loading: "Loading", ScreenShell: "Shell" }));
jest.mock("../components/AssignmentCard", () => ({ AssignmentCard: "Assignment" }));
jest.mock("../components/MinibusFrontIcon", () => ({ MinibusFrontIcon: "MinibusIcon" }));
jest.mock("../components/OfflineDepotNotice", () => ({ OfflineDepotNotice: "Offline" }));
jest.mock("../components/ShiftSetupModal", () => ({ ShiftSetupModal: "Confirm" }));
const started = jest.fn(), outstanding = jest.fn();
const unit = { id: "unit", status: "available" }, driver = { id: "driver", status: "available" };
const record = { shift_id: "yesterday", date: "2026-11-08" };
function walk(n: any): any[] { if (Array.isArray(n)) return n.flatMap(walk); if (!React.isValidElement(n)) return []; const e = n as React.ReactElement<any>; return [e, ...walk(e.props.children)]; }
function render() { mockI = 0; mockR = 0; mockEffects = []; return walk(VerificationScreen({ onStarted: started, onOutstanding: outstanding })); }
async function settle() { for (let i = 0; i < 18; i++) await Promise.resolve(); }
async function mount() { render(); mockEffects[0]!(); await settle(); }
function checkAgain() { render().find(e => e.type === "Button" && walk(e).some(n => n.props.children === "Check again"))!.props.onPress(); }
function choose() { render().find(e => e.type === "Assignment" && e.props.item.id === "unit")!.props.onSelect(); render().find(e => e.type === "Assignment" && e.props.item.id === "driver")!.props.onSelect(); }
beforeEach(() => { jest.clearAllMocks(); mockStates = []; mockRefs = []; (readShiftAccess as jest.Mock).mockResolvedValue({ kind: "ready" }); (api.units as jest.Mock).mockResolvedValue([unit]); (api.drivers as jest.Mock).mockResolvedValue([driver]); });
test("an active shift resumes without loading assignments", async () => {
  const shift = { shiftId: "active" }; (readShiftAccess as jest.Mock).mockResolvedValue({ kind: "active", shift }); await mount();
  expect(started).toHaveBeenCalledWith(shift); expect(api.units).not.toHaveBeenCalled();
});
test("unremitted shift opens End-of-Day without unit selection", async () => {
  (readShiftAccess as jest.Mock).mockResolvedValue({ kind: "unremitted", remittance: record }); await mount();
  expect(outstanding).toHaveBeenCalledWith(record); expect(api.units).not.toHaveBeenCalled();
});
test("awaiting declaration blocks assignments until Check again confirms settlement", async () => {
  (readShiftAccess as jest.Mock).mockResolvedValue({ kind: "waiting", remittance: record }); await mount();
  expect(render().some(e => e.type === "Assignment")).toBe(false); expect(api.units).not.toHaveBeenCalled();
  (readShiftAccess as jest.Mock).mockResolvedValue({ kind: "ready" }); checkAgain(); await settle();
  expect(render().some(e => e.type === "Assignment")).toBe(true);
});
test("failed checks block cached assignments and can be retried", async () => {
  (readShiftAccess as jest.Mock).mockRejectedValue(new Error("Offline")); await mount(); expect(api.units).not.toHaveBeenCalled();
  expect(render().some(e => e.type === "Assignment")).toBe(false);
  (readShiftAccess as jest.Mock).mockResolvedValue({ kind: "ready" }); checkAgain(); await settle(); expect(api.units).toHaveBeenCalledTimes(1);
});
test("start rechecks remittances and rapid confirm presses cannot create two shifts", async () => {
  await mount(); choose(); let finish!: (v: any) => void; (api.startShift as jest.Mock).mockReturnValue(new Promise(done => { finish = done; }));
  const press = render().find(e => e.type === "Confirm").props.onConfirm; press(); press(); await settle();
  expect(api.startShift).toHaveBeenCalledTimes(1); expect(readShiftAccess).toHaveBeenCalledTimes(2);
  finish({ shiftId: "new" }); await settle(); expect(started).toHaveBeenCalledTimes(1);
});
test("new declaration block found at start prevents the mutation", async () => {
  await mount(); choose(); (readShiftAccess as jest.Mock).mockResolvedValue({ kind: "waiting", remittance: record });
  render().find(e => e.type === "Confirm").props.onConfirm(); await settle(); expect(api.startShift).not.toHaveBeenCalled();
  expect(render().some(e => e.props.children === "Awaiting cash declaration")).toBe(true);
});
test("backend 409 refreshes stale access and keeps the server's explanation visible", async () => {
  await mount(); choose(); (api.startShift as jest.Mock).mockRejectedValue(new Error("Remit your shift from Nov 8 before starting a new one."));
  render().find(e => e.type === "Confirm").props.onConfirm(); await settle();
  expect(readShiftAccess).toHaveBeenCalledTimes(3); expect(api.units).toHaveBeenCalledTimes(2);
  expect(render().some(e => String(e.props.children).includes("Remit your shift from Nov 8"))).toBe(true);
  expect(render().some(e => e.type === "Assignment")).toBe(false);
});
test("foreground refresh after overnight reset reloads assignments and coalesces repeated events", async () => {
  await mount(); const foreground = (AppState.addEventListener as jest.Mock).mock.calls[0]![1];
  let finish!: (v: any) => void; (readShiftAccess as jest.Mock).mockReturnValue(new Promise(done => { finish = done; }));
  foreground("active"); foreground("active"); expect(readShiftAccess).toHaveBeenCalledTimes(2);
  finish({ kind: "unremitted", remittance: record }); await settle(); expect(outstanding).toHaveBeenCalledWith(record);
});
