import { Linking, Platform } from "react-native";
import { appStorage } from "../storage/app-storage";
import type { ReceiptSettings, Shift, Transaction } from "../domain/types";
import {
  GOOJPRT_LINE_WIDTH,
  GOOJPRT_SERVICE_UUIDS,
  GOOJPRT_NAME_PREFIXES,
  formatRow,
  centerText,
  dividerLine,
  buildGoojprtReceiptBytes,
  buildGoojprtTestTicket,
  type ReceiptOptions,
} from "./thermal-escpos-builder";

// Re-export ESC/POS builder utilities for consumers
export {
  GOOJPRT_LINE_WIDTH,
  formatRow,
  centerText,
  dividerLine,
  buildGoojprtReceiptBytes,
  buildGoojprtTestTicket,
  type ReceiptOptions,
};

// Convert byte array to Base64 for RawBT URL scheme
export function uint8ArrayToBase64(bytes: Uint8Array): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
  let output = "";
  const len = bytes.length;

  for (let i = 0; i < len; i += 3) {
    const b1 = bytes[i] ?? 0;
    const b2 = i + 1 < len ? (bytes[i + 1] ?? 0) : 0;
    const b3 = i + 2 < len ? (bytes[i + 2] ?? 0) : 0;

    const e1 = b1 >> 2;
    const e2 = ((b1 & 3) << 4) | (b2 >> 4);
    let e3 = ((b2 & 15) << 2) | (b3 >> 6);
    let e4 = b3 & 63;

    if (i + 1 >= len) {
      e3 = 64;
      e4 = 64;
    } else if (i + 2 >= len) {
      e4 = 64;
    }

    output += chars.charAt(e1) + chars.charAt(e2) + chars.charAt(e3) + chars.charAt(e4);
  }
  return output;
}

const AUTOPRINT_KEY = "chatco_printer_autoprint";
const LAST_DEVICE_NAME_KEY = "chatco_printer_last_device_name";

// Minimal interfaces for Web Bluetooth API
interface BluetoothCharacteristic {
  properties: {
    write?: boolean;
    writeWithoutResponse?: boolean;
  };
  writeValue(value: BufferSource): Promise<void>;
  writeValueWithoutResponse?(value: BufferSource): Promise<void>;
}

interface BluetoothService {
  uuid: string;
  getCharacteristics(): Promise<BluetoothCharacteristic[]>;
}

interface BluetoothGATTServer {
  connected: boolean;
  connect(): Promise<BluetoothGATTServer>;
  disconnect(): void;
  getPrimaryServices(): Promise<BluetoothService[]>;
}

interface BluetoothDeviceLike {
  id: string;
  name?: string;
  gatt?: BluetoothGATTServer;
  addEventListener?(type: string, listener: () => void): void;
}

export type PrinterStatus = "disconnected" | "connecting" | "connected";

class GoojprtPrinterManager {
  private status: PrinterStatus = Platform.OS === "android" ? "connected" : "disconnected";
  private device: BluetoothDeviceLike | null = null;
  private writeCharacteristic: BluetoothCharacteristic | null = null;
  private autoPrint = true;
  private pairedDeviceName: string | null =
    Platform.OS === "android" ? "RawBT Universal Printer" : null;
  private listeners = new Set<(status: PrinterStatus, deviceName: string | null) => void>();

  constructor() {
    this.initPrefs();
  }

  private async initPrefs() {
    try {
      const savedAuto = await appStorage.getItem(AUTOPRINT_KEY);
      if (savedAuto !== null) {
        this.autoPrint = savedAuto === "on";
      }
      const savedName = await appStorage.getItem(LAST_DEVICE_NAME_KEY);
      if (savedName) {
        this.pairedDeviceName = savedName;
      }
    } catch {
      // Storage fallback
    }
  }

  public isWebBluetoothSupported(): boolean {
    return (
      Platform.OS === "web" &&
      typeof navigator !== "undefined" &&
      Boolean((navigator as any).bluetooth)
    );
  }

  public getStatus(): PrinterStatus {
    return this.status;
  }

  public getPairedDeviceName(): string | null {
    return this.device?.name || this.pairedDeviceName || null;
  }

  public isAutoPrintEnabled(): boolean {
    return this.autoPrint;
  }

