import { useEffect, useMemo, useRef, useState } from "react";
import Constants from "expo-constants";
import { AppleMaps, GoogleMaps } from "expo-maps";
import { ActivityIndicator, Platform, StyleSheet, Text, View } from "react-native";
import type { HailRequest } from "../../core/domain/types";
import {
  distanceMeters,
  PICKUP_RADIUS_METERS,
  ROUTE_CENTER,
  ROUTE_COORDINATES,
} from "./route-data";

export function LiveMap({ latitude, longitude, hails, unitNumber = "—", fill = false }: {
  latitude?: number;
  longitude?: number;
  hails: HailRequest[];
  unitNumber?: string;
  fill?: boolean;
}) {
  const googleMap = useRef<GoogleMaps.MapView>(null);
  const appleMap = useRef<AppleMaps.MapView>(null);
  const [loaded, setLoaded] = useState(Platform.OS === "ios");
  const [loadTimedOut, setLoadTimedOut] = useState(false);
  const isMapConfigured = Platform.OS !== "android"
    || Constants.expoConfig?.extra?.googleMapsConfigured === true;
  const hasLivePosition = Number.isFinite(latitude) && Number.isFinite(longitude);
  const vehiclePosition = useMemo(() => ({
    latitude: hasLivePosition ? latitude! : ROUTE_CENTER.latitude,
    longitude: hasLivePosition ? longitude! : ROUTE_CENTER.longitude,
  }), [hasLivePosition, latitude, longitude]);

  const visibleHails = useMemo(() => hails.filter(hail =>
    Number.isFinite(hail.latitude)
    && Number.isFinite(hail.longitude)
    && distanceMeters(vehiclePosition, {
      latitude: hail.latitude,
      longitude: hail.longitude,
    }) <= PICKUP_RADIUS_METERS
  ), [hails, vehiclePosition]);

  const routeLines = useMemo(() => [
    {
      id: "route-shadow",
      coordinates: ROUTE_COORDINATES,
      color: "rgba(98,160,234,0.22)",
      width: 10,
      geodesic: true,
    },
    {
      id: "route",
      coordinates: ROUTE_COORDINATES,
      color: "#62A0EA",
      width: 5,
      geodesic: true,
    },
  ], []);

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

  if (!isMapConfigured) {
    return (
      <View style={[local.frame, local.unconfigured, fill && local.fill]}>
        <Text style={local.unconfiguredTitle}>Android map setup required</Text>
        <Text style={local.unconfiguredText}>
          Add GOOGLE_MAPS_API_KEY to the EAS preview environment, then create a new APK.
        </Text>
      </View>
    );
  }

  return (
    <View style={[local.frame, fill && local.fill]}>
      {Platform.OS === "android" ? (
        <GoogleMaps.View
          ref={googleMap}
          style={StyleSheet.absoluteFill}
          cameraPosition={{ coordinates: ROUTE_CENTER, zoom: 11.5 }}
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
          colorScheme={GoogleMaps.MapColorScheme.DARK}
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
          cameraPosition={{ coordinates: ROUTE_CENTER, zoom: 11.5 }}
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
          colorScheme={AppleMaps.MapColorScheme.DARK}
        />
      )}
      {!loaded ? (
        <View style={local.loading} pointerEvents="none">
          {loadTimedOut ? (
            <>
              <Text style={local.unconfiguredTitle}>Map could not load</Text>
              <Text style={local.unconfiguredText}>
                Check the connection and Google Maps key, then reopen the map.
              </Text>
            </>
          ) : (
            <>
              <ActivityIndicator color="#62A0EA" size="large" />
              <Text style={local.loadingText}>Loading live route…</Text>
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
