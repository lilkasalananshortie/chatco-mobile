import { useEffect, useState } from "react";
import { AppState, Platform } from "react-native";
import * as Location from "expo-location";
import { api } from "../../../core/api/chatco-api";
import type { Shift } from "../../../core/domain/types";
import { ROUTE_POINTS } from "../route-data";
import { LOCATION_TASK_NAME } from "../location-task";

export interface UseDashboardGpsProps {
  shift: Shift;
  canOperate: boolean;
  refreshKey: number;
}

export function useDashboardGps({ shift, canOperate, refreshKey }: UseDashboardGpsProps) {
  const [position, setPosition] = useState<{ latitude: number; longitude: number } | null>(null);
  const [mapEnabled, setMapEnabled] = useState(Platform.OS === "web");
  const [routeCoordinates, setRouteCoordinates] = useState<Array<[number, number]>>(() =>
    ROUTE_POINTS.map((p) => [p[0], p[1]])
  );
  const [routeSource, setRouteSource] = useState<"backend" | "fallback">("fallback");
  const [gpsError, setGpsError] = useState("");

  // Route geometry fetch
  useEffect(() => {
    const loadRoute = () =>
      void api
        .routeGeometry(shift.routeId)
        .then((route) => {
          if (route.coordinates && route.coordinates.length > 1) {
            setRouteCoordinates(route.coordinates);
          }
          setRouteSource(route.source ?? (route.coordinates?.length > 1 ? "backend" : "fallback"));
        })
        .catch(() => {
          setRouteSource("fallback");
        });
    loadRoute();
    const routeTimer = setInterval(loadRoute, 60000);
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        loadRoute();
      }
    });
    return () => {
      clearInterval(routeTimer);
      subscription.remove();
    };
  }, [refreshKey, shift.routeId]);

  // GPS watch position
  useEffect(() => {
    if (!mapEnabled || !canOperate) {
      if (Platform.OS !== "web") {
        void Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME)
          .then((started) =>
            started ? Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME) : undefined
          )
          .catch(() => undefined);
      }
      return;
    }

    let subscription: Location.LocationSubscription | null = null;
    void Location.requestForegroundPermissionsAsync()
      .then(async (permission) => {
        if (permission.status !== "granted") return;
        subscription = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.Balanced, timeInterval: 5000, distanceInterval: 10 },
          (location) => {
            setPosition({
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
            });
            setGpsError((current) =>
              current.startsWith("Live location is unavailable") ? "" : current
            );

            void api
              .location(
                location.coords.latitude,
                location.coords.longitude,
                location.coords.speed,
                location.coords.heading,
                location.coords.accuracy,
                new Date(location.timestamp).toISOString()
              )
              .catch(() => undefined);
          }
        );
      })
      .catch(() =>
        setGpsError("Live location is unavailable. The rest of the dashboard is still usable.")
      );

    if (Platform.OS === "web") return () => subscription?.remove();

    let backgroundStarted = false;
    void Location.requestBackgroundPermissionsAsync()
      .then(async (permission) => {
        if (permission.status !== "granted") return;
        await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 15000,
          distanceInterval: 25,
          pausesUpdatesAutomatically: false,
          showsBackgroundLocationIndicator: true,
          foregroundService: {
            notificationTitle: "ChatCo live shift",
            notificationBody: "ChatCo is sharing this vehicle's location during the active shift.",
          },
        });
        backgroundStarted = true;
      })
      .catch(() => undefined);

    return () => {
      subscription?.remove();
      if (backgroundStarted) {
        void Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME).catch(() => undefined);
      }
    };
  }, [canOperate, mapEnabled]);

  return {
    position,
    mapEnabled,
    setMapEnabled,
    routeCoordinates,
    routeSource,
    gpsError,
  };
}
