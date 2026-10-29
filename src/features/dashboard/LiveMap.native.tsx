import { useEffect, useMemo, useRef, useState } from "react";
import Constants from "expo-constants";
import { AppleMaps, GoogleMaps } from "expo-maps";
import { ActivityIndicator, Platform, StyleSheet, View } from "react-native";
import { WebView } from "react-native-webview";
import { Text } from "../../shared/ui/BrandText";
import { useAppTheme } from "../../core/theme/ThemeProvider";
import type { LiveMapProps } from "./LiveMap";
import { distanceMeters, PICKUP_RADIUS_METERS, ROUTE_COORDINATES } from "./route-data";

/** Use the platform map over native UI; keep Leaflet as the configured fallback. */
export function LiveMap({ latitude, longitude, hails, unitNumber = "—", fill = false, routeCoordinates, capacity = "AVAILABLE", isOnBreak = false, canOperate = false, onHail }: LiveMapProps) {
  const { colors, isLofi } = useAppTheme();
  const googleMap = useRef<GoogleMaps.MapView>(null);
  const appleMap = useRef<AppleMaps.MapView>(null);
  const webView = useRef<WebView>(null);
  const busy = useRef(false);
  const [loaded, setLoaded] = useState(Platform.OS === "ios");
  const [mapError, setMapError] = useState(false);
  const configured = Platform.OS !== "android" || Constants.expoConfig?.extra?.googleMapsConfigured === true;

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

  const markersGoogle: GoogleMaps.Marker[] = [
    { id: "vehicle", coordinates: position, title: `Unit ${unitNumber}`, snippet: isOnBreak ? "On Break" : capacity.replace("_", " "), showCallout: true, zIndex: 2 },
    ...visibleHails.map(hail => ({ id: `hail-${hail.id}`, coordinates: { latitude: hail.latitude, longitude: hail.longitude }, title: hail.commuterName, snippet: `${hail.label || "Passenger waiting"}${hail.etaMinutes ? ` · ${hail.etaMinutes} min away` : ""}`, showCallout: true, zIndex: 3 })),
  ];
  const markersApple: AppleMaps.Marker[] = [
    { id: "vehicle", coordinates: position, title: `Unit ${unitNumber} · ${isOnBreak ? "On Break" : capacity.replace("_", " ")}`, systemImage: "bus.fill", tintColor: isOnBreak ? "#38BDF8" : "#1A5FB4" },
    ...visibleHails.map(hail => ({ id: `hail-${hail.id}`, coordinates: { latitude: hail.latitude, longitude: hail.longitude }, title: `${hail.commuterName} · ${hail.label || "Passenger waiting"}`, systemImage: "figure.wave", tintColor: "#FF6D3A" })),
  ];
  const circlesGoogle: GoogleMaps.Circle[] = [{ id: "pickup-zone", center: position, radius: PICKUP_RADIUS_METERS, color: isLofi ? "rgba(26,95,180,0.05)" : "rgba(255,255,255,0.05)", lineColor: isLofi ? "rgba(7,26,46,0.3)" : "rgba(255,255,255,0.3)", lineWidth: 1.5 }];
  const circlesApple: NonNullable<AppleMaps.MapProps["circles"]> = [{ id: "pickup-zone", center: position, radius: PICKUP_RADIUS_METERS, color: isLofi ? "rgba(26,95,180,0.05)" : "rgba(255,255,255,0.05)", lineColor: isLofi ? "rgba(7,26,46,0.3)" : "rgba(255,255,255,0.3)", lineWidth: 1.5 }];

  const html = useMemo(() => {
    const apiKey = process.env.EXPO_PUBLIC_CARTO_API_KEY || Constants.expoConfig?.extra?.cartoApiKey as string | undefined;
    const tiles = `https://{s}.basemaps.cartocdn.com/${isLofi ? "rastertiles/voyager" : "dark_all"}/{z}/{x}/{y}{r}.png${apiKey ? `?key=${encodeURIComponent(apiKey)}` : ""}`;
    return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"><link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"><script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script><style>html,body,#map{height:100%;width:100%;margin:0;background:${mapColor}}.map-tiles-mono{filter:grayscale(1)}.leaflet-control-attribution{display:none}.hail-actions{display:flex;gap:8px;margin-top:12px}.hail-actions button{flex:1;border-radius:8px;padding:6px 8px;font-size:12px;font-weight:700;border:1px solid #D1D5DB;background:white;color:#374151}.hail-actions button:first-child{border-color:#1A5FB4;background:#1A5FB4;color:white}.hail-actions button:disabled{opacity:.4}</style></head><body><div id="map"></div><script>
      var coords=${JSON.stringify(route)},bounds=L.latLngBounds(coords),map=L.map('map',{zoomControl:false,attributionControl:false,minZoom:11,maxBounds:bounds.pad(.5),maxBoundsViscosity:1});map.fitBounds(bounds,{padding:[20,20]});
      L.tileLayer(${JSON.stringify(tiles)},{className:${JSON.stringify(isLofi ? "" : "map-tiles-mono")},maxZoom:19}).addTo(map);
      var routeColor='${routeColor}',neutral='${neutralColor}';L.polyline(coords,{color:routeColor,weight:8,opacity:.2}).addTo(map);L.polyline(coords,{color:routeColor,weight:4,opacity:.9,dashArray:'10 10'}).addTo(map);
      var vehicle=L.marker([${position.latitude},${position.longitude}]).addTo(map),circle=L.circle([${position.latitude},${position.longitude}],{radius:1000,color:neutral,fillColor:neutral,fillOpacity:.05,weight:1.5,opacity:.3,dashArray:'8 4'}).addTo(map),hails=${JSON.stringify(visibleHails)};
      var vehiclePopup=document.createElement('div');vehiclePopup.textContent=${JSON.stringify(vehicleLabel)};vehicle.bindPopup(vehiclePopup);
      hails.forEach(function(h){var box=document.createElement('div'),title=document.createElement('strong'),body=document.createElement('p'),row=document.createElement('div');title.textContent=h.commuterName;title.style.color='#FF6D3A';body.textContent=(h.label||'Passenger waiting')+(h.etaMinutes?' · '+h.etaMinutes+' min away':'');row.className='hail-actions';['accept','reject'].forEach(function(action){var button=document.createElement('button');button.textContent=action==='accept'?'Accept':'Reject';button.disabled=${!canOperate};button.onclick=function(){if(!window.ReactNativeWebView||!${canOperate})return;row.querySelectorAll('button').forEach(function(b){b.disabled=true});window.ReactNativeWebView.postMessage(JSON.stringify({type:'hail',id:h.id,action:action}))};row.appendChild(button)});box.appendChild(title);box.appendChild(body);box.appendChild(row);L.marker([h.latitude,h.longitude]).bindPopup(box).addTo(map)});
    </script></body></html>`;
  }, [capacity, canOperate, isLofi, mapColor, neutralColor, position, route, routeColor, vehicleLabel, visibleHails]);

  const frameStyle = [fill ? StyleSheet.absoluteFill : { height: 420, borderRadius: 18, overflow: "hidden" as const }, { backgroundColor: mapColor }];
  if (Platform.OS === "android" && !configured) {
    return <View style={frameStyle}>
      <WebView ref={webView} source={{ html }} style={{ flex: 1, backgroundColor: "transparent" }} originWhitelist={["*"]} javaScriptEnabled domStorageEnabled scrollEnabled={false} overScrollMode="never"
        onLoadEnd={() => { setLoaded(true); setMapError(false); }} onError={() => { setLoaded(false); setMapError(true); }}
        onMessage={event => {
          try {
            const message = JSON.parse(event.nativeEvent.data);
            if (message.type !== "hail" || !canOperate || busy.current || !visibleHails.some(hail => hail.id === message.id) || !["accept", "reject"].includes(message.action)) return;
            busy.current = true;
            void Promise.resolve(onHail?.(message.id, message.action)).finally(() => { busy.current = false; });
          } catch { /* Ignore messages outside the map action bridge. */ }
        }} />
      {!loaded || mapError ? <View pointerEvents="none" style={[StyleSheet.absoluteFill, { alignItems: "center", justifyContent: "center", gap: 10, backgroundColor: mapColor }]}>
        {!mapError ? <ActivityIndicator color={routeColor} /> : null}
        <Text style={{ color: isLofi ? "#6B7280" : "#91A0B4", fontSize: 12 }}>{mapError ? "Map could not load. Check your connection." : "Loading route map…"}</Text>
      </View> : null}
    </View>;
  }

  return <View style={frameStyle}>
    {Platform.OS === "android" ? <GoogleMaps.View
      ref={googleMap} style={StyleSheet.absoluteFill} cameraPosition={{ coordinates: routeCenter, zoom: 11.5 }}
      markers={markersGoogle} polylines={lines} circles={circlesGoogle}
      properties={{ isMyLocationEnabled: hasLivePosition, mapType: GoogleMaps.MapType.NORMAL, minZoomPreference: 10 }}
      uiSettings={{ compassEnabled: true, mapToolbarEnabled: false, myLocationButtonEnabled: hasLivePosition, rotationGesturesEnabled: false, scrollGesturesEnabled: true, zoomControlsEnabled: false, zoomGesturesEnabled: true }}
      colorScheme={isLofi ? GoogleMaps.MapColorScheme.LIGHT : GoogleMaps.MapColorScheme.DARK}
      userLocation={hasLivePosition ? { coordinates: position, followUserLocation: false } : undefined}
      onMapLoaded={() => { setLoaded(true); setMapError(false); }}
    /> : <AppleMaps.View
      ref={appleMap} style={StyleSheet.absoluteFill} cameraPosition={{ coordinates: routeCenter, zoom: 11.5 }}
      markers={markersApple} polylines={lines.map(line => ({ id: line.id, coordinates: line.coordinates, color: line.color, width: line.width, contourStyle: AppleMaps.ContourStyle.GEODESIC }))} circles={circlesApple}
      properties={{ isMyLocationEnabled: hasLivePosition, mapType: AppleMaps.MapType.STANDARD, selectionEnabled: true }}
      uiSettings={{ compassEnabled: true, myLocationButtonEnabled: hasLivePosition, scaleBarEnabled: true }}
      colorScheme={isLofi ? AppleMaps.MapColorScheme.LIGHT : AppleMaps.MapColorScheme.DARK}
    />}
    {!loaded ? <View pointerEvents="none" style={[StyleSheet.absoluteFill, { alignItems: "center", justifyContent: "center", gap: 10, backgroundColor: mapColor }]}>
      <ActivityIndicator color={routeColor} />
      <Text style={{ color: isLofi ? "#6B7280" : "#91A0B4", fontSize: 12 }}>Loading route map…</Text>
    </View> : null}
  </View>;
}
