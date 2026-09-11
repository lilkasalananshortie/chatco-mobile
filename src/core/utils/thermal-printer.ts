import { Platform } from "react-native";
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
  private status: PrinterStatus = "disconnected";
  private device: BluetoothDeviceLike | null = null;
  private writeCharacteristic: BluetoothCharacteristic | null = null;
  private autoPrint = true;
  private pairedDeviceName: string | null = null;
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

  // Connect to Goojprt Bluetooth Belt Printer
  public async connect(): Promise<{ success: boolean; deviceName?: string; error?: string }> {
    if (!this.isWebBluetoothSupported()) {
      return {
        success: false,
        error:
          "Web Bluetooth is not available in this browser. You can still print receipts via the System Print / Slip option.",
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

  // Print transactions directly to Goojprt
  public async printReceipt(
    txns: Transaction[],
    options: ReceiptOptions = {}
  ): Promise<{ success: boolean; isDirectBluetooth: boolean; error?: string }> {
    const { bytes } = buildGoojprtReceiptBytes(txns, options);

    // If Bluetooth is active, print directly to the belt printer
    if (this.status === "connected" && this.writeCharacteristic) {
      const result = await this.sendRawBytes(bytes);
      if (result.success) {
        return { success: true, isDirectBluetooth: true };
      }
    }

    // Fallback: Web / System Print
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
    if (this.status === "connected" && this.writeCharacteristic) {
      return this.sendRawBytes(bytes);
    }
    return { success: false, error: "Goojprt belt printer is not connected." };
  }
}

export const thermalPrinter = new GoojprtPrinterManager();
