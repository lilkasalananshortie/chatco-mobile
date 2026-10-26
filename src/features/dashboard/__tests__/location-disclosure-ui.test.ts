/// <reference types="jest" />
import React from "react";
import { ShiftGpsProvider } from "../ShiftGpsProvider";
import { useDashboardGps } from "../hooks/useDashboardGps";
import { acknowledgeLocationNotice, hasLocationNotice } from "../location-notice";
let mockStates: any[] = [], mockRefs: any[] = [], mockEffects: any[] = [], mockPending: Array<() => void> = [];
let mockStateIndex = 0, mockRefIndex = 0, mockEffectIndex = 0;
jest.mock("react", () => ({ ...jest.requireActual("react"),
  useState: (value: any) => { const i = mockStateIndex++; if (!(i in mockStates)) mockStates[i] = value; return [mockStates[i], (next: any) => { mockStates[i] = typeof next === "function" ? next(mockStates[i]) : next; }]; },
  useRef: (value: any) => { const i = mockRefIndex++; return mockRefs[i] ?? (mockRefs[i] = { current: value }); },
  useEffect: (effect: () => any, deps: any[]) => { const i = mockEffectIndex++; if (!mockEffects[i] || deps.some((value, n) => value !== mockEffects[i].deps[n])) mockPending.push(() => { mockEffects[i]?.cleanup?.(); mockEffects[i] = { deps, cleanup: effect() }; }); },
}));
jest.mock("react-native", () => ({ Modal: "Modal", Pressable: "Button", ScrollView: "ScrollView", Text: "Text", View: "View" }));
jest.mock("react-native-safe-area-context", () => ({ SafeAreaView: "SafeArea" }));
jest.mock("../../../core/theme/ThemeProvider", () => ({ useAppTheme: () => ({ colors: { text: "text" } }) }));
jest.mock("../hooks/useDashboardGps", () => ({ useDashboardGps: jest.fn() }));
jest.mock("../location-notice", () => ({ hasLocationNotice: jest.fn(), acknowledgeLocationNotice: jest.fn(), LOCATION_NOTICE_TEXT: "Location disclosure" }));
jest.mock("../../../shared/legal/legal-links", () => ({ openLegalLink: jest.fn() }));
function walk(node: any): any[] {
  if (Array.isArray(node)) return node.flatMap(walk);
  if (!React.isValidElement(node)) return [];
  const element = node as React.ReactElement<Record<string, any>>;
  return [element, ...walk(element.props.children)];
}
function render(userId = "owner", canOperate = true) {
  mockStateIndex = 0; mockRefIndex = 0; mockEffectIndex = 0;
  const tree = ShiftGpsProvider({ userId, canOperate, shift: { shiftId: "s" } as any, refreshKey: 0, children: React.createElement("Dashboard") });
  while (mockPending.length) mockPending.shift()!();
  return walk(tree);
}
const flush = async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); };
const button = (text: string) => render().find(node => node.type === "Button" && walk(node).some(child => child.props.children === text));
const trackingEnabled = () => (useDashboardGps as jest.Mock).mock.calls.at(-1)[0].canOperate;
beforeEach(() => {
  jest.resetAllMocks(); mockStates = []; mockRefs = []; mockEffects = []; mockPending = [];
  (hasLocationNotice as jest.Mock).mockResolvedValue(false);
  (useDashboardGps as jest.Mock).mockReturnValue({});
});
test("mount does not enable GPS before acknowledgement is loaded or accepted", async () => {
  render(); expect(trackingEnabled()).toBe(false); await flush();
  expect(render().find(node => node.type === "Modal").props.visible).toBe(true);
  expect(trackingEnabled()).toBe(false);
  expect(acknowledgeLocationNotice).not.toHaveBeenCalled();
});
test("Not now leaves tracking off and does not persist consent", async () => {
  render(); await flush(); button("Not now — keep tracking off").props.onPress();
  expect(render().find(node => node.type === "Modal").props.visible).toBe(false);
  expect(trackingEnabled()).toBe(false); expect(acknowledgeLocationNotice).not.toHaveBeenCalled();
});
test("explicit continuation saves once before enabling tracking", async () => {
  let finish!: () => void;
  (acknowledgeLocationNotice as jest.Mock).mockReturnValue(new Promise<void>(resolve => { finish = resolve; }));
  render(); await flush();
  const proceed = button("Continue to location permissions"); proceed.props.onPress(); proceed.props.onPress();
  render(); expect(trackingEnabled()).toBe(false); expect(acknowledgeLocationNotice).toHaveBeenCalledTimes(1);
  finish(); await flush(); render(); expect(trackingEnabled()).toBe(true);
});
test("failed acknowledgement storage keeps the notice open and allows retry", async () => {
  (acknowledgeLocationNotice as jest.Mock).mockRejectedValueOnce(new Error("No storage"));
  render(); await flush(); button("Continue to location permissions").props.onPress(); await flush();
  const nodes = render(); expect(trackingEnabled()).toBe(false);
  expect(nodes.some(node => node.props.accessibilityRole === "alert")).toBe(true);
  button("Continue to location permissions").props.onPress(); await flush(); render(); expect(trackingEnabled()).toBe(true);
});
test("saved acknowledgement survives restart but never bypasses device authorization", async () => {
  (hasLocationNotice as jest.Mock).mockResolvedValue(true);
  render(); await flush(); render("owner", false); expect(trackingEnabled()).toBe(false);
  render(); expect(trackingEnabled()).toBe(true);
});
test("acknowledgement from a previous account never enables the next account", async () => {
  (hasLocationNotice as jest.Mock).mockResolvedValueOnce(true).mockResolvedValue(false);
  render(); await flush(); render(); expect(trackingEnabled()).toBe(true);
  render("other"); expect(trackingEnabled()).toBe(false); await flush(); render("other"); expect(trackingEnabled()).toBe(false);
});
test("failed notice reads require review rather than silently granting tracking", async () => {
  (hasLocationNotice as jest.Mock).mockRejectedValue(new Error("Corrupt storage"));
  render(); await flush(); const nodes = render();
  expect(trackingEnabled()).toBe(false);
  expect(nodes.find(node => node.type === "Modal").props.visible).toBe(true);
  expect(nodes.some(node => node.props.accessibilityRole === "alert")).toBe(true);
});
test("a late acknowledgement save for another account cannot authorize the current account", async () => {
  let finish!: () => void;
  (acknowledgeLocationNotice as jest.Mock).mockReturnValue(new Promise<void>(resolve => { finish = resolve; }));
  render(); await flush(); button("Continue to location permissions").props.onPress();
  render("other"); await flush(); finish(); await flush(); render("other");
  expect(trackingEnabled()).toBe(false);
});
