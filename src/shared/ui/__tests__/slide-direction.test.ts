/// <reference types="jest" />
import React from "react";

jest.mock("react", () => ({
  ...jest.requireActual("react"),
  useState: (initial: unknown) => [initial === 0 ? 320 : initial, jest.fn()],
  useRef: (initial: unknown) => ({ current: initial }),
  useMemo: (factory: () => unknown) => factory(),
  useEffect: () => undefined,
}));
jest.mock("react-native", () => ({
  View: "View", ActivityIndicator: "Spinner",
  StyleSheet: { create: (styles: unknown) => styles },
  PanResponder: { create: (handlers: unknown) => ({ panHandlers: handlers }) },
  Animated: {
    View: "AnimatedView",
    Value: class {
      setValue = jest.fn();
      interpolate(config: unknown) { return config; }
    },
    multiply: (value: unknown, multiplier: number) => ({ value, multiplier }),
    spring: () => ({ start: jest.fn() }),
  },
}));
jest.mock("../BrandText", () => ({ Text: "Text" }));
jest.mock("../ConductorIcon", () => ({ ConductorIcon: "Icon" }));
jest.mock("../../../core/utils/haptics", () => ({ appHaptics: { selection: jest.fn() } }));
jest.mock("../../../core/theme/ThemeProvider", () => ({ useAppTheme: () => ({ colors: {}, isLofi: false }) }));
jest.mock("../useWebEntrance", () => ({ useReducedMotion: () => false }));

import { SlideToConfirm } from "../SlideToConfirm";
type Element = React.ReactElement<Record<string, any>>;
function children(node: Element): Element[] { return React.Children.toArray(node.props.children).filter(React.isValidElement) as Element[]; }
function style(node: Element) { return Object.assign({}, ...node.props.style.filter(Boolean)); }

test.each([false, true])("direction slider has one consistently anchored rounded handle (reverse=%s)", reverse => {
  const root = SlideToConfirm({ label: "Switch", onComplete: jest.fn(), rounded: true, expandHandle: true, reverse }) as Element;
  const [fill, , knob] = children(root);
  expect(style(knob!)).toMatchObject({ left: reverse ? "auto" : 4, right: reverse ? 4 : "auto", width: 48, height: 48 });
  expect(style(fill!)).toMatchObject({ left: reverse ? "auto" : 4, right: reverse ? 4 : "auto", borderRadius: 24 });
  expect(style(fill!).width.outputRange).toEqual([48, 312]);
  expect(style(fill!).transform).toBeUndefined();
});

test("reverse slider moves left and rejects a drag in the opposite direction", () => {
  const root = SlideToConfirm({ label: "Switch", onComplete: jest.fn(), reverse: true }) as Element;
  const knob = children(root)[2]!;
  const animation = style(knob).transform[0].translateX;
  expect(animation.multiplier).toBe(-1);
  root.props.onPanResponderMove({}, { dx: -100 });
  expect(animation.value.setValue).toHaveBeenLastCalledWith(100);
  root.props.onPanResponderMove({}, { dx: 100 });
  expect(animation.value.setValue).toHaveBeenLastCalledWith(0);
});
