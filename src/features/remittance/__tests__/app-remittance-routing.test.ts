/// <reference types="jest" />
import React from "react";
import App from "../../../../App";
import { api } from "../../../core/api/chatco-api";
import { readShiftAccess } from "../../../core/api/shift-access";
let mockStates: any[] = [], mockRefs: any[] = [], mockI = 0, mockR = 0;
jest.mock("react", () => ({ ...jest.requireActual("react"), useMemo: (fn: any) => fn(), useCallback: (fn: any) => fn, useEffect: () => {},
  useState: (initial: any) => { const i = mockI++; if (!(i in mockStates)) mockStates[i] = initial; return [mockStates[i], (v: any) => { mockStates[i] = typeof v === "function" ? v(mockStates[i]) : v; }]; },
  useRef: (initial: any) => { const i = mockR++; return mockRefs[i] ?? (mockRefs[i] = { current: initial }); } }));
jest.mock("react-native", () => ({ Alert: {}, View: "View", Text: "Text", Pressable: "Button", AppState: {} }));
jest.mock("react-native-safe-area-context", () => ({ SafeAreaProvider: "SafeArea" }));
jest.mock("expo-status-bar", () => ({ StatusBar: "StatusBar" }));
jest.mock("../../../core/api/chatco-api", () => ({ api: { logout: jest.fn() }, setSessionEndedHandler: jest.fn(), syncPendingCashTransactions: jest.fn() }));
jest.mock("../../../core/api/api-client", () => ({}));
jest.mock("../../../core/storage/app-storage", () => ({ appStorage: {} }));
jest.mock("../../../core/api/shift-access", () => ({ ...jest.requireActual("../../../core/domain/shift-access"), readShiftAccess: jest.fn() }));
jest.mock("../../../core/theme/ThemeProvider", () => ({ ThemeProvider: "Theme", useAppTheme: () => ({ colors: {}, ready: true }) }));
jest.mock("../../../shared/ui", () => ({ BottomNav: "Nav", Loading: "Loading", VerificationBackButton: "Back" }));
jest.mock("../../../shared/ui/BrandFonts", () => ({ BrandFonts: "Fonts" }));
jest.mock("../../dashboard/DashboardScreen", () => ({ DashboardScreen: "Dashboard" }));
jest.mock("../../dashboard/ShiftGpsProvider", () => ({ ShiftGpsProvider: "Gps" }));
jest.mock("../../auth/LoginScreen", () => ({ LoginScreen: "Login" }));
jest.mock("../../auth/PasswordScreen", () => ({ PasswordScreen: "Password" }));
jest.mock("../../metrics/MetricsScreen", () => ({ MetricsScreen: "Metrics" }));
jest.mock("../../payments/PaymentModal", () => ({ PaymentModal: "Payment" }));
jest.mock("../ReportScreen", () => ({ ReportScreen: "Report" }));
jest.mock("../RemittanceReminder", () => ({ RemittanceReminder: "Reminder" }));
jest.mock("../RemittanceOverview", () => ({ RemittanceOverview: "History" }));
jest.mock("../../settings/SettingsScreen", () => ({ SettingsScreen: "Settings" }));
jest.mock("../../shift/VerificationScreen", () => ({ VerificationScreen: "Verify" }));
jest.mock("../../../core/utils/audio-cues", () => ({}));
function walk(n: any): any[] { if (Array.isArray(n)) return n.flatMap(walk); if (!React.isValidElement(n)) return []; const e = n as React.ReactElement<any>; return [e, ...walk(e.props.children)]; }
function render() { mockI = 0; mockR = 0; const root = walk(App()).find(e => typeof e.type === "function" && e.type.name === "AppRoot")!; return walk(root.type()); }
async function settle() { for (let i = 0; i < 12; i++) await Promise.resolve(); }
const user = { id: "conductor", name: "Conductor" };
const shift = { shiftId: "today", isActive: true, timeOut: null };
beforeEach(() => { mockStates = []; mockRefs = []; jest.clearAllMocks(); render(); mockStates[0] = false; (api.logout as jest.Mock).mockResolvedValue(undefined); });
test("today's completed remittance logs out and returns to login", async () => {
  mockStates[1] = user; mockStates[2] = shift; mockStates[6] = "report";
  render().find(e => e.type === "Report").props.onEnded(); await settle();
  expect(api.logout).toHaveBeenCalledTimes(1); expect(render().some(e => e.type === "Login")).toBe(true);
});
test("late remittance keeps authentication and returns to unit verification", async () => {
  mockStates[1] = user; mockStates[3] = { shift_id: "old", date: "2026-11-08", cash_total: 10, gcash_total: 0 }; mockStates[6] = "report";
  render().find(e => e.type === "Report").props.onEnded(); await settle();
  expect(api.logout).not.toHaveBeenCalled(); expect(mockStates[1]).toBe(user); expect(render().some(e => e.type === "Verify")).toBe(true);
});
test.each(["active", "unremitted", "waiting"])("login routes server-confirmed %s access", async kind => {
  (readShiftAccess as jest.Mock).mockResolvedValue({ kind, shift, remittance: { shift_id: "old" } });
  await render().find(e => e.type === "Login").props.onLogin(user);
  const type = kind === "active" ? "Dashboard" : kind === "unremitted" ? "Report" : "Verify";
  expect(render().some(e => e.type === type)).toBe(true);
});
test("failed login access reads go to verification instead of resuming a cached shift", async () => {
  (readShiftAccess as jest.Mock).mockRejectedValue(new Error("Offline"));
  await render().find(e => e.type === "Login").props.onLogin(user);
  expect(render().some(e => e.type === "Verify")).toBe(true);
});
