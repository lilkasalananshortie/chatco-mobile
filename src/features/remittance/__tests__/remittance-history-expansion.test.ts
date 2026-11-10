/// <reference types="jest" />
import React from "react";
import { RemittanceHistorySection } from "../components/RemittanceHistorySection";

let states: unknown[] = [];
let stateIndex = 0;
jest.mock("react", () => ({ ...jest.requireActual("react"),
  useMemo: (fn: () => unknown) => fn(),
  useEffect: () => undefined,
  useRef: (value: unknown) => ({ current: value }),
  useState: (initial: unknown) => {
    const index = stateIndex++;
    if (!(index in states)) states[index] = initial;
    return [states[index], (next: unknown) => { states[index] = typeof next === "function" ? (next as Function)(states[index]) : next; }];
  },
}));
jest.mock("react-native", () => ({
  View: "View", Pressable: "Button",
  Animated: { View: "AnimatedView", Value: class {
    stopAnimation() {} setValue() {}
    interpolate(config: unknown) { return config; }
  } },
  Easing: { ease: {}, inOut: (value: unknown) => value },
}));
jest.mock("../../../shared/ui/BrandText", () => ({ Text: "Text" }));
jest.mock("@expo/vector-icons", () => ({ Ionicons: "Icon" }));
jest.mock("../report-styles", () => ({ useReportTheme: () => ({ colors: {}, styles: {} }) }));
jest.mock("../../../shared/ui", () => ({ ModalShell: "ModalShell" }));
jest.mock("../../../shared/ui/ConductorDatePicker", () => ({ ConductorDatePicker: "DatePicker" }));
jest.mock("../../../shared/ui/useWebEntrance", () => ({ useReducedMotion: () => true }));

function walk(node: unknown): React.ReactElement<any>[] {
  if (Array.isArray(node)) return node.flatMap(walk);
  if (!React.isValidElement(node)) return [];
  const element = node as React.ReactElement<any>;
  return [element, ...walk(element.props.children)];
}

test("first history expansion exposes its content before a height measurement, then animates with the measured height", () => {
  jest.useFakeTimers().setSystemTime(new Date("2026-11-11T04:00:00Z"));
  states = []; stateIndex = 0;
  const render = () => {
    stateIndex = 0;
    return walk(RemittanceHistorySection({
      history: [{ id: "remit-1", shift_id: "shift-1", date: "2026-11-11", cash_total: 44, gcash_total: 0 } as any],
      expanded: true, onToggle: jest.fn(), loading: false, error: "", onRetry: jest.fn(),
      filter: "week", onFilterChange: jest.fn(), dateFrom: "", onDateFromChange: jest.fn(),
      dateTo: "", onDateToChange: jest.fn(), page: 1, onPageChange: jest.fn(),
      onView: jest.fn(), onPrint: jest.fn(),
    }));
  };
  try {
    const initial = render();
    const panel = initial.find(element => element.type === "AnimatedView" && element.props.style?.overflow === "hidden")!;
    expect(panel.props.style.height).toBeUndefined();
    expect(initial.some(element => element.props.accessibilityLabel === "View official report")).toBe(true);
    initial.find(element => element.type === "View" && typeof element.props.onLayout === "function")!.props.onLayout({ nativeEvent: { layout: { height: 280 } } });
    const measured = render().find(element => element.type === "AnimatedView" && element.props.style?.overflow === "hidden")!;
    expect(measured.props.style.height.outputRange).toEqual([0, 280]);
  } finally { jest.useRealTimers(); }
});
