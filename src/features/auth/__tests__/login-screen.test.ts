/// <reference types="jest" />
import React from "react";
import { LoginScreen } from "../LoginScreen";
import { api } from "../../../core/api/chatco-api";
import { Keyboard } from "react-native";
let mockStates: any[] = [], mockRefs: any[] = [], mockCleanups: any[] = [];
let mockIndex = 0, mockRefIndex = 0, mockHeight = 800, mockLight = false;
jest.mock("react", () => ({ ...jest.requireActual("react"),
  useState: (value: any) => { const i = mockIndex++; if (!(i in mockStates)) mockStates[i] = value; return [mockStates[i], (next: any) => { mockStates[i] = typeof next === "function" ? next(mockStates[i]) : next; }]; },
  useRef: (value: any) => { const i = mockRefIndex++; return mockRefs[i] ?? (mockRefs[i] = { current: value }); },
  useEffect: (fn: () => any) => { if (!mockCleanups.length) mockCleanups.push(fn()); },
}));
jest.mock("react-native", () => ({ ActivityIndicator: "Spinner", Keyboard: { dismiss: jest.fn() }, KeyboardAvoidingView: "KeyboardView", Platform: { OS: "android" }, Pressable: "Button", ScrollView: "Scroll", StyleSheet: { create: (styles: any) => styles }, Text: "Text", TextInput: "Input", useWindowDimensions: () => ({ height: mockHeight }), View: "View" }));
jest.mock("react-native-safe-area-context", () => ({ SafeAreaView: "SafeArea" }));
jest.mock("@expo/vector-icons/Ionicons", () => "Icon");
jest.mock("../../../core/theme/ThemeProvider", () => ({ useAppTheme: () => ({ isLofi: mockLight, colors: { background: mockLight ? "light" : "dark", text: "text", muted: "muted", primary: "blue", border: "border", surface: "surface", surface2: "field", danger: "red" } }) }));
jest.mock("../../../core/api/chatco-api", () => ({ api: { login: jest.fn() } }));
jest.mock("../PasswordScreen", () => ({ PasswordScreen: "Recovery" }));
jest.mock("../../../shared/legal/LegalSupportCard", () => ({ LegalSupportCard: "LegalLinks" }));
function walk(node: any): any[] {
  if (Array.isArray(node)) return node.flatMap(walk);
  if (!React.isValidElement(node)) return [];
  const el = node as React.ReactElement<Record<string, any>>;
  return [el, ...walk(el.props.children)];
}
const onLogin = jest.fn();
function render() { mockIndex = 0; mockRefIndex = 0; return walk(LoginScreen({ onLogin })); }
const field = (label: string) => render().find(node => node.type === "Input" && node.props.accessibilityLabel === label);
const button = (label: string) => render().find(node => node.type === "Button" && node.props.accessibilityLabel === label);
const flush = async () => { for (let i = 0; i < 12; i++) await Promise.resolve(); };
function credentials() { field("Username or email").props.onChangeText(" operator "); field("Password").props.onChangeText("Password123! "); }
beforeEach(() => {
  jest.clearAllMocks(); mockStates = []; mockRefs = []; mockCleanups = []; mockHeight = 800; mockLight = false;
  (api.login as jest.Mock).mockResolvedValue({ id: "owner", role: "CONDUCTOR" });
});
test("login opens directly with compact legal access and no walkthrough", () => {
  const nodes = render();
  expect(nodes.some(node => node.type === "KeyboardView")).toBe(true);
  expect(nodes.find(node => node.type === "LegalLinks").props.compact).toBe(true);
  expect(button("Sign in").props.disabled).toBe(true);
  expect(nodes.some(node => React.Children.toArray(node.props.children).filter(child => typeof child === "string").join("") === "Your next shift\nstarts here.")).toBe(true);
});
test("sign-in preserves credentials contract, dismisses keyboard and prevents duplicate taps", async () => {
  let finish!: (value: any) => void;
  (api.login as jest.Mock).mockReturnValue(new Promise(resolve => { finish = resolve; }));
  credentials(); const press = button("Sign in").props.onPress;
  press(); press(); field("Password").props.onSubmitEditing();
  expect(api.login).toHaveBeenCalledTimes(1);
  expect(api.login).toHaveBeenCalledWith("operator", "Password123! "); // password must not be trimmed
  expect(Keyboard.dismiss).toHaveBeenCalledTimes(1);
  expect(field("Password").props.editable).toBe(false);
  finish({ id: "owner" }); await flush(); expect(onLogin).toHaveBeenCalledWith({ id: "owner" });
});
test("blank username cannot submit even through the keyboard", () => {
  field("Username or email").props.onChangeText("  "); field("Password").props.onChangeText("secret");
  field("Password").props.onSubmitEditing(); expect(api.login).not.toHaveBeenCalled();
});
test("failed login remains visible and retryable without clearing entered credentials", async () => {
  (api.login as jest.Mock).mockRejectedValueOnce(new Error("Invalid credentials"));
  credentials(); button("Sign in").props.onPress(); await flush();
  expect(render().some(node => node.props.accessibilityRole === "alert")).toBe(true);
  expect(render().some(node => node.props.children === "Invalid credentials")).toBe(true);
  expect(field("Username or email").props.value).toBe(" operator ");
  button("Sign in").props.onPress(); await flush(); expect(api.login).toHaveBeenCalledTimes(2);
});
test("password visibility and keyboard next retain their expected actions", () => {
  expect(field("Password").props.secureTextEntry).toBe(true);
  button("Show password").props.onPress(); expect(field("Password").props.secureTextEntry).toBe(false);
  const focus = jest.fn(); mockRefs[0].current = { focus };
  field("Username or email").props.onSubmitEditing(); expect(focus).toHaveBeenCalledTimes(1);
});
test("forgot password opens the existing recovery screen and returns to login", () => {
  const node = render().find(item => item.type === "Button" && walk(item).some(child => child.props.children === "Forgot password?"));
  node.props.onPress(); const recovery = render().find(item => item.type === "Recovery");
  expect(recovery).toBeTruthy(); recovery.props.onBack(); expect(button("Sign in")).toBeTruthy();
});
test.each([false, true])("small-screen login remains scrollable with theme light=%s", light => {
  mockLight = light; mockHeight = 600; const nodes = render();
  expect(nodes.find(node => node.type === "SafeArea").props.style[1].backgroundColor).toBe(light ? "light" : "dark");
  expect(nodes.find(node => node.type === "Scroll").props.keyboardShouldPersistTaps).toBe("handled");
  expect(field("Password").props.autoComplete).toBe("current-password");
});
