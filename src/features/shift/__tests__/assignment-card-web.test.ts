/// <reference types="jest" />
import React from "react";
import { AssignmentCard } from "../components/AssignmentCard";
const { renderToStaticMarkup } = require("react-dom/server");

jest.mock("react-native", () => require("react-native-web/dist/cjs/index.js"));
jest.mock("react-native-svg", () => {
  const path = require("path");
  return require(path.join(process.cwd(), "node_modules/react-native-svg/lib/commonjs/elements.web.js"));
});
jest.mock("@expo/vector-icons", () => ({ Ionicons: "span" }));
jest.mock("../../../core/theme/ThemeProvider", () => ({ useAppTheme: () => ({
  colors: { primary: "#1A5FB4", primaryLight: "#62A0EA", border: "#234", surface: "#0B1E33", text: "#fff", muted: "#91A0B4" },
  styles: { card: {} }, isLight: false, isLowFidelity: false,
}) }));

test("unit assignment card renders in the web runtime with the minibus icon", () => {
  const html = renderToStaticMarkup(React.createElement(AssignmentCard, {
    item: { id: "unit-1", unitNumber: "UNIT-001", plateNumber: "NAA 0001", route: "Route", status: "available" },
    onSelect: () => {},
  }));
  expect(html).toContain("UNIT-001");
  expect(html).toContain("<svg");
});
