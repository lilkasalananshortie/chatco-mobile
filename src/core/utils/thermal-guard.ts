import * as Battery from "expo-battery";
import { Platform } from "react-native";
import { appStorage } from "../storage/app-storage";

const THERMAL_GUARD_KEY = "chatco_thermal_guard_enabled";

export type ThermalMode = "active" | "idle_power_save";

export interface ThermalGuardState {
  enabled: boolean;
  batteryLevel: number; // 0 to 100
  batteryState: "unplugged" | "charging" | "full" | "unknown";
  thermalMode: ThermalMode;
  isWeakChargerDetected: boolean;
  isHighThermalRisk: boolean;
  thermalWarningMessage: string | null;
}

class ThermalGuardManager {
  private enabled = true;
  private batteryLevel = 100;
  private batteryState: "unplugged" | "charging" | "full" | "unknown" = "unknown";
  private thermalMode: ThermalMode = "active";
  private isWeakChargerDetected = false;
  private isHighThermalRisk = false;
  private thermalWarningMessage: string | null = null;

  private stationarySince: number | null = null;
  private lastBatteryCheck = 0;
  private previousPluggedLevel: number | null = null;
  private listeners = new Set<(state: ThermalGuardState) => void>();

  constructor() {
    this.init();
  }

  private async init() {
    try {
      const saved = await appStorage.getItem(THERMAL_GUARD_KEY);
      if (saved !== null) {
        this.enabled = saved === "on";
      }

      await this.updateBatteryInfo();

      // Listen for battery level and state changes if supported
      if (Platform.OS !== "web") {
        Battery.addBatteryLevelListener(({ batteryLevel }) => {
          this.handleBatteryLevelChange(batteryLevel);
        });

        Battery.addBatteryStateListener(({ batteryState }) => {
          this.handleBatteryStateChange(batteryState);
        });
      }
    } catch {
      // Fallback
    }
  }

  private async updateBatteryInfo() {
    try {
      const level = await Battery.getBatteryLevelAsync();
      if (level >= 0) {
        this.batteryLevel = Math.round(level * 100);
      }

      const state = await Battery.getBatteryStateAsync();
      this.handleBatteryStateChange(state);
    } catch {
      // Battery API unavailable
    }
    this.evaluateThermalRisk();
    this.notify();
  }

  private handleBatteryStateChange(state: Battery.BatteryState) {
    if (state === Battery.BatteryState.CHARGING) {
      this.batteryState = "charging";
    } else if (state === Battery.BatteryState.FULL) {
      this.batteryState = "full";
    } else if (state === Battery.BatteryState.UNPLUGGED) {
      this.batteryState = "unplugged";
      this.isWeakChargerDetected = false;
      this.previousPluggedLevel = null;
    } else {
      this.batteryState = "unknown";
    }
    this.evaluateThermalRisk();
    this.notify();
  }

  private handleBatteryLevelChange(level: number) {
    if (level < 0) return;
    const pct = Math.round(level * 100);

    // Check if discharging while plugged in (weak 12V cigarette socket or loose wire)
    if (this.batteryState === "charging" && this.previousPluggedLevel !== null) {
      if (pct < this.previousPluggedLevel) {
        this.isWeakChargerDetected = true;
      } else if (pct > this.previousPluggedLevel) {
        this.isWeakChargerDetected = false;
      }
    }
    this.previousPluggedLevel = pct;
    this.batteryLevel = pct;

    this.evaluateThermalRisk();
    this.notify();
  }

  private evaluateThermalRisk() {
    if (!this.enabled) {
      this.isHighThermalRisk = false;
      this.thermalWarningMessage = null;
      return;
    }

    if (this.isWeakChargerDetected) {
      this.isHighThermalRisk = true;
      this.thermalWarningMessage =
        "Weak 12V Charger: Battery is draining while plugged in. Check cigarette adapter/cable.";
      return;
    }

    if (this.batteryLevel <= 15 && this.batteryState === "unplugged") {
      this.isHighThermalRisk = true;
      this.thermalWarningMessage =
        "Low Battery (15%): Connect vehicle charger to sustain active GPS dispatch.";
      return;
    }

    this.isHighThermalRisk = false;
    this.thermalWarningMessage = null;
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public async setEnabled(enabled: boolean): Promise<void> {
    this.enabled = enabled;
    await appStorage.setItem(THERMAL_GUARD_KEY, enabled ? "on" : "off");
    this.evaluateThermalRisk();
    this.notify();
  }

  public getState(): ThermalGuardState {
    return {
      enabled: this.enabled,
      batteryLevel: this.batteryLevel,
      batteryState: this.batteryState,
      thermalMode: this.thermalMode,
      isWeakChargerDetected: this.isWeakChargerDetected,
      isHighThermalRisk: this.isHighThermalRisk,
      thermalWarningMessage: this.thermalWarningMessage,
    };
  }

  public subscribe(listener: (state: ThermalGuardState) => void) {
    this.listeners.add(listener);
    listener(this.getState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    const state = this.getState();
    for (const listener of this.listeners) {
      listener(state);
    }
  }

  /**
   * Evaluates current speed and adjusts GPS intervals:
   * When stationary for > 90s, throttles GPS to 30s interval to save battery and reduce heat.
   * When moving (> 2 km/h), switches instantly to high-precision 5s updates.
   */
  public updateMovement(speedKmh: number): {
    timeInterval: number;
    distanceInterval: number;
    mode: ThermalMode;
  } {
    const now = Date.now();

    if (!this.enabled) {
      this.thermalMode = "active";
      return { timeInterval: 5000, distanceInterval: 10, mode: "active" };
    }

    if (speedKmh <= 2) {
      if (this.stationarySince === null) {
        this.stationarySince = now;
      }
      const stationaryDuration = now - this.stationarySince;

      // After 90 seconds stationary at terminal or red light -> low-power idle
      if (stationaryDuration > 90000) {
        if (this.thermalMode !== "idle_power_save") {
          this.thermalMode = "idle_power_save";
          this.notify();
        }
        return { timeInterval: 30000, distanceInterval: 25, mode: "idle_power_save" };
      }
    } else {
      // Vehicle in motion
      this.stationarySince = null;
      if (this.thermalMode !== "active") {
        this.thermalMode = "active";
        this.notify();
      }
    }

    return { timeInterval: 5000, distanceInterval: 10, mode: "active" };
  }
}

export const thermalGuard = new ThermalGuardManager();
