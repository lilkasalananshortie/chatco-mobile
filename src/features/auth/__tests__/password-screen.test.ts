/// <reference types="jest" />
import React from "react";
import { PasswordScreen } from "../PasswordScreen";
import { api } from "../../../core/api/chatco-api";
let mockStates: any[] = [], mockRefs: any[] = [], mockIndex = 0, mockRefIndex = 0;
jest.mock("react", () => ({ ...jest.requireActual("react"), useEffect: () => {}, useRef: (initial: unknown) => { const i = mockRefIndex++; return mockRefs[i] ?? (mockRefs[i] = { current: initial }); }, useState: (initial: unknown) => { const i = mockIndex++; if (!(i in mockStates)) mockStates[i] = initial; return [mockStates[i], (value: any) => { mockStates[i] = typeof value === "function" ? value(mockStates[i]) : value; }]; } }));
jest.mock("react-native", () => ({ Pressable: "Button", Text: "Text", TextInput: "Input" }));
jest.mock("../../../shared/ui", () => ({ Header: "Header", ScreenShell: "Shell" }));
jest.mock("../../../core/theme/ThemeProvider", () => ({ useAppTheme: () => ({ colors: {}, styles: {} }) }));
jest.mock("../../../core/api/chatco-api", () => ({ api: { forgotPassword: jest.fn(), verifyResetCode: jest.fn(), resetPassword: jest.fn(), setNewPassword: jest.fn(), logout: jest.fn() } }));
type Element = React.ReactElement<Record<string, any>>;
function walk(node: any): Element[] { if (Array.isArray(node)) return node.flatMap(walk); if (!React.isValidElement(node)) return []; const element = node as Element; return [element, ...walk(element.props.children)]; }
const back = jest.fn();
function render(setup = false) { mockIndex = 0; mockRefIndex = 0; return walk(PasswordScreen({ setup, onBack: back })); }
function button(label: string, setup = false) { return render(setup).find(e => e.type === "Button" && walk(e).some(child => child.props.children === label))!; }
beforeEach(() => { jest.clearAllMocks(); mockStates = []; mockRefs = []; });
test("recovery UI follows email, code, password and fresh sign-in", async () => {
  render(); mockStates[1] = " conductor@test.com ";
  await button("Send reset code").props.onPress();
  expect(api.forgotPassword).toHaveBeenCalledWith("conductor@test.com");
  mockStates[2] = "123456"; await button("Verify code").props.onPress();
  expect(api.verifyResetCode).toHaveBeenCalledWith("conductor@test.com", "123456");
  mockStates[3] = mockStates[4] = "NewPassword123!"; await button("Save password").props.onPress();
  expect(api.resetPassword).toHaveBeenCalledWith({ email: "conductor@test.com", code: "123456", password: "NewPassword123!", passwordConfirmation: "NewPassword123!" });
  button("Sign in again").props.onPress(); expect(back).toHaveBeenCalledTimes(1);
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
test("mandatory setup uses the dedicated API, not public recovery", async () => {
  render(true); mockStates[3] = mockStates[4] = "NewPassword123!";
  await button("Save password", true).props.onPress();
  expect(api.setNewPassword).toHaveBeenCalledWith("NewPassword123!", "NewPassword123!"); expect(api.resetPassword).not.toHaveBeenCalled();
});
