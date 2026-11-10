/// <reference types="jest" />
import React from "react";
import { PasswordScreen } from "../PasswordScreen";
import { api } from "../../../core/api/chatco-api";
import { useReducedMotion, useWebEntrance } from "../../../shared/ui/useWebEntrance";
let mockStates: any[] = [], mockRefs: any[] = [], mockIndex = 0, mockRefIndex = 0;
let mockFinish: ((result: { finished: boolean }) => void) | undefined;
jest.mock("react", () => ({ ...jest.requireActual("react"), useEffect: () => {}, useRef: (initial: unknown) => { const i = mockRefIndex++; return mockRefs[i] ?? (mockRefs[i] = { current: initial }); }, useState: (initial: unknown) => { const i = mockIndex++; if (!(i in mockStates)) mockStates[i] = initial; return [mockStates[i], (value: any) => { mockStates[i] = typeof value === "function" ? value(mockStates[i]) : value; }]; } }));
jest.mock("react-native", () => ({ Animated: {
  View: "AnimatedView",
  Value: jest.fn().mockImplementation(() => ({ setValue: jest.fn() })),
  timing: jest.fn(() => ({ start: (callback: (result: { finished: boolean }) => void) => { mockFinish = callback; }, stop: jest.fn() })),
}, Easing: { out: (value: unknown) => value, quad: "quad" }, Keyboard: { dismiss: jest.fn() }, Pressable: "Button", StyleSheet: { create: (styles: unknown) => styles }, Text: "Text", TextInput: "Input" }));
jest.mock("../../../shared/ui", () => ({ Header: "Header", ScreenShell: "Shell" }));
jest.mock("../VerificationCodeInput", () => ({ VerificationCodeInput: "CodeBoxes" }));
jest.mock("../../../shared/ui/useWebEntrance", () => ({ useReducedMotion: jest.fn(() => false), useWebEntrance: jest.fn(() => ({ opacity: 1, transform: [{ translateY: 0 }] })) }));
jest.mock("../../../core/theme/ThemeProvider", () => ({ useAppTheme: () => ({ colors: {}, styles: {}, isLowFidelity: false }) }));
jest.mock("../../../core/api/chatco-api", () => ({ api: { forgotPassword: jest.fn(), verifyResetCode: jest.fn(), resetPassword: jest.fn(), setNewPassword: jest.fn(), logout: jest.fn() } }));
type Element = React.ReactElement<Record<string, any>>;
function walk(node: any): Element[] { if (Array.isArray(node)) return node.flatMap(walk); if (!React.isValidElement(node)) return []; const element = node as Element; return [element, ...walk(element.props.children)]; }
const back = jest.fn();
function render(setup = false) { mockIndex = 0; mockRefIndex = 0; return walk(PasswordScreen({ setup, onBack: back })); }
function button(label: string, setup = false) { return render(setup).find(e => e.type === "Button" && walk(e).some(child => child.props.children === label))!; }
beforeEach(() => { jest.clearAllMocks(); mockStates = []; mockRefs = []; mockFinish = undefined; (useReducedMotion as jest.Mock).mockReturnValue(false); });
test("recovery UI follows email, code, password and fresh sign-in", async () => {
  const nodes = render();
  expect(nodes.find(e => e.type === "Shell")?.props.contentStyle).toMatchObject({ flexGrow: 1, justifyContent: "center" });
  expect(nodes.find(e => e.type === "AnimatedView")?.props.style[0]).toEqual({ opacity: 1, transform: [{ translateY: 0 }] });
  expect(useWebEntrance).toHaveBeenCalledWith(true, false, 18, 300);
  const backButton = nodes.find(e => e.type === "Button" && walk(e).some(child => child.props.children === "Back to login"))!;
  expect(backButton.props.accessibilityRole).toBe("link");
  expect(backButton.props.style).toMatchObject({ alignSelf: "center", alignItems: "center", justifyContent: "center" });
  expect(backButton.props.style).not.toHaveProperty("backgroundColor");
  expect(backButton.props.style).not.toHaveProperty("borderWidth");
  expect(walk(backButton).find(e => e.props.children === "Back to login")?.props.style[0]).toMatchObject({ textAlign: "center", textDecorationLine: "underline" });
  mockStates[1] = " conductor@test.com ";
  await button("Send reset code").props.onPress();
  expect(api.forgotPassword).toHaveBeenCalledWith("conductor@test.com");
  const codeBoxes = render().find(e => e.type === "CodeBoxes")!;
  expect(codeBoxes.props).toMatchObject({ value: "", disabled: false });
  codeBoxes.props.onChange("123456");
  await button("Verify code").props.onPress();
  expect(api.verifyResetCode).toHaveBeenCalledWith("conductor@test.com", "123456");
  mockStates[3] = mockStates[4] = "NewPassword123!"; await button("Save password").props.onPress();
  expect(api.resetPassword).toHaveBeenCalledWith({ email: "conductor@test.com", code: "123456", password: "NewPassword123!", passwordConfirmation: "NewPassword123!" });
  button("Sign in again").props.onPress();
  expect(back).not.toHaveBeenCalled();
  mockFinish?.({ finished: true });
  expect(back).toHaveBeenCalledTimes(1);
});

