/// <reference types="jest" />
import React from "react";
import { BreakConfirmModal } from "../../../features/dashboard/components/BreakConfirmModal";
jest.mock("react", () => ({ ...jest.requireActual("react"), useRef: (value: unknown) => ({ current: value }), useState: (value: unknown) => [value, jest.fn()], useEffect: jest.fn() }));
jest.mock("react-native", () => ({ Modal: "Modal", Pressable: "Button", View: "View", useWindowDimensions: () => ({ width: 390 }), StyleSheet: { create: (value: unknown) => value } }));
jest.mock("react-native-safe-area-context", () => ({ useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }) }));
jest.mock("../../../shared/ui/ConductorIcon", () => ({ ConductorIcon: "Icon" }));
jest.mock("../../../shared/ui/SlideToConfirm", () => ({ SlideToConfirm: "Slider" }));
jest.mock("@expo/vector-icons", () => ({ Ionicons: "Icon" }));
jest.mock("../../../core/theme/ThemeProvider", () => ({ useAppTheme: () => ({ colors: {}, styles: {} }) }));
jest.mock("../../../shared/ui", () => ({ ModalShell: "Modal" }));
type Element = React.ReactElement<Record<string, any>>;
function walk(node: React.ReactNode): Element[] {
  if (Array.isArray(node)) return node.flatMap(walk);
  if (!React.isValidElement(node)) return [];
  const element = node as Element;
  return [element, ...walk(element.props.children)];
}
test("break and resume require the web-equivalent slide confirmation", () => {
  for (const isOnBreak of [false, true]) {
    const nodes = walk(BreakConfirmModal({ visible: true, isOnBreak, breakPending: false, onClose: jest.fn(), onConfirm: jest.fn() }));
    expect(nodes.some(node => node.props.label === (isOnBreak ? "Slide to resume duty" : "Slide to start break"))).toBe(true);
    expect(nodes.some(node => node.props.successLabel === "Done" && node.props.uppercaseLabel === false)).toBe(true);
    expect(nodes.some(node => node.props.accessibilityLabel === "Close modal")).toBe(true);
  }
});
test("rapid confirmation taps invoke the existing operation only once", async () => {
  let finish!: (result: boolean) => void;
  const onConfirm = jest.fn(() => new Promise<boolean>(done => { finish = done; }));
  const nodes = walk(BreakConfirmModal({ visible: true, isOnBreak: false, breakPending: false, onClose: jest.fn(), onConfirm }));
  const confirm = nodes.find(node => node.props.onComplete)!.props.onComplete;
  const first = confirm(); await confirm(); expect(onConfirm).toHaveBeenCalledTimes(1);
  finish(true); await expect(first).resolves.toBe(true);
});
test("a pending backend update disables confirmation", () => {
  const nodes = walk(BreakConfirmModal({ visible: true, isOnBreak: false, breakPending: true, onClose: jest.fn(), onConfirm: jest.fn() }));
  expect(nodes.find(node => node.props.onComplete)?.props.disabled).toBe(true);
});
