import { useEffect, useMemo, useRef, useState } from "react";
import Constants from "expo-constants";
import { AppleMaps, GoogleMaps } from "expo-maps";
import { ActivityIndicator, Platform, StyleSheet, Text, View } from "react-native";
import { WebView } from "react-native-webview";
import type { HailRequest } from "../../core/domain/types";
import { useAppTheme } from "../../core/theme/ThemeProvider";
import {
  distanceMeters,
  PICKUP_RADIUS_METERS,
  ROUTE_COORDINATES,
} from "./route-data";

export function LiveMap({ latitude, longitude, hails, unitNumber = "—", fill = false, routeCoordinates, routeSource = "fallback" }: {
  latitude?: number;
  longitude?: number;
  hails: HailRequest[];
  unitNumber?: string;
  fill?: boolean;
  routeCoordinates?: Array<[number, number]>;
  routeSource?: "backend" | "fallback";
}) {
  const { colors, isLofi } = useAppTheme();
  const googleMap = useRef<GoogleMaps.MapView>(null);
  const appleMap = useRef<AppleMaps.MapView>(null);
  const webViewRef = useRef<WebView>(null);
  const [loaded, setLoaded] = useState(Platform.OS === "ios");
  const [loadTimedOut, setLoadTimedOut] = useState(false);
  const isMapConfigured = Platform.OS !== "android"
    || Constants.expoConfig?.extra?.googleMapsConfigured === true;
  const hasLivePosition = Number.isFinite(latitude) && Number.isFinite(longitude);
  const activeRoute = useMemo(() => (
    routeCoordinates && routeCoordinates.length > 1
      ? routeCoordinates.map(([latitude, longitude]) => ({ latitude, longitude }))
      : ROUTE_COORDINATES
  ), [routeCoordinates]);
  const routeCenter = useMemo(() => {
    const latitudes = activeRoute.map(point => point.latitude);
    const longitudes = activeRoute.map(point => point.longitude);
    return {
      latitude: (Math.min(...latitudes) + Math.max(...latitudes)) / 2,
      longitude: (Math.min(...longitudes) + Math.max(...longitudes)) / 2,
    };
  }, [activeRoute]);
  const vehiclePosition = useMemo(() => ({
    latitude: hasLivePosition ? latitude! : routeCenter.latitude,
    longitude: hasLivePosition ? longitude! : routeCenter.longitude,
  }), [hasLivePosition, latitude, longitude, routeCenter]);

  const visibleHails = useMemo(() => hails.filter(hail =>
    Number.isFinite(hail.latitude)
    && Number.isFinite(hail.longitude)
    && distanceMeters(vehiclePosition, {
      latitude: hail.latitude,
      longitude: hail.longitude,
    }) <= PICKUP_RADIUS_METERS
  ), [hails, vehiclePosition]);

  const routeLines = useMemo(() => [
    ...(isLofi ? [] : [{
      id: "route-shadow",
      coordinates: activeRoute,
      color: "rgba(98,160,234,0.22)",
      width: 10,
      geodesic: true,
    }]),
    {
      id: "route",
      coordinates: activeRoute,
      color: isLofi ? colors.primary : "#62A0EA",
      width: isLofi ? 4 : 5,
      geodesic: true,
    },
  ], [activeRoute, isLofi, colors.primary]);

  useEffect(() => {
    if (!hasLivePosition || !loaded) return;
    const camera = { coordinates: vehiclePosition, zoom: 14 };
    try {
      const update = Platform.OS === "android"
        ? googleMap.current?.setCameraPosition({ ...camera, duration: 500 })
        : appleMap.current?.setCameraPosition(camera);
      void Promise.resolve(update).catch(() => undefined);
    } catch {
      // The map remains usable if a camera update races with native teardown.
    }
  }, [hasLivePosition, loaded, vehiclePosition]);

  useEffect(() => {
    if (!isMapConfigured || loaded || Platform.OS !== "android") return;
    const timeout = setTimeout(() => setLoadTimedOut(true), 15000);
    return () => clearTimeout(timeout);
  }, [isMapConfigured, loaded]);

  const googleMarkers: GoogleMaps.Marker[] = [
    {
      id: "vehicle",
      coordinates: vehiclePosition,
      title: `Unit ${unitNumber} (You)`,
      snippet: "Active · 1 km pickup zone",
      showCallout: true,
      zIndex: 2,
    },
    ...visibleHails.map(hail => ({
      id: `hail-${hail.id}`,
      coordinates: { latitude: hail.latitude, longitude: hail.longitude },
      title: hail.commuterName,
      snippet: `${hail.label || "Passenger waiting"}${hail.etaMinutes ? ` · ${hail.etaMinutes} min away` : ""}`,
      showCallout: true,
      zIndex: 3,
    })),
  ];

  const appleMarkers: AppleMaps.Marker[] = [
    {
      id: "vehicle",
      coordinates: vehiclePosition,
      title: `Unit ${unitNumber} (You) · Active`,
      systemImage: "bus.fill",
      tintColor: "#1A5FB4",
    },
    ...visibleHails.map(hail => ({
      id: `hail-${hail.id}`,
      coordinates: { latitude: hail.latitude, longitude: hail.longitude },
      title: `${hail.commuterName} · ${hail.label || "Passenger waiting"}`,
      systemImage: "figure.wave",
      tintColor: "#F59E0B",
    })),
  ];

  const circles = [{
    id: "pickup-zone",
    center: vehiclePosition,
    radius: PICKUP_RADIUS_METERS,
    color: "rgba(26,95,180,0.10)",
    lineColor: "#1A5FB4",
    lineWidth: 2,
  }];

  // If native Google Maps API key is not configured, render Leaflet / OpenStreetMap via WebView
  if (Platform.OS === "android" && !isMapConfigured) {
    const routePointsJs = JSON.stringify(activeRoute.map((p) => [p.latitude, p.longitude]));
    const initialHailsJs = JSON.stringify(visibleHails);
    const tileBase = isLofi
      ? "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
      : "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
    const tileUrl = `${tileBase}?key=cb1_2dut_1_0bf5bd46e8782ff0b7ba6f38`;

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    html, body, #map {
      width: 100%;
      height: 100%;
      margin: 0;
      padding: 0;
      background: ${colors.surface};
      overflow: hidden;
    }
    .leaflet-control-attribution, .leaflet-control-zoom { display: none !important; }
    .vehicle-marker {
      width: 36px;
      height: 36px;
      background: #1A5FB4;
      border: 2px solid #FFFFFF;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 3px 8px rgba(0,0,0,0.5);
      color: white;
      font-family: sans-serif;
      font-weight: bold;
      font-size: 10px;
    }
    .hail-marker {
      width: 18px;
      height: 18px;
      background: #F59E0B;
      border: 2px solid #FFFFFF;
      border-radius: 50%;
      box-shadow: 0 2px 6px rgba(0,0,0,0.5);
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var map = L.map('map', {
      center: [${routeCenter.latitude}, ${routeCenter.longitude}],
      zoom: 12,
      zoomControl: false,
      attributionControl: false
    });

    L.tileLayer('${tileUrl}', {
      subdomains: 'abcd',
      maxZoom: 19
    }).addTo(map);

    var routeCoords = ${routePointsJs};
    if (routeCoords && routeCoords.length > 1) {
      L.polyline(routeCoords, {
        color: '#62A0EA',
        weight: 5,
        opacity: 0.85
      }).addTo(map);
      map.fitBounds(L.latLngBounds(routeCoords).pad(0.08));
    }

    var vIcon = L.divIcon({
      className: 'c-v',
      html: '<div class="vehicle-marker">${unitNumber}</div>',
      iconSize: [36, 36],
      iconAnchor: [18, 18]
    });

    var vehicleMarker = L.marker([${vehiclePosition.latitude}, ${vehiclePosition.longitude}], { icon: vIcon, zIndexOffset: 1000 }).addTo(map);
    var circle = L.circle([${vehiclePosition.latitude}, ${vehiclePosition.longitude}], {
      radius: 1000,
      color: '#1A5FB4',
      weight: 1.5,
      fillColor: '#1A5FB4',
      fillOpacity: 0.08
    }).addTo(map);

    var hailsGroup = L.layerGroup().addTo(map);
    var hIcon = L.divIcon({
      className: 'c-h',
      html: '<div class="hail-marker"></div>',
      iconSize: [18, 18],
      iconAnchor: [9, 9]
    });

    (${initialHailsJs}).forEach(function(h) {
      if (h.latitude && h.longitude) {
        L.marker([h.latitude, h.longitude], { icon: hIcon }).addTo(hailsGroup);
      }
    });

    window.updateState = function(data) {
      if (!data) return;
      if (data.lat && data.lng) {
        vehicleMarker.setLatLng([data.lat, data.lng]);
        circle.setLatLng([data.lat, data.lng]);
        if (data.hasLive) {
          map.panTo([data.lat, data.lng], { animate: true, duration: 0.5 });
        }
      }
    };
  </script>
</body>
</html>
    `;

    return (
      <View
        style={[
          local.frame,
          fill ? local.fill : null,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            borderRadius: isLofi ? 4 : fill ? 0 : 18,
            borderWidth: isLofi ? 1.5 : 1,
            overflow: "hidden",
          },
        ]}
      >
        <WebView
          ref={webViewRef}
          originWhitelist={["*"]}
          source={{ html: htmlContent }}
          style={{ flex: 1, backgroundColor: colors.surface }}
          javaScriptEnabled
          domStorageEnabled
          scrollEnabled={false}
          overScrollMode="never"
        />
      </View>
    );
  }

  return (
    <View style={[local.frame, fill ? local.fill : null, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: isLofi ? 4 : (fill ? 0 : 18), borderWidth: isLofi ? 1.5 : 1 }]}>
      {Platform.OS === "android" ? (
        <GoogleMaps.View
          ref={googleMap}
          style={StyleSheet.absoluteFill}
           cameraPosition={{ coordinates: routeCenter, zoom: 11.5 }}
          markers={googleMarkers}
          polylines={routeLines}
          circles={circles}
          properties={{
            isMyLocationEnabled: hasLivePosition,
            mapType: GoogleMaps.MapType.NORMAL,
            minZoomPreference: 10,
          }}
          uiSettings={{
            compassEnabled: true,
            mapToolbarEnabled: false,
            myLocationButtonEnabled: hasLivePosition,
            rotationGesturesEnabled: false,
            scrollGesturesEnabled: true,
            zoomControlsEnabled: false,
            zoomGesturesEnabled: true,
          }}
          colorScheme={isLofi ? GoogleMaps.MapColorScheme.LIGHT : GoogleMaps.MapColorScheme.DARK}
          userLocation={hasLivePosition ? {
            coordinates: vehiclePosition,
            followUserLocation: false,
          } : undefined}
          onMapLoaded={() => {
            setLoadTimedOut(false);
            setLoaded(true);
          }}
        />
      ) : (
        <AppleMaps.View
          ref={appleMap}
          style={StyleSheet.absoluteFill}
           cameraPosition={{ coordinates: routeCenter, zoom: 11.5 }}
          markers={appleMarkers}
          polylines={routeLines.map(line => ({
            id: line.id,
            coordinates: line.coordinates,
            color: line.color,
            width: line.width,
            contourStyle: AppleMaps.ContourStyle.GEODESIC,
          }))}
          circles={circles}
          properties={{
            isMyLocationEnabled: hasLivePosition,
            mapType: AppleMaps.MapType.STANDARD,
            selectionEnabled: true,
          }}
          uiSettings={{
            compassEnabled: true,
            myLocationButtonEnabled: hasLivePosition,
            scaleBarEnabled: true,
          }}
          colorScheme={isLofi ? AppleMaps.MapColorScheme.LIGHT : AppleMaps.MapColorScheme.DARK}
        />
      )}
      {!loaded ? (
        <View style={[local.loading, { backgroundColor: colors.surface }]} pointerEvents="none">
          {loadTimedOut ? (
            <>
              <Text style={[local.unconfiguredTitle, { color: colors.text }]}>Map could not load</Text>
              <Text style={[local.unconfiguredText, { color: colors.muted }]}>
                Check the connection and Google Maps key, then reopen the map.
              </Text>
            </>
          ) : (
            <>
              <ActivityIndicator color={colors.primary} size="large" />
              <Text style={[local.loadingText, { color: colors.muted }]}>Loading live route…</Text>
            </>
          )}
        </View>
      ) : null}
    </View>
  );
}

const local = StyleSheet.create({
  frame: {
    height: 420,
    borderRadius: 18,
    overflow: "hidden",
    marginTop: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.09)",
    backgroundColor: "#050F1A",
  },
  fill: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    height: undefined,
    borderRadius: 0,
    marginTop: 0,
  },
  loading: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#050F1A",
  },
  loadingText: {
    color: "#91A0B4",
    fontSize: 12,
    fontWeight: "700",
  },
  unconfigured: {
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  unconfiguredTitle: {
    color: "#F8FAFC",
    fontSize: 15,
    fontWeight: "800",
    textAlign: "center",
  },
  unconfiguredText: {
    color: "#91A0B4",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 8,
    textAlign: "center",
  },
});