  public async setAutoPrintEnabled(enabled: boolean): Promise<void> {
    this.autoPrint = enabled;
    await appStorage.setItem(AUTOPRINT_KEY, enabled ? "on" : "off");
    this.notify();
  }

  public subscribe(listener: (status: PrinterStatus, deviceName: string | null) => void) {
    this.listeners.add(listener);
    listener(this.status, this.getPairedDeviceName());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    for (const listener of this.listeners) {
      listener(this.status, this.getPairedDeviceName());
    }
  }

  // Connect to Bluetooth or RawBT Printer
  public async connect(): Promise<{ success: boolean; deviceName?: string; error?: string }> {
    if (!this.isWebBluetoothSupported()) {
      if (Platform.OS === "android") {
        try {
          // Open RawBT app to verify connected printer
          await Linking.openURL("rawbt:").catch(() => undefined);
          this.status = "connected";
          this.pairedDeviceName = "RawBT Universal Printer";
          this.notify();
          return {
            success: true,
            deviceName: "RawBT Universal Printer",
          };
        } catch {
          this.status = "connected";
          this.pairedDeviceName = "RawBT Universal Printer";
          this.notify();
          return {
            success: true,
            deviceName: "RawBT Universal Printer",
          };
        }
      }
      return {
        success: false,
        error:
          "Bluetooth pairing is not supported in this browser. Please test on Google Chrome or use the System Print / Slip option.",
      };
    }

    try {
      this.status = "connecting";
      this.notify();

      const navBluetooth = (navigator as any).bluetooth;

      // 1. Request Bluetooth Device matching GOOJPRT filters or fallback
      let selectedDevice: BluetoothDeviceLike;
      try {
        selectedDevice = await navBluetooth.requestDevice({
          filters: GOOJPRT_NAME_PREFIXES.map((prefix) => ({ namePrefix: prefix })),
          optionalServices: GOOJPRT_SERVICE_UUIDS,
        });
      } catch (filterErr) {
        // Fallback: Show all devices if conductor renamed their Goojprt
        selectedDevice = await navBluetooth.requestDevice({
          acceptAllDevices: true,
          optionalServices: GOOJPRT_SERVICE_UUIDS,
        });
      }

      if (!selectedDevice || !selectedDevice.gatt) {
        this.status = "disconnected";
        this.notify();
        return { success: false, error: "Bluetooth GATT server unavailable on selected device." };
      }

      // 2. Connect GATT
      const server = await selectedDevice.gatt.connect();

      // 3. Discover writable characteristic
      const services = await server.getPrimaryServices();
      let foundChar: BluetoothCharacteristic | null = null;

      for (const service of services) {
        try {
          const chars = await service.getCharacteristics();
          for (const char of chars) {
            if (char.properties.write || char.properties.writeWithoutResponse) {
              foundChar = char;
              break;
            }
          }
          if (foundChar) break;
        } catch {
          // Continue search
        }
      }

      if (!foundChar) {
        this.status = "disconnected";
        this.notify();
        return {
          success: false,
          error: "Could not locate printable ESC/POS write channel on device.",
        };
      }

      this.device = selectedDevice;
      this.writeCharacteristic = foundChar;
      this.status = "connected";
      this.pairedDeviceName = selectedDevice.name || "Goojprt 58mm Belt Printer";

      await appStorage.setItem(LAST_DEVICE_NAME_KEY, this.pairedDeviceName);

      // Listen for unexpected disconnect
      if (selectedDevice.addEventListener) {
        selectedDevice.addEventListener("gattserverdisconnected", () => {
          this.status = "disconnected";
          this.writeCharacteristic = null;
          this.notify();
        });
      }

      this.notify();
      return { success: true, deviceName: this.pairedDeviceName };
    } catch (err: any) {
      this.status = "disconnected";
      this.notify();
      const msg = err?.message || String(err);
      if (msg.includes("cancelled") || msg.includes("User cancelled")) {
        return { success: false, error: "Pairing cancelled by user." };
      }
      return { success: false, error: msg || "Failed to pair with Goojprt printer." };
    }
  }

  // Disconnect printer
  public disconnect() {
    try {
      if (this.device?.gatt?.connected) {
        this.device.gatt.disconnect();
      }
    } catch {
      // Ignore disconnect errors
    } finally {
      this.device = null;
      this.writeCharacteristic = null;
      this.status = "disconnected";
      this.notify();
    }
  }

