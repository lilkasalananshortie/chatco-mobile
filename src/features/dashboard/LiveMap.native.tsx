import { useEffect, useMemo, useRef, useState } from "react";
import Constants from "expo-constants";
import { LEAFLET_LIVE_UPDATE, leafletUpdateScript } from "./leaflet-live-update";
import { useImage } from "expo-image";
import type { AppleMaps as AppleMapsTypes, GoogleMaps as GoogleMapsTypes } from "expo-maps";
import { getNativeMaps } from "./native-map-module";
import { ActivityIndicator, Modal, Platform, Pressable, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";
import { Text } from "../../shared/ui/BrandText";
import Svg, { Path } from "react-native-svg";
import { useAppTheme } from "../../core/theme/ThemeProvider";
import type { LiveMapProps } from "./LiveMap";
import { distanceMeters, PICKUP_RADIUS_METERS, ROUTE_COORDINATES } from "./route-data";
import { JEEPNEY_PATH, markerPresentation, unitPopupPalette, vehicleMarkerDataUri, vehicleMarkerHtml } from "./map-presentation";

/** Use the platform map over native UI; keep Leaflet as the configured fallback. */
export function LiveMap({ latitude, longitude, hails, unitNumber = "—", fill = false, routeCoordinates, tripDirection = "SOUTHBOUND", capacity = "AVAILABLE", isOnBreak = false, canOperate = false, onHail }: LiveMapProps) {
  const { colors, isLofi } = useAppTheme();
  const googleMap = useRef<GoogleMapsTypes.MapView>(null);
  const appleMap = useRef<AppleMapsTypes.MapView>(null);
  const webView = useRef<WebView>(null);
  const busy = useRef(false);
  const [loaded, setLoaded] = useState(Platform.OS === "ios");
  const [mapError, setMapError] = useState(false);
  const [unitInfoVisible, setUnitInfoVisible] = useState(false);
  const nativeMaps = getNativeMaps();
  const configured = nativeMaps !== null && (Platform.OS !== "android" || Constants.expoConfig?.extra?.googleMapsConfigured === true);

  const route = useMemo(() => routeCoordinates && routeCoordinates.length > 1
    ? routeCoordinates
    : ROUTE_COORDINATES.map(point => [point.latitude, point.longitude] as [number, number]), [routeCoordinates]);
  const routeCenter = useMemo(() => ({
    latitude: (Math.min(...route.map(point => point[0])) + Math.max(...route.map(point => point[0]))) / 2,
    longitude: (Math.min(...route.map(point => point[1])) + Math.max(...route.map(point => point[1]))) / 2,
  }), [route]);
  const hasLivePosition = Number.isFinite(latitude) && Number.isFinite(longitude);
  const position = useMemo(() => ({
    latitude: hasLivePosition ? latitude! : routeCenter.latitude,
    longitude: hasLivePosition ? longitude! : routeCenter.longitude,
  }), [hasLivePosition, latitude, longitude, routeCenter]);
  const visibleHails = useMemo(() => hails.filter(hail =>
    Number.isFinite(hail.latitude) && Number.isFinite(hail.longitude)
      && distanceMeters(position, hail) <= PICKUP_RADIUS_METERS
  ), [hails, position]);

  const mapColor = colors.background;
  const routeColor = isLofi ? colors.primary : "#62A0EA";
  const neutralColor = isLofi ? "#071A2E" : "#FFFFFF";
  const vehicleLabel = `Unit ${unitNumber} · ${isOnBreak ? "On Break" : capacity.replace("_", " ")}`;
  const unitStatus = markerPresentation(capacity, isOnBreak);
  const popup = unitPopupPalette(isLofi, capacity, isOnBreak);
  const routeLabel = tripDirection === "SOUTHBOUND" ? "Calumpit → Meycauayan" : "Meycauayan → Calumpit";
  const vehiclePosition: [number, number] = [position.latitude, position.longitude];
  const vehicleIconHtml = vehicleMarkerHtml(capacity, isOnBreak, isLofi ? colors.surface : "#071A2E", tripDirection, route, vehiclePosition);
  const vehicleIcon = useImage(vehicleMarkerDataUri(capacity, isOnBreak, tripDirection, route, vehiclePosition), { maxWidth: 86, maxHeight: 80 });
  const lines = useMemo(() => [
    { id: "route-shadow", coordinates: route.map(([lat, lng]) => ({ latitude: lat, longitude: lng })), color: isLofi ? "rgba(26,95,180,0.2)" : "rgba(98,160,234,0.2)", width: 8, geodesic: true },
    { id: "route", coordinates: route.map(([lat, lng]) => ({ latitude: lat, longitude: lng })), color: routeColor, width: 4, geodesic: true },
  ], [route, routeColor, isLofi]);

  useEffect(() => {
    if (!loaded || !hasLivePosition) return;
    try {
      const camera = { coordinates: position, zoom: 14 };
      const result = Platform.OS === "android"
        ? googleMap.current?.setCameraPosition({ ...camera, duration: 500 })
        : appleMap.current?.setCameraPosition(camera);
      void Promise.resolve(result).catch(() => undefined);
    } catch { /* Keep the last map camera if a location update races with teardown. */ }
  }, [hasLivePosition, loaded, position]);

  const markersGoogle: GoogleMapsTypes.Marker[] = [
    { id: "vehicle", coordinates: position, title: `Unit ${unitNumber}`, snippet: isOnBreak ? "On Break" : capacity.replace("_", " "), showCallout: false, zIndex: 2, icon: vehicleIcon ?? undefined, anchor: { x: 0.5, y: 0.5 } },
    ...visibleHails.map(hail => ({ id: `hail-${hail.id}`, coordinates: { latitude: hail.latitude, longitude: hail.longitude }, title: hail.commuterName, snippet: `${hail.label || "Passenger waiting"}${hail.etaMinutes ? ` · ${hail.etaMinutes} min away` : ""}`, showCallout: true, zIndex: 3 })),
  ];
  const markersApple: AppleMapsTypes.Marker[] = [
    ...visibleHails.map(hail => ({ id: `hail-${hail.id}`, coordinates: { latitude: hail.latitude, longitude: hail.longitude }, title: `${hail.commuterName} · ${hail.label || "Passenger waiting"}`, systemImage: "figure.wave", tintColor: "#FF6D3A" })),
  ];
  const annotationsApple: AppleMapsTypes.Annotation[] = [
    { id: "vehicle", coordinates: position, title: `Unit ${unitNumber} · ${isOnBreak ? "On Break" : capacity.replace("_", " ")}`, icon: vehicleIcon ?? undefined },
  ];
  const circlesGoogle: GoogleMapsTypes.Circle[] = [{ id: "pickup-zone", center: position, radius: PICKUP_RADIUS_METERS, color: isLofi ? "rgba(26,95,180,0.05)" : "rgba(255,255,255,0.05)", lineColor: isLofi ? "rgba(7,26,46,0.3)" : "rgba(255,255,255,0.3)", lineWidth: 1.5 }];
  const circlesApple: NonNullable<AppleMapsTypes.MapProps["circles"]> = [{ id: "pickup-zone", center: position, radius: PICKUP_RADIUS_METERS, color: isLofi ? "rgba(26,95,180,0.05)" : "rgba(255,255,255,0.05)", lineColor: isLofi ? "rgba(7,26,46,0.3)" : "rgba(255,255,255,0.3)", lineWidth: 1.5 }];

  const html = useMemo(() => {
    const apiKey = process.env.EXPO_PUBLIC_CARTO_API_KEY || Constants.expoConfig?.extra?.cartoApiKey as string | undefined;
    const tiles = `https://{s}.basemaps.cartocdn.com/${isLofi ? "rastertiles/voyager" : "dark_all"}/{z}/{x}/{y}{r}.png${apiKey ? `?key=${encodeURIComponent(apiKey)}` : ""}`;
    return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"><link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"><script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script><style>html,body,#map{height:100%;width:100%;margin:0;background:${mapColor}}.map-tiles-mono{filter:grayscale(1)}.leaflet-control-attribution{display:none}.hail-actions{display:flex;gap:8px;margin-top:12px}.hail-actions button{flex:1;border-radius:8px;padding:6px 8px;font-size:12px;font-weight:700;border:1px solid #D1D5DB;background:white;color:#374151}.hail-actions button:first-child{border-color:#1A5FB4;background:#1A5FB4;color:white}.hail-actions button:disabled{opacity:.4}</style></head><body><div id="map"></div><script>
      var coords=${JSON.stringify(route)},bounds=L.latLngBounds(coords),map=L.map('map',{zoomControl:false,attributionControl:false,minZoom:11,maxBounds:bounds.pad(.5),maxBoundsViscosity:1});map.fitBounds(bounds,{padding:[20,20]});
      L.tileLayer(${JSON.stringify(tiles)},{className:${JSON.stringify(isLofi ? "" : "map-tiles-mono")},maxZoom:19}).addTo(map);
      var routeColor='${routeColor}',neutral='${neutralColor}';L.polyline(coords,{color:routeColor,weight:8,opacity:.2}).addTo(map);L.polyline(coords,{color:routeColor,weight:4,opacity:.9,dashArray:'10 10'}).addTo(map);
      ${LEAFLET_LIVE_UPDATE}
    </script></body></html>`;
  }, [isLofi, mapColor, neutralColor, route, routeColor]);
  const webSource = useMemo(() => ({ html }), [html]);
  const liveScript = useMemo(() => leafletUpdateScript({
    latitude: position.latitude, longitude: position.longitude,
    vehicleIconHtml, hails: visibleHails, canOperate,
  }), [position, vehicleIconHtml, visibleHails, canOperate]);
  useEffect(() => {
    if (loaded && !configured) webView.current?.injectJavaScript(liveScript);
  }, [loaded, configured, liveScript]);

  const unitInfo = <Modal visible={unitInfoVisible} transparent animationType="fade" onRequestClose={() => setUnitInfoVisible(false)}>
    <SafeAreaView edges={["top", "bottom"]} style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 16 }}>
      <Pressable accessibilityLabel="Close unit details" onPress={() => setUnitInfoVisible(false)} style={StyleSheet.absoluteFill} />
      <View accessibilityViewIsModal style={{ width: "100%", maxWidth: 280, overflow: "hidden", borderRadius: 14, borderWidth: 1, borderColor: popup.border, backgroundColor: popup.background, shadowColor: "#000000", shadowOpacity: 0.3, shadowRadius: 20, shadowOffset: { width: 0, height: 8 }, elevation: 12 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: popup.divider }}>
          <Svg width={34} height={34} viewBox="0 0 24 24"><Path d={JEEPNEY_PATH} fill={popup.icon} /></Svg>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ color: popup.muted, fontSize: 10 }}>Your unit</Text>
            <Text style={{ color: popup.title, fontSize: 16, fontWeight: "600", marginTop: 2 }}>{unitNumber}</Text>
          </View>
        </View>
        <View style={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 16 }}>
          <Text style={{ color: popup.status, fontSize: 13, fontWeight: "600", textAlign: "center" }}>{unitStatus.label}</Text>
          <View style={{ gap: 10, marginTop: 14 }}>
            <UnitDetailRow label="Route" value={routeLabel} muted={popup.muted} text={popup.text} />
            {isOnBreak ? <UnitDetailRow label="Capacity" value={capacity.replace("_", " ")} muted={popup.muted} text={popup.text} /> : null}
          </View>
        </View>
      </View>
    </SafeAreaView>
  </Modal>;

  const frameStyle = [fill ? StyleSheet.absoluteFill : { height: 420, borderRadius: 18, overflow: "hidden" as const }, { backgroundColor: mapColor }];
  if (!configured) {
    return <View style={frameStyle}>
      <WebView ref={webView} source={webSource} style={{ flex: 1, backgroundColor: "transparent" }} originWhitelist={["*"]} javaScriptEnabled domStorageEnabled scrollEnabled={false} overScrollMode="never"
        onLoadStart={() => setLoaded(false)} onLoadEnd={() => { setLoaded(true); setMapError(false); webView.current?.injectJavaScript(liveScript); }} onError={() => { setLoaded(false); setMapError(true); }}
        onMessage={event => {
          try {
            const message = JSON.parse(event.nativeEvent.data);
            if (message.type === "vehicle") { setUnitInfoVisible(true); return; }
            if (message.type !== "hail" || !canOperate || busy.current || !visibleHails.some(hail => hail.id === message.id) || !["accept", "reject"].includes(message.action)) return;
            busy.current = true;
            void Promise.resolve(onHail?.(message.id, message.action)).finally(() => { busy.current = false; });
          } catch { /* Ignore messages outside the map action bridge. */ }
        }} />
      {unitInfo}
      {!loaded || mapError ? <View pointerEvents="none" style={[StyleSheet.absoluteFill, { alignItems: "center", justifyContent: "center", gap: 10, backgroundColor: mapColor }]}>
        {!mapError ? <ActivityIndicator color={routeColor} /> : null}
        <Text style={{ color: isLofi ? "#6B7280" : "#91A0B4", fontSize: 12 }}>{mapError ? "Map could not load. Check your connection." : "Loading route map…"}</Text>
      </View> : null}
    </View>;
  }

  const { AppleMaps, GoogleMaps } = nativeMaps!;
  return <View style={frameStyle}>
    {Platform.OS === "android" ? <GoogleMaps.View
      ref={googleMap} style={StyleSheet.absoluteFill} cameraPosition={{ coordinates: routeCenter, zoom: 11.5 }}
      markers={markersGoogle} polylines={lines} circles={circlesGoogle}
      properties={{ isMyLocationEnabled: hasLivePosition, mapType: GoogleMaps.MapType.NORMAL, minZoomPreference: 10 }}
      uiSettings={{ compassEnabled: true, mapToolbarEnabled: false, myLocationButtonEnabled: hasLivePosition, rotationGesturesEnabled: false, scrollGesturesEnabled: true, zoomControlsEnabled: false, zoomGesturesEnabled: true }}
      colorScheme={isLofi ? GoogleMaps.MapColorScheme.LIGHT : GoogleMaps.MapColorScheme.DARK}
      userLocation={hasLivePosition ? { coordinates: position, followUserLocation: false } : undefined}
      onMarkerClick={event => { if (event.id === "vehicle") setUnitInfoVisible(true); }}
      onMapLoaded={() => { setLoaded(true); setMapError(false); }}
    /> : <AppleMaps.View
      ref={appleMap} style={StyleSheet.absoluteFill} cameraPosition={{ coordinates: routeCenter, zoom: 11.5 }}
      markers={markersApple} annotations={annotationsApple} polylines={lines.map(line => ({ id: line.id, coordinates: line.coordinates, color: line.color, width: line.width, contourStyle: AppleMaps.ContourStyle.GEODESIC }))} circles={circlesApple}
      onAnnotationClick={event => { if (event.id === "vehicle") setUnitInfoVisible(true); }}
      properties={{ isMyLocationEnabled: hasLivePosition, mapType: AppleMaps.MapType.STANDARD, selectionEnabled: true }}
      uiSettings={{ compassEnabled: true, myLocationButtonEnabled: hasLivePosition, scaleBarEnabled: true }}
      colorScheme={isLofi ? AppleMaps.MapColorScheme.LIGHT : AppleMaps.MapColorScheme.DARK}
    />}
    {unitInfo}
    {!loaded ? <View pointerEvents="none" style={[StyleSheet.absoluteFill, { alignItems: "center", justifyContent: "center", gap: 10, backgroundColor: mapColor }]}>
      <ActivityIndicator color={routeColor} />
      <Text style={{ color: isLofi ? "#6B7280" : "#91A0B4", fontSize: 12 }}>Loading route map…</Text>
    </View> : null}
  </View>;
}

function UnitDetailRow({ label, value, muted, text }: { label: string; value: string; muted: string; text: string }) {
  return <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
    <Text style={{ color: muted, fontSize: 12 }}>{label}</Text>
    <Text style={{ flex: 1, color: text, fontSize: 12, fontWeight: "500", textAlign: "right" }}>{value}</Text>
  </View>;
}
