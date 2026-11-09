/// <reference types="jest" />
jest.mock("expo", () => ({ requireOptionalNativeModule: jest.fn() }));
let mockLoadMaps = jest.fn();
jest.mock("expo-maps", () => mockLoadMaps());

beforeEach(() => {
  jest.resetModules();
  mockLoadMaps = jest.fn();
});

test("missing ExpoMaps uses the fallback without importing the unavailable native package", () => {
  jest.isolateModules(() => {
    const expo = require("expo");
    expo.requireOptionalNativeModule.mockReturnValue(null);
    const { getNativeMaps } = require("../native-map-module");
    expect(getNativeMaps()).toBeNull();
    expect(mockLoadMaps).not.toHaveBeenCalled();
  });
});

test("an installed map module loads once and is reused", () => {
  jest.isolateModules(() => {
    require("expo").requireOptionalNativeModule.mockReturnValue({});
    const maps = { GoogleMaps: { View: "NativeMap" } };
    mockLoadMaps.mockReturnValue(maps);
    const { getNativeMaps } = require("../native-map-module");
    expect(getNativeMaps()).toBe(maps);
    expect(getNativeMaps()).toBe(maps);
    expect(mockLoadMaps).toHaveBeenCalledTimes(1);
  });
});

test("an incompatible native map view cannot crash app startup", () => {
  jest.isolateModules(() => {
    require("expo").requireOptionalNativeModule.mockReturnValue({});
    mockLoadMaps.mockImplementation(() => { throw new Error("Missing native view ExpoGoogleMaps"); });
    const { getNativeMaps } = require("../native-map-module");
    expect(getNativeMaps()).toBeNull();
  });
});
