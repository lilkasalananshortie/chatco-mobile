/// <reference types="jest" />
/// <reference types="node" />
import { runInNewContext } from "node:vm";
import { LEAFLET_LIVE_UPDATE, leafletUpdateScript } from "../leaflet-live-update";

function setup() {
  const elements: any[] = [];
  const document = { createElement: (tag: string) => {
    const element: any = { tag, style: {}, children: [], appendChild(child: any) { this.children.push(child); }, querySelectorAll() { return this.children; } };
    elements.push(element); return element;
  } };
  const layer = { addTo: jest.fn().mockReturnThis(), clearLayers: jest.fn() };
  const makeMarker = () => ({ addTo: jest.fn().mockReturnThis(), on: jest.fn().mockReturnThis(), setLatLng: jest.fn().mockReturnThis(), setIcon: jest.fn().mockReturnThis(), bindPopup: jest.fn().mockReturnThis() });
  const L = { layerGroup: jest.fn(() => layer), marker: jest.fn(makeMarker), circle: jest.fn(makeMarker), divIcon: jest.fn(value => value) };
  const window: any = { ReactNativeWebView: { postMessage: jest.fn() } };
  const context = { L, window, document, map: {}, neutral: "#fff" };
  runInNewContext(LEAFLET_LIVE_UPDATE, context);
  const update = (changes: object = {}) => runInNewContext(leafletUpdateScript({
    latitude: 14.8, longitude: 120.9, vehicleIconHtml: "<svg></svg>", canOperate: true,
    hails: [{ id: "h1", latitude: 14.81, longitude: 120.91, commuterName: "Rider" }], ...changes,
  }), context);
  return { L, layer, window, elements, update };
}

test("GPS updates reuse map layers and preserve unchanged passenger popups", () => {
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

test("hail actions post the selected identity and become disabled for view-only devices", () => {
  const { window, elements, update } = setup();
  update();
  const accept = elements.find(element => element.tag === "button" && element.textContent === "Accept");
  accept.onclick();
  expect(JSON.parse(window.ReactNativeWebView.postMessage.mock.calls[0][0])).toEqual({ type: "hail", id: "h1", action: "accept" });
  update({ canOperate: false });
  const latestAccept = elements.filter(element => element.tag === "button" && element.textContent === "Accept").pop();
  expect(latestAccept.disabled).toBe(true);
  latestAccept.onclick();
  expect(window.ReactNativeWebView.postMessage).toHaveBeenCalledTimes(1);
});

test("passenger labels and quotes remain data inside the JavaScript bridge", () => {
  const { elements, update } = setup();
  const label = '</script><script>throw new Error("unexpected")</script>\u2028';
  update({ hails: [{ id: "quote'", latitude: 14.8, longitude: 120.9, commuterName: label }] });
  expect(elements.find(element => element.tag === "strong").textContent).toBe(label);
});
