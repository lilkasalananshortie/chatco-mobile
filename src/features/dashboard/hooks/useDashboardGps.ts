import { useEffect, useRef, useState } from "react";
import { AppState, Platform } from "react-native";
import * as Location from "expo-location";
import { api } from "../../../core/api/chatco-api";
import type { Shift } from "../../../core/domain/types";
import { ROUTE_POINTS } from "../route-data";
import { LOCATION_TASK_NAME } from "../location-task";
import {
  CORRIDOR_DEVIATION_THRESHOLD_METERS,
  evaluateSpeedWarning,
  getDistanceToCorridorMeters,
} from "../../../core/utils/corridor-guard";
import { audioCues } from "../../../core/utils/audio-cues";
import { fleetService } from "../../../core/api/fleet-service";
import { appStorage } from "../../../core/storage/app-storage";

export interface UseDashboardGpsProps {
  shift: Shift;
  canOperate: boolean;
  refreshKey: number;
}

// Serialize native task transitions across shift/device changes. An old
// permission/start completion must never stop the new owner's task.
let backgroundTransition: Promise<unknown> = Promise.resolve();
function transitionBackground(operation: () => Promise<unknown>) {
  backgroundTransition = backgroundTransition.catch(() => undefined).then(operation).catch(() => undefined);
  return backgroundTransition;
}

