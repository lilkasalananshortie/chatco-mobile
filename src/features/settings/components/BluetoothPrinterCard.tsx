import React from "react";
import { Pressable, View } from "react-native";
import { Text } from "../../../shared/ui/BrandText";
import type { PrinterStatus } from "../../../core/utils/thermal-printer";

export interface BluetoothPrinterCardProps {
  styles: any;
  colors: any;
  isLofi: boolean;
  printerStatus: PrinterStatus;
  printerName: string | null;
  isConnectingPrinter: boolean;
  onConnectPrinter: () => void;
  onDisconnectPrinter: () => void;
  autoPrint: boolean;
  onToggleAutoPrint: () => void;
  isTestingPrinter: boolean;
  onTestPrint: () => void;
}

export function BluetoothPrinterCard({
  styles,
  colors,
  printerStatus,
  printerName,
  isConnectingPrinter,
  onConnectPrinter,
  onDisconnectPrinter,
  autoPrint,
  onToggleAutoPrint,
  isTestingPrinter,
  onTestPrint,
}: BluetoothPrinterCardProps) {
  const connected = printerStatus === "connected";
  const connecting = printerStatus === "connecting" || isConnectingPrinter;
  const deviceLabel = connected
    ? printerName || "Bluetooth thermal printer"
    : connecting
    ? "Searching for a nearby printer…"
    : printerName
    ? `${printerName} · saved, disconnected`
    : "No printer paired";

  return (
    <View style={styles.sectionCard}>
      <View style={styles.sectionHeaderRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.sectionHeaderTitle}>Receipt printer</Text>
          <Text style={[styles.prefSubtitle, { marginTop: 3 }]}>Bluetooth · 58 mm / 80 mm ESC/POS</Text>
        </View>
      </View>

      <View style={{ marginTop: 14, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 12, backgroundColor: colors.surface2 }}>
        <Text style={{ color: colors.muted, fontSize: 11, fontWeight: "700", letterSpacing: 0.5, textTransform: "uppercase" }}>
          Printer status
        </Text>
        <Text numberOfLines={2} style={{ color: colors.text, fontSize: 13, fontWeight: "700", marginTop: 4 }}>
          {deviceLabel}
        </Text>
        <Pressable
          accessibilityRole="button"
          disabled={connecting}
          onPress={connected ? onDisconnectPrinter : onConnectPrinter}
          style={{ minHeight: 42, alignItems: "center", justifyContent: "center", marginTop: 12, paddingHorizontal: 14, borderRadius: 8, backgroundColor: connected ? colors.surface : colors.primary, borderWidth: connected ? 1 : 0, borderColor: colors.border }}
        >
          <Text style={{ color: connected ? colors.text : "#FFFFFF", fontSize: 13, fontWeight: "700" }}>
            {connected ? "Disconnect printer" : connecting ? "Pairing…" : "Pair printer"}
          </Text>
        </Pressable>
      </View>

      <Pressable
        accessibilityRole="switch"
        accessibilityLabel="Automatically print receipts after payment"
        accessibilityState={{ checked: autoPrint }}
        onPress={onToggleAutoPrint}
        style={{ minHeight: 64, flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderColor: colors.border }}
      >
        <View style={{ flex: 1 }}>
          <Text style={styles.prefTitle}>Print receipts automatically</Text>
          <Text style={styles.prefSubtitle}>{autoPrint ? "Prints after each confirmed cash or GCash payment." : "Receipts can still be printed manually after payment."}</Text>
        </View>
        <View style={{ width: 46, height: 27, borderRadius: 14, padding: 3, justifyContent: "center", backgroundColor: autoPrint ? colors.primary : colors.border }}>
          <View style={{ width: 21, height: 21, borderRadius: 11, backgroundColor: "#FFFFFF", alignSelf: autoPrint ? "flex-end" : "flex-start" }} />
        </View>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        disabled={isTestingPrinter}
        onPress={onTestPrint}
        style={{ minHeight: 46, alignItems: "center", justifyContent: "center", marginTop: 12, borderRadius: 8, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface2 }}
      >
        <Text style={{ color: colors.text, fontSize: 13, fontWeight: "700" }}>
          {isTestingPrinter ? "Printing test receipt…" : "Print test receipt"}
        </Text>
      </Pressable>
    </View>
  );
}