test("Back to login fades opacity only before returning and ignores repeated taps", () => {
  const action = button("Back to login");
  action.props.onPress();
  action.props.onPress();
  expect(back).not.toHaveBeenCalled();
  const timing = require("react-native").Animated.timing as jest.Mock;
  expect(timing).toHaveBeenCalledTimes(1);
  expect(timing.mock.calls[0][1]).toMatchObject({ toValue: 0, duration: 240, useNativeDriver: true });
  const exiting = render().find(e => e.type === "AnimatedView")!;
  expect(exiting.props.style[0]).toHaveProperty("opacity");
  expect(exiting.props.style[0]).not.toHaveProperty("transform");
  mockFinish?.({ finished: true });
  expect(back).toHaveBeenCalledTimes(1);
});

test("reduced motion returns to login immediately", () => {
  (useReducedMotion as jest.Mock).mockReturnValue(true);
  button("Back to login").props.onPress();
  expect(back).toHaveBeenCalledTimes(1);
  expect(require("react-native").Animated.timing).not.toHaveBeenCalled();
});
test("invalid input and duplicate send taps cannot issue duplicate requests", async () => {
  await button("Send reset code").props.onPress(); expect(api.forgotPassword).not.toHaveBeenCalled();
  mockStates[1] = "conductor@test.com"; (api.forgotPassword as jest.Mock).mockReturnValue(new Promise(() => {}));
  const press = button("Send reset code").props.onPress; void press(); void press(); expect(api.forgotPassword).toHaveBeenCalledTimes(1);
});
test("wrong code remains retryable and does not enter password step", async () => {
  render(); mockStates[0] = "code"; mockStates[1] = "conductor@test.com"; mockStates[2] = "123456";
  (api.verifyResetCode as jest.Mock).mockRejectedValueOnce(new Error("Invalid code"));
  await button("Verify code").props.onPress(); expect(mockStates[0]).toBe("code"); expect(mockStates[6]).toBe("Invalid code");
});

test("resend remains visible during cooldown and becomes actionable afterward", async () => {
  render(); mockStates[0] = "code"; mockStates[1] = "conductor@test.com"; mockStates[7] = 60;
  const countdown = render().find(e => e.type === "Button" && e.props.accessibilityLabel === "Resend code in 60 seconds")!;
  expect(countdown.props.disabled).toBe(true);
  expect(walk(countdown).some(e => e.props.children === "Resend code in 60s")).toBe(true);
  mockStates[7] = 0;
  const resend = render().find(e => e.type === "Button" && e.props.accessibilityLabel === "Resend code")!;
  expect(resend.props.disabled).toBe(false);
  await resend.props.onPress();
  expect(api.forgotPassword).toHaveBeenCalledWith("conductor@test.com");
});
test("mandatory setup uses the dedicated API, not public recovery", async () => {
  render(true); mockStates[3] = mockStates[4] = "NewPassword123!";
  await button("Save password", true).props.onPress();
  expect(api.setNewPassword).toHaveBeenCalledWith("NewPassword123!", "NewPassword123!"); expect(api.resetPassword).not.toHaveBeenCalled();
});
