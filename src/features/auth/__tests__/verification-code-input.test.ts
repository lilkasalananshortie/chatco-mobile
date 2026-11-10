/// <reference types="jest" />
import React from "react";
import { VerificationCodeInput } from "../VerificationCodeInput";

jest.mock("react", () => ({ ...jest.requireActual("react"), useRef: (initial: unknown) => ({ current: initial }), useState: (initial: unknown) => [initial, jest.fn()] }));
jest.mock("react-native", () => ({ View: "View" }));
jest.mock("../../../shared/ui/BrandText", () => ({ TextInput: "Input" }));
jest.mock("../../../core/theme/ThemeProvider", () => ({ useAppTheme: () => ({ colors: { primaryLight: "blue", surface2: "surface", border: "border", text: "text" } }) }));

type Element = React.ReactElement<Record<string, any>>;
function walk(node: any): Element[] {
  if (Array.isArray(node)) return node.flatMap(walk);
  if (!React.isValidElement(node)) return [];
  const element = node as Element;
  return [element, ...walk(element.props.children)];
}

test("shows six digit boxes and accepts a pasted code", () => {
  const onChange = jest.fn();
  const inputs = walk(VerificationCodeInput({ value: "", onChange })).filter(node => node.type === "Input");
  expect(inputs).toHaveLength(6);
  expect(inputs.map(input => input.props.accessibilityLabel)).toEqual(Array.from({ length: 6 }, (_, index) => `Reset code digit ${index + 1} of 6`));
  inputs[0]!.props.onChangeText("123456");
  expect(onChange).toHaveBeenCalledWith("123456");
});

test("backspace in an empty box clears the previous digit", () => {
  const onChange = jest.fn();
  const inputs = walk(VerificationCodeInput({ value: "123", onChange })).filter(node => node.type === "Input");
  inputs[3]!.props.onKeyPress({ nativeEvent: { key: "Backspace" } });
  expect(onChange).toHaveBeenCalledWith("12");
});