export function useDashboardGps({ shift, canOperate, refreshKey }: UseDashboardGpsProps) {
  const [position, setPosition] = useState<{ latitude: number; longitude: number } | null>(null);
  const [mapEnabled, setMapEnabled] = useState(Platform.OS === "web");
  const [routeCoordinates, setRouteCoordinates] = useState<Array<[number, number]>>(() =>
    ROUTE_POINTS.map((p) => [p[0], p[1]])
  );
  const [routeSource, setRouteSource] = useState<"backend" | "fallback">("fallback");
  const [gpsError, setGpsError] = useState("");
  const [permissionStatus, setPermissionStatus] = useState<"inactive" | "requesting" | "granted" | "denied" | "unavailable">("inactive");
  const [lastUploadAt, setLastUploadAt] = useState<number | null>(null);
  const [backgroundWarning, setBackgroundWarning] = useState("");
  const [gpsRetry, setGpsRetry] = useState(0);
  const [currentSpeedKmh, setCurrentSpeedKmh] = useState(0);
  const [isOverspeeding, setIsOverspeeding] = useState(false);
  const [isNearSpeedLimit, setIsNearSpeedLimit] = useState(false);
  const [corridorDeviationMeters, setCorridorDeviationMeters] = useState(0);
  const routeRef = useRef(routeCoordinates);
  routeRef.current = routeCoordinates;
  const speedLimit = useRef(50);

  useEffect(() => {
    let active = true;
    const apply = (value: number) => {
      if (active && Number.isFinite(value) && value > 0) speedLimit.current = value;
    };
    const load = async () => {
      try {
        const settings = await fleetService.safetySettings();
        apply(Number(settings.speed_limit_kmh));
        await appStorage.setItem("chatco_safety_limit", String(settings.speed_limit_kmh));
      } catch { /* Use the last known limit offline. */ }
    };
    void appStorage.getItem("chatco_safety_limit").then(value => { apply(Number(value)); return load(); }).catch(() => load());
    const timer = setInterval(() => void load(), 60000);
    const listener = AppState.addEventListener("change", state => { if (state === "active") void load(); });
    return () => { active = false; clearInterval(timer); listener.remove(); };
  }, []);

  // Route geometry fetch
  useEffect(() => {
    let active = true;
    setRouteCoordinates(ROUTE_POINTS.map(point => [point[0], point[1]]));
    setRouteSource("fallback");
    const loadRoute = () =>
      void api
        .routeGeometry(shift.routeId)
        .then((route) => {
          if (!active) return;
          if (route.coordinates && route.coordinates.length > 1) {
            setRouteCoordinates(route.coordinates);
          }
          setRouteSource(route.source ?? (route.coordinates?.length > 1 ? "backend" : "fallback"));
        })
        .catch(() => {
          if (active) setRouteSource("fallback");
        });
    loadRoute();
    const routeTimer = setInterval(loadRoute, 60000);
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        loadRoute();
      }
    });
    return () => {
      active = false;
      clearInterval(routeTimer);
      subscription.remove();
    };
  }, [refreshKey, shift.routeId]);

  // GPS watch position
  useEffect(() => {
    setGpsError(""); setBackgroundWarning(""); setLastUploadAt(null); setPosition(null);
    if (!canOperate) {
      setPermissionStatus("inactive");
      if (Platform.OS !== "web") {
        void transitionBackground(async () => {
          if (await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME)) await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
        });
      }
      return;
    }

    let subscription: Location.LocationSubscription | null = null;
    let cancelled = false;
    let backgroundStarted = false;
    let uploadPending = false;
    setPermissionStatus("requesting");
    void Location.requestForegroundPermissionsAsync()
      .then(async (permission) => {
        if (cancelled) return;
        if (permission.status !== "granted") {
          setPermissionStatus("denied");
          setGpsError("Location permission is denied. Enable it in device Settings, then retry tracking.");
          return;
        }
        setPermissionStatus("granted");
        subscription = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.Balanced, timeInterval: 5000, distanceInterval: 10 },
          (location) => {
            if (cancelled) return;
            setPosition({
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
            });

            // Speed evaluation (50 km/h limit)
            const speedEval = evaluateSpeedWarning(location.coords.speed, speedLimit.current);
            setCurrentSpeedKmh(speedEval.speedKmh);
            setIsOverspeeding(speedEval.isOverspeed);
            setIsNearSpeedLimit(speedEval.isNearLimit);

            // Corridor deviation evaluation (>300m threshold)
            const distOff = getDistanceToCorridorMeters(
              location.coords.latitude,
              location.coords.longitude,
              routeRef.current,
            );
            setCorridorDeviationMeters(distOff);
            if (distOff > CORRIDOR_DEVIATION_THRESHOLD_METERS) {
              audioCues.playWarningSound();
            }

            // Do not overlap uploads or claim a successful upload from GPS alone.
            if (uploadPending) return;
            uploadPending = true;
            void api
              .location(
                location.coords.latitude,
                location.coords.longitude,
                location.coords.speed,
                location.coords.heading,
                location.coords.accuracy,
                new Date(location.timestamp).toISOString()
              )
              .then(() => { if (!cancelled) { setLastUploadAt(Date.now()); setGpsError(""); } })
              .catch(() => { if (!cancelled) setGpsError("The last vehicle location update failed. Check your connection and active operating device. Updates will retry when GPS provides another fix."); })
              .finally(() => { uploadPending = false; });
          }
        );
        if (cancelled) { subscription.remove(); return; }
        if (Platform.OS === "web") return;
        try {
          const background = await Location.requestBackgroundPermissionsAsync();
          if (cancelled) return;
          if (background.status !== "granted") {
            setBackgroundWarning("Background location is off. Keep ChatCo open for vehicle updates, or enable background location in device Settings.");
            return;
          }
          await transitionBackground(async () => {
            if (cancelled) return;
            try {
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
              if (cancelled) { await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME); backgroundStarted = false; }
            } catch { if (!cancelled) setBackgroundWarning("Background tracking could not start. Keep ChatCo open and retry tracking."); }
          });
        } catch { if (!cancelled) setBackgroundWarning("Background location is unavailable. Keep ChatCo open for vehicle updates."); }
      })
      .catch(() => {
        if (!cancelled) {
          setPermissionStatus("unavailable");
          setGpsError("Live location is unavailable. Check GPS and location permission, then retry tracking.");
        }
      });

    return () => {
      cancelled = true;
      subscription?.remove();
      void transitionBackground(async () => {
        if (backgroundStarted) { await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME); backgroundStarted = false; }
      });
    };
  }, [canOperate, shift.shiftId, gpsRetry]);

  return {
    position,
    mapEnabled,
    setMapEnabled,
    routeCoordinates,
    routeSource,
    gpsError,
    permissionStatus,
    backgroundWarning,
    lastUploadAt,
    retryTracking: () => setGpsRetry(value => value + 1),
    currentSpeedKmh,
    isOverspeeding,
    isNearSpeedLimit,
    corridorDeviationMeters,
  };
}
