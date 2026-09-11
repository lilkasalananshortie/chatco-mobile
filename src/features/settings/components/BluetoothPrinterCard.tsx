import React from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
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
  isLofi,
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
  return (
    <View style={styles.sectionCard}>
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionHeaderTitle}>Bluetooth Belt Printer</Text>
        <View
          style={{
            backgroundColor: isLofi ? colors.surface : "rgba(16, 185, 129, 0.15)",
            paddingHorizontal: 6,
            paddingVertical: 2,
            borderRadius: 4,
            borderWidth: 1,
            borderColor: isLofi ? colors.border : "rgba(16, 185, 129, 0.3)",
          }}
        >
          <Text style={{ fontSize: 9, fontWeight: "800", color: isLofi ? colors.text : "#34D399" }}>
            GOOJPRT 58MM ESC/POS
          </Text>
        </View>
      </View>

      {/* Pairing / Connection Status Row */}
      <View style={[styles.infoRow, { marginTop: 8 }]}>
        <View style={{ flex: 1, paddingRight: 8 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <View
              style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor:
                  printerStatus === "connected"
                    ? isLofi
                      ? colors.success
                      : "#10B981"
                    : isLofi
                    ? colors.muted
                    : "#6B7280",
              }}
            />
            <Text style={styles.rowLabel}>
              {printerStatus === "connected" ? "Connected Device" : "Pairing Status"}
            </Text>
          </View>
          <Text style={[styles.rowValue, { marginTop: 2, fontSize: 13 }]}>
            {printerStatus === "connected"
              ? printerName || "Goojprt Belt Printer"
              : printerStatus === "connecting"
              ? "Searching / Connecting..."
              : printerName
              ? `Saved: ${printerName} (Disconnected)`
              : "No Goojprt Paired"}
          </Text>
        </View>

        {printerStatus === "connected" ? (
          <Pressable
            onPress={onDisconnectPrinter}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: isLofi ? 2 : 8,
              backgroundColor: isLofi ? colors.surface2 : "rgba(239, 68, 68, 0.1)",
              borderWidth: 1,
              borderColor: isLofi ? colors.border : "rgba(239, 68, 68, 0.25)",
            }}
          >
            <Text style={{ fontSize: 11, fontWeight: "700", color: isLofi ? colors.danger : "#F87171" }}>
              Disconnect
            </Text>
          </Pressable>
        ) : (
          <Pressable
            disabled={isConnectingPrinter}
            onPress={onConnectPrinter}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: isLofi ? 2 : 8,
              backgroundColor: colors.primary,
              opacity: isConnectingPrinter ? 0.6 : 1,
            }}
          >
            <Text style={{ fontSize: 11, fontWeight: "700", color: "#FFFFFF" }}>
              {isConnectingPrinter ? "Pairing..." : "Connect Goojprt"}
            </Text>
          </Pressable>
        )}
      </View>

      {/* Auto-Print on Payment Switch (ON / OFF) */}
      <View style={[styles.infoRow, { marginTop: 8, paddingVertical: 10 }]}>
        <View style={{ flex: 1, paddingRight: 10 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Text style={styles.prefTitle}>Auto-Print on Ticket</Text>
            <View
              style={{
                backgroundColor: autoPrint
                  ? isLofi
                    ? "rgba(22, 112, 90, 0.15)"
                    : "rgba(16, 185, 129, 0.15)"
                  : colors.surface,
                paddingHorizontal: 6,
                paddingVertical: 2,
                borderRadius: 4,
                borderWidth: 1,
                borderColor: autoPrint
                  ? isLofi
                    ? colors.success
                    : "rgba(16, 185, 129, 0.3)"
                  : colors.border,
              }}
            >
              <Text
                style={{
                  fontSize: 9,
                  fontWeight: "800",
                  color: autoPrint ? (isLofi ? colors.success : "#34D399") : colors.muted,
                }}
              >
                {autoPrint ? "ON" : "OFF"}
              </Text>
            </View>
          </View>
          <Text style={styles.prefSubtitle}>
            {autoPrint
              ? "Active: Automatically outputs 58mm paper slip upon cash or GCash confirmation"
              : "Off: Manual print only — prints when tapping Print Receipt"}
          </Text>
        </View>
        <Pressable
          accessibilityRole="switch"
          accessibilityState={{ checked: autoPrint }}
          onPress={onToggleAutoPrint}
          style={[
            styles.toggleTrack,
            autoPrint ? styles.toggleTrackActive : styles.toggleTrackInactive,
          ]}
        >
          <View
            style={[
              styles.toggleThumb,
              autoPrint ? styles.toggleThumbActive : styles.toggleThumbInactive,
            ]}
          />
        </Pressable>
      </View>

      {/* Test Print Slip Button */}
      <Pressable
        disabled={isTestingPrinter}
        onPress={onTestPrint}
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          marginTop: 8,
          paddingVertical: 8,
          paddingHorizontal: 12,
          borderRadius: isLofi ? 2 : 10,
          backgroundColor: isLofi ? colors.surface2 : "rgba(16, 185, 129, 0.1)",
          borderWidth: 1,
          borderColor: isLofi ? colors.border : "rgba(16, 185, 129, 0.25)",
          alignSelf: "flex-start",
          opacity: isTestingPrinter ? 0.6 : 1,
        }}
      >
        <Ionicons name="receipt-outline" size={16} color={isLofi ? colors.success : "#34D399"} />
        <Text style={{ fontSize: 12, fontWeight: "700", color: isLofi ? colors.success : "#34D399" }}>
          {isTestingPrinter ? "Printing Test Slip..." : "Test Print Slip (58mm)"}
        </Text>
      </Pressable>
    </View>
  );
}
