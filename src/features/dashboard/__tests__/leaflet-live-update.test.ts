/// <reference types="jest" />
/// <reference types="node" />
import { runInNewContext } from "node:vm";
import { LEAFLET_LIVE_UPDATE, leafletUpdateScript } from "../leaflet-live-update";

function setup() {
  const layer = { addTo: jest.fn().mockReturnThis(), clearLayers: jest.fn() };
  const makeMarker = () => ({ addTo: jest.fn().mockReturnThis(), on: jest.fn().mockReturnThis(), setLatLng: jest.fn().mockReturnThis(), setIcon: jest.fn().mockReturnThis(), bindPopup: jest.fn().mockReturnThis() });
  const L = { layerGroup: jest.fn(() => layer), marker: jest.fn(makeMarker), circle: jest.fn(makeMarker), divIcon: jest.fn(value => value) };
  const window: any = { ReactNativeWebView: { postMessage: jest.fn() } };
  const context = { L, window, map: {}, neutral: "#fff", JSON };
  runInNewContext(LEAFLET_LIVE_UPDATE, context);
  const update = (changes: object = {}) => runInNewContext(leafletUpdateScript({
    latitude: 14.8, longitude: 120.9, vehicleIconHtml: "<svg></svg>", hailMarkerHtml: "<svg>commuter pin</svg>", acceptedHailMarkerHtml: "<svg>accepted pin</svg>",
    hails: [{ id: "h1", latitude: 14.81, longitude: 120.91, status: "PENDING" }], ...changes,
  }), context);
  return { L, layer, window, update };
}
const hailClick = (L: ReturnType<typeof setup>["L"], index = 1) =>
  L.marker.mock.results[index]!.value.on.mock.calls.find(([event]: [string]) => event === "click")![1] as () => void;

test("GPS updates reuse map layers and preserve unchanged passenger pins", () => {
  const { L, layer, update } = setup();
  update();
  const vehicle = L.marker.mock.results[0]!.value;
  const circle = L.circle.mock.results[0]!.value;
  update({ latitude: 14.82 });
  expect(L.marker).toHaveBeenCalledTimes(2); // one vehicle, one hail
  expect(L.circle).toHaveBeenCalledTimes(1);
  expect(vehicle.setLatLng).toHaveBeenCalledWith([14.82, 120.9]);
  expect(circle.setLatLng).toHaveBeenCalledWith([14.82, 120.9]);
  expect(layer.clearLayers).toHaveBeenCalledTimes(1);
  update({ hails: [] });
  expect(layer.clearLayers).toHaveBeenCalledTimes(2);
});

test("a waiting commuter uses the orange pin and reports its tap to the app", () => {
  const { L, window, update } = setup();
  update();
  expect(L.divIcon).toHaveBeenCalledWith(expect.objectContaining({ className: "chatco-hail-marker", html: "<svg>commuter pin</svg>" }));
  expect(L.marker).toHaveBeenCalledWith([14.81, 120.91], expect.objectContaining({ zIndexOffset: 1000 }));
  expect(window.ReactNativeWebView.postMessage).not.toHaveBeenCalled();
  hailClick(L)();
  expect(JSON.parse(window.ReactNativeWebView.postMessage.mock.calls[0][0])).toEqual({ type: "hail", id: "h1" });
});

test("an accepted hail redraws with the accepted pin", () => {
  const { L, layer, update } = setup();
  update();
  update({ hails: [{ id: "h1", latitude: 14.81, longitude: 120.91, status: "ACCEPTED" }] });
  expect(layer.clearLayers).toHaveBeenCalledTimes(2);
  expect(L.divIcon).toHaveBeenCalledWith(expect.objectContaining({ className: "chatco-hail-marker", html: "<svg>accepted pin</svg>" }));
});

test("hail ids stay escaped inside the JavaScript bridge", () => {
  const { L, window, update } = setup();
  const id = '</script><script>throw new Error("unexpected")</script> ';
  update({ hails: [{ id, latitude: 14.8, longitude: 120.9, status: "PENDING" }] });
  hailClick(L)();
  expect(JSON.parse(window.ReactNativeWebView.postMessage.mock.calls[0][0]).id).toBe(id);
});
