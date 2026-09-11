import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, Platform } from "react-native";
import * as Location from "expo-location";
import { api } from "../../../core/api/chatco-api";
import type { FarePoint, Shift } from "../../../core/domain/types";
import { audioCues } from "../../../core/utils/audio-cues";
import { appHaptics } from "../../../core/utils/haptics";
import {
  checkAndAnnounceApproachingStop,
  initVoiceAnnouncer,
  isVoiceAnnouncerActive,
  subscribeVoiceAnnouncer,
  toggleVoiceAnnouncer,
} from "../../../core/utils/voice-announcer";
import {
  CORRIDOR_DEVIATION_THRESHOLD_METERS,
  evaluateSpeedWarning,
  getDistanceToCorridorMeters,
} from "../../../core/utils/corridor-guard";
import { thermalGuard, type ThermalGuardState } from "../../../core/utils/thermal-guard";
import { ROUTE_POINTS } from "../route-data";
import { LOCATION_TASK_NAME } from "../location-task";
import {
  createIdleHeadway,
  getHeadwayMinutes,
  startHeadwayTimer,
  tickHeadway,
  type HeadwayTimerState,
} from "../../../core/utils/terminal-headway";

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
  const [voiceActive, setVoiceActive] = useState(isVoiceAnnouncerActive());
  const [approachingStop, setApproachingStop] = useState<string | null>(null);
  const [currentSpeedKmh, setCurrentSpeedKmh] = useState(0);
  const [isOverspeeding, setIsOverspeeding] = useState(false);
  const [isNearSpeedLimit, setIsNearSpeedLimit] = useState(false);
  const [corridorDeviationMeters, setCorridorDeviationMeters] = useState(0);
  const [thermalState, setThermalState] = useState<ThermalGuardState>(thermalGuard.getState());
  const [gpsError, setGpsError] = useState("");

  const farePointsRef = useRef<FarePoint[]>([]);

  // Terminal Headway Timer State
  const [headway, setHeadway] = useState<HeadwayTimerState>(createIdleHeadway);
  const headwayReadySounded = useRef(false);

  useEffect(() => {
    void initVoiceAnnouncer().then(setVoiceActive);
    return subscribeVoiceAnnouncer(setVoiceActive);
  }, []);

  useEffect(() => {
    return thermalGuard.subscribe(setThermalState);
  }, []);

  useEffect(() => {
    void api
      .fareMatrix()
      .then((matrix) => {
        farePointsRef.current = matrix.points;
      })
      .catch(() => undefined);
  }, []);

  // Tick the headway timer every second while WAITING
  useEffect(() => {
    if (headway.phase !== "WAITING") return;
    const id = setInterval(() => {
      setHeadway((prev) => {
        const { state: next, justBecameReady } = tickHeadway(prev);
        if (justBecameReady && !headwayReadySounded.current) {
          headwayReadySounded.current = true;
          audioCues.playDutySound();
          appHaptics.success();
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [headway.phase]);

  // Start headway timer after trip advance
  const triggerHeadwayAfterTrip = useCallback(async () => {
    const mins = await getHeadwayMinutes();
    setHeadway(startHeadwayTimer(mins));
    headwayReadySounded.current = false;
  }, []);

  const handleStartNextTrip = useCallback(() => {
    audioCues.playDutySound();
    setHeadway(createIdleHeadway());
  }, []);

  const handleToggleVoice = useCallback(async () => {
    appHaptics.light();
    const next = await toggleVoiceAnnouncer();
    setVoiceActive(next);
  }, []);

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

            // Automated Next-Stop Voice Announcer (Main stops only)
            const announced = checkAndAnnounceApproachingStop(
              location.coords.latitude,
              location.coords.longitude,
              farePointsRef.current
            );
            if (announced) {
              setApproachingStop(announced.name);
              setTimeout(() => setApproachingStop(null), 8000);
            }

            // Real-time speed warning & corridor deviation evaluation
            const speedEval = evaluateSpeedWarning(location.coords.speed);
            setCurrentSpeedKmh(speedEval.speedKmh);
            setIsOverspeeding(speedEval.isOverspeed);
            setIsNearSpeedLimit(speedEval.isNearLimit);
            if (speedEval.isOverspeed) {
              audioCues.playWarningSound();
            }

            // Update Thermal Guard with vehicle speed to throttle idle GPS
            thermalGuard.updateMovement(speedEval.speedKmh);

            // Auto-start next trip when jeep starts moving during headway timer
            if (speedEval.speedKmh > 8) {
              setHeadway((prev) => {
                if (prev.phase === "WAITING" || prev.phase === "READY") {
                  audioCues.playDutySound();
                  return createIdleHeadway();
                }
                return prev;
              });
            }

            const distOff = getDistanceToCorridorMeters(
              location.coords.latitude,
              location.coords.longitude
            );
            setCorridorDeviationMeters(distOff);
            if (distOff > CORRIDOR_DEVIATION_THRESHOLD_METERS) {
              audioCues.playWarningSound();
            }

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
    voiceActive,
    approachingStop,
    currentSpeedKmh,
    isOverspeeding,
    isNearSpeedLimit,
    corridorDeviationMeters,
    thermalState,
    gpsError,
    headway,
    triggerHeadwayAfterTrip,
    handleStartNextTrip,
    handleToggleVoice,
  };
}