  // Send raw bytes to Goojprt in chunks (avoids BLE MTU buffer overflow)
  public async sendRawBytes(bytes: Uint8Array): Promise<{ success: boolean; error?: string }> {
    if (this.status !== "connected" || !this.writeCharacteristic) {
      return { success: false, error: "Goojprt belt printer is not connected." };
    }

    try {
      // Goojprt BLE works reliably with 64-byte chunks with 20ms pause
      const CHUNK_SIZE = 64;
      const total = bytes.length;

      for (let offset = 0; offset < total; offset += CHUNK_SIZE) {
        const chunk = bytes.slice(offset, Math.min(total, offset + CHUNK_SIZE));
        if (this.writeCharacteristic.properties.writeWithoutResponse && this.writeCharacteristic.writeValueWithoutResponse) {
          await this.writeCharacteristic.writeValueWithoutResponse(chunk);
        } else {
          await this.writeCharacteristic.writeValue(chunk);
        }
        if (offset + CHUNK_SIZE < total) {
          await new Promise((r) => setTimeout(r, 20));
        }
      }

      return { success: true };
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || "Failed sending print stream to Goojprt belt printer.",
      };
    }
  }

  // Print raw ESC/POS bytes through RawBT Android print service
  public async printViaRawbt(bytes: Uint8Array): Promise<{ success: boolean; error?: string }> {
    if (Platform.OS !== "android") {
      return { success: false, error: "RawBT print service is only available on Android." };
    }

    try {
      const base64Data = uint8ArrayToBase64(bytes);
      const rawbtUrl = `rawbt:base64,${base64Data}`;

      try {
        await Linking.openURL(rawbtUrl);
        return { success: true };
      } catch (openErr) {
        console.warn("[ThermalPrinter] Linking.openURL(rawbt:) failed, trying sendIntent:", openErr);
        try {
          await Linking.sendIntent("ru.a402d.rawbtprinter.action.PRINT_RAWBT", [
            { key: "ru.a402d.rawbtprinter.extra.DATA", value: base64Data },
          ]);
          return { success: true };
        } catch (intentErr) {
          console.error("[ThermalPrinter] Both rawbt: openURL and sendIntent failed:", intentErr);
          throw intentErr;
        }
      }
    } catch (err: any) {
      console.error("[ThermalPrinter] RawBT dispatch failed:", err);
      return {
        success: false,
        error:
          "Unable to send print job to RawBT. Please ensure the RawBT app is installed from the Google Play Store.",
      };
    }
  }

  // Print transactions directly to connected Bluetooth printer or through RawBT
  public async printReceipt(
    txns: Transaction[],
    options: ReceiptOptions = {}
  ): Promise<{ success: boolean; isDirectBluetooth: boolean; error?: string }> {
    const { bytes } = buildGoojprtReceiptBytes(txns, options);

    // 1. If native Android, dispatch directly to RawBT print service
    // RawBT will automatically send to whichever printer is currently connected and active!
    if (Platform.OS === "android") {
      const rawbtResult = await this.printViaRawbt(bytes);
      if (rawbtResult.success) {
        return { success: true, isDirectBluetooth: true };
      }
    }

    // 2. If direct Web Bluetooth is active (e.g. Chrome desktop), send raw BLE packets
    if (this.status === "connected" && this.writeCharacteristic) {
      const result = await this.sendRawBytes(bytes);
      if (result.success) {
        return { success: true, isDirectBluetooth: true };
      }
    }

    // 3. Fallback: Web / System Print
    if (Platform.OS === "web" && typeof window !== "undefined" && (window as any).print) {
      try {
        (window as any).print();
        return { success: true, isDirectBluetooth: false };
      } catch {
        // Fall through
      }
    }

    return {
      success: false,
      isDirectBluetooth: false,
      error: "Printer disconnected and browser print dialog unavailable.",
    };
  }

  // Test Print
  public async printTestSlip(unit?: string, conductor?: string): Promise<{ success: boolean; error?: string }> {
    const { bytes } = buildGoojprtTestTicket(unit, conductor);

    if (Platform.OS === "android") {
      return this.printViaRawbt(bytes);
    }

    if (this.status === "connected" && this.writeCharacteristic) {
      return this.sendRawBytes(bytes);
    }
    return { success: false, error: "Bluetooth printer is not connected." };
  }
}

export const thermalPrinter = new GoojprtPrinterManager();
