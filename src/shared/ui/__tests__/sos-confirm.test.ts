/// <reference types="jest" />
import React from "react";
import * as Location from "expo-location";
import { api } from "../../../core/api/chatco-api";
import { SosConfirmModal } from "../SosConfirmModal";
let mockStates: any[] = [], mockIndex = 0;
jest.mock("react", () => ({ ...jest.requireActual("react"), useEffect: () => {}, useCallback: (fn: unknown) => fn, useRef: (value: unknown) => ({ current: value }), useState: (initial: unknown) => { const i = mockIndex++; if (!(i in mockStates)) mockStates[i] = initial; return [mockStates[i], (next: unknown) => { mockStates[i] = next; }]; } }));
jest.mock("react-native", () => ({ Linking: { openURL: jest.fn() }, Modal: "Modal", Pressable: "Button", Text: "Text", View: "View" }));
jest.mock("@expo/vector-icons", () => ({ Ionicons: "Icon" }));
jest.mock("expo-location", () => ({ requestForegroundPermissionsAsync: jest.fn(), getCurrentPositionAsync: jest.fn(), Accuracy: { Balanced: 3 } }));
jest.mock("../../../core/api/chatco-api", () => ({ api: { sos: jest.fn() } }));
jest.mock("../../../core/theme/ThemeProvider", () => ({ useAppTheme: () => ({ colors: {}, isLofi: false }) }));
jest.mock("../sos-modal-styles", () => ({ sosModalStyles: {} }));
jest.mock("../SlideToConfirm", () => ({ SlideToConfirm: "SosSlide" }));
const walk = (node: any): any[] => Array.isArray(node) ? node.flatMap(walk) : React.isValidElement(node) ? [node, ...walk((node.props as any).children)] : [];
let clock = 1000000;
beforeEach(() => { mockStates = []; mockIndex = 0; jest.resetAllMocks(); jest.spyOn(Date, "now").mockReturnValue(clock += 120000); });
afterEach(() => jest.restoreAllMocks());
function activate() { return walk(SosConfirmModal({ isOpen: true, onClose: jest.fn() })).find(node => node.type === "SosSlide").props.onComplete; }
test("denied GPS permission never sends a fabricated emergency location", async () => {
  (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({ status: "denied" });
  await activate()();
  expect(api.sos).not.toHaveBeenCalled();
  expect(mockStates[0]).toBe("error");
  expect(mockStates[2]).toContain("Location access is required");
});
test("GPS failure remains retryable without sending a fallback coordinate", async () => {
  (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({ status: "granted" });
  (Location.getCurrentPositionAsync as jest.Mock).mockRejectedValue(new Error("GPS unavailable"));
  await activate()();
  expect(api.sos).not.toHaveBeenCalled();
  expect(mockStates[2]).toBe("GPS unavailable");
});
test("duplicate completion sends the actual fix once", async () => {
  (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({ status: "granted" });
  (Location.getCurrentPositionAsync as jest.Mock).mockResolvedValue({ coords: { latitude: 14.7, longitude: 120.9 } });
  (api.sos as jest.Mock).mockResolvedValue({ id: "sos", status: "ACTIVE" });
  const action = activate(); await Promise.all([action(), action()]);
  expect(api.sos).toHaveBeenCalledTimes(1);
  expect(api.sos).toHaveBeenCalledWith(14.7, 120.9, "Emergency alert from conductor");
});
