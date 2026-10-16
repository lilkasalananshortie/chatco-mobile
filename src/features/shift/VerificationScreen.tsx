import { useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../../core/api/chatco-api";
import type { Driver, Shift, Unit } from "../../core/domain/types";
import { useAppTheme } from "../../core/theme/ThemeProvider";
import { Header, Loading, ScreenShell } from "../../shared/ui";
import { AssignmentCard } from "./components/AssignmentCard";
import { OfflineDepotNotice } from "./components/OfflineDepotNotice";

export function VerificationScreen({
  onStarted,
  onLogout,
}: {
  onStarted: (shift: Shift) => void;
  onLogout?: () => void;
}) {
  const { colors, styles, isLofi } = useAppTheme();
  const [units, setUnits] = useState<Unit[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [unit, setUnit] = useState<Unit | null>(null);
  const [driver, setDriver] = useState<Driver | null>(null);
  const [unitDropdownOpen, setUnitDropdownOpen] = useState(false);
  const [driverDropdownOpen, setDriverDropdownOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [error, setError] = useState("");
  const [isOfflineDepot, setIsOfflineDepot] = useState(false);

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await api.logout();
    } catch (cause) {
      Alert.alert("Notice", cause instanceof Error ? cause.message : "Signed out.");
    } finally {
      setLoggingOut(false);
      onLogout?.();
    }
  };

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const isConnected = await api.checkConnectivity().catch(() => false);
      setIsOfflineDepot(!isConnected);
      const [availableUnits, availableDrivers] = await Promise.all([
        api.units(),
        api.drivers(),
      ]);
      setUnits(availableUnits);
      setDrivers(availableDrivers);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load assignments.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  if (loading) return <Loading label="Checking assigned units…" />;

  const handleSelectUnit = (selected: Unit) => {
    setUnit(selected);
    setUnitDropdownOpen(false);

    if (selected.status === "maintenance") {
      setError("This vehicle is currently under maintenance and cannot be operated.");
    } else if (selected.status === "in-use") {
      setError("Vehicle is already assigned to an active shift.");
    } else {
      if (error && (error.includes("vehicle") || error.includes("selection"))) {
        setError("");
      }
    }
  };

  const handleSelectDriver = (selected: Driver) => {
    setDriver(selected);
    setDriverDropdownOpen(false);

    if (selected.status === "on-shift") {
      setError("Driver is already on an active shift.");
    } else {
      if (error && (error.includes("Driver") || error.includes("driver") || error.includes("selection"))) {
        setError("");
      }
    }
  };

  const handleConfirmShiftSetup = async () => {
    setError("");

    if (!unit || !driver) {
      setError("Vehicle and driver selection are required to start a shift.");
      return;
    }

    if (unit.status === "maintenance") {
      setError("This vehicle is currently under maintenance and cannot be operated.");
      return;
    }

    if (unit.status === "in-use") {
      setError("Vehicle is already assigned to an active shift.");
      return;
    }

    if (driver.status === "on-shift") {
      setError("Driver is already on an active shift.");
      return;
    }

    setBusy(true);
    try {
      const startedShift = await api.startShift(unit, driver);
      onStarted(startedShift);
    } catch (cause: any) {
      const msg = cause instanceof Error ? cause.message : String(cause || "");
      if (msg.toLowerCase().includes("maintenance")) {
        if (msg.toLowerCase().includes("chatco")) {
          setError("CHATCO is under maintenance right now. Shifts cannot be started until complete.");
        } else {
          setError("This vehicle is currently under maintenance and cannot be operated.");
        }
      } else if (msg.toLowerCase().includes("driver") && msg.toLowerCase().includes("shift")) {
        setError("Driver is already on an active shift.");
      } else if (msg.toLowerCase().includes("vehicle") && msg.toLowerCase().includes("shift")) {
        setError("Vehicle is already assigned to an active shift.");
      } else {
        setError(msg || "Unable to start shift.");
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScreenShell>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {/* Top App Header */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 20,
          }}
        >
          <View>
            <Text style={styles.title}>CHATCO.</Text>
            <Text style={[styles.label, { marginTop: 2 }]}>Conductor Portal</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Log out"
            disabled={loggingOut}
            onPress={() => void handleLogout()}
            style={[
              styles.button,
              styles.secondaryButton,
              {
                minHeight: 36,
                paddingHorizontal: 12,
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
              },
            ]}
          >
            <Ionicons name="log-out-outline" size={16} color={colors.text} />
            <Text style={[styles.buttonText, styles.secondaryButtonText, { fontSize: 12 }]}>
              {loggingOut ? "Signing out..." : "Log Out"}
            </Text>
          </Pressable>
        </View>

        <Header
          title="Unit Verification"
          subtitle="Select your assigned vehicle and driver to start your shift."
        />

        <OfflineDepotNotice isOfflineDepot={isOfflineDepot} />

        {/* Prominent Error / Validation Banner */}
        {error ? (
          <View
            style={{
              backgroundColor: isLofi ? "#FEE2E2" : "rgba(239, 68, 68, 0.14)",
              borderColor: isLofi ? colors.danger : "rgba(239, 68, 68, 0.4)",
              borderWidth: 1.5,
              borderRadius: isLofi ? 4 : 12,
              padding: 14,
              marginVertical: 12,
              flexDirection: "row",
              alignItems: "flex-start",
              gap: 10,
            }}
          >
            <Ionicons name="alert-circle" size={20} color={colors.danger} style={{ marginTop: 1 }} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: isLofi ? "#991B1B" : "#FCA5A5", fontSize: 13, fontWeight: "700", lineHeight: 18 }}>
                {error}
              </Text>
            </View>
            <Pressable onPress={() => setError("")} hitSlop={8}>
              <Ionicons name="close" size={16} color={isLofi ? "#991B1B" : "#FCA5A5"} />
            </Pressable>
          </View>
        ) : null}

        {/* 1. Vehicle Dropdown Selector */}
        <View style={{ marginTop: 12, marginBottom: 16 }}>
          <Text style={[styles.label, { marginBottom: 6, fontSize: 12, fontWeight: "700" }]}>
            SELECT VEHICLE UNIT
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Select vehicle unit"
            onPress={() => {
              setUnitDropdownOpen((prev) => !prev);
              setDriverDropdownOpen(false);
            }}
            style={[
              styles.card,
              {
                marginTop: 0,
                padding: 14,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                borderColor: unit ? colors.primary : colors.border,
                borderRadius: isLofi ? 4 : 14,
              },
            ]}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}>
              <Ionicons
                name="bus-outline"
                size={22}
                color={unit ? (isLofi ? colors.primary : "#62A0EA") : colors.muted}
              />
              <View style={{ flex: 1 }}>
                <Text style={{ color: unit ? colors.text : colors.muted, fontSize: 14, fontWeight: "700" }}>
                  {unit ? `${unit.unitNumber} (${unit.plateNumber})` : "Choose a vehicle..."}
                </Text>
                {unit ? (
                  <Text style={{ color: colors.muted, fontSize: 11, marginTop: 2 }}>{unit.route}</Text>
                ) : null}
              </View>
            </View>
            <Ionicons
              name={unitDropdownOpen ? "chevron-up" : "chevron-down"}
              size={18}
              color={colors.muted}
            />
          </Pressable>

          {/* Unit Dropdown Options */}
          {unitDropdownOpen ? (
            <View style={{ gap: 8, marginTop: 8 }}>
              {units.map((item) => (
                <AssignmentCard
                  key={item.id}
                  item={item}
                  onSelect={() => handleSelectUnit(item)}
                />
              ))}
              {units.length === 0 ? (
                <Text style={{ color: colors.muted, fontSize: 12, textAlign: "center", paddingVertical: 8 }}>
                  No vehicle units available.
                </Text>
              ) : null}
            </View>
          ) : null}
        </View>

        {/* 2. Driver Dropdown Selector */}
        <View style={{ marginBottom: 16 }}>
          <Text style={[styles.label, { marginBottom: 6, fontSize: 12, fontWeight: "700" }]}>
            SELECT DRIVER
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Select driver"
            onPress={() => {
              setDriverDropdownOpen((prev) => !prev);
              setUnitDropdownOpen(false);
            }}
            style={[
              styles.card,
              {
                marginTop: 0,
                padding: 14,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                borderColor: driver ? colors.primary : colors.border,
                borderRadius: isLofi ? 4 : 14,
              },
            ]}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}>
              <Ionicons
                name="person-outline"
                size={22}
                color={driver ? (isLofi ? colors.primary : "#62A0EA") : colors.muted}
              />
              <View style={{ flex: 1 }}>
                <Text style={{ color: driver ? colors.text : colors.muted, fontSize: 14, fontWeight: "700" }}>
                  {driver ? driver.name : "Choose a driver..."}
                </Text>
              </View>
            </View>
            <Ionicons
              name={driverDropdownOpen ? "chevron-up" : "chevron-down"}
              size={18}
              color={colors.muted}
            />
          </Pressable>

          {/* Driver Dropdown Options */}
          {driverDropdownOpen ? (
            <View style={{ gap: 8, marginTop: 8 }}>
              {drivers.map((item) => (
                <AssignmentCard
                  key={item.id}
                  item={item}
                  onSelect={() => handleSelectDriver(item)}
                />
              ))}
              {drivers.length === 0 ? (
                <Text style={{ color: colors.muted, fontSize: 12, textAlign: "center", paddingVertical: 8 }}>
                  No drivers available.
                </Text>
              ) : null}
            </View>
          ) : null}
        </View>

        {/* 3. Shift Setup Summary */}
        <View
          style={[
            styles.card,
            {
              padding: 14,
              borderColor: colors.border,
              borderRadius: isLofi ? 4 : 14,
              backgroundColor: isLofi ? colors.surface : "rgba(255,255,255,0.02)",
              gap: 10,
              marginBottom: 20,
            },
          ]}
        >
          <Text style={{ fontSize: 13, fontWeight: "700", color: colors.text }}>Shift Setup Summary</Text>
          <View style={{ height: 1, backgroundColor: colors.border }} />

          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={{ color: colors.muted, fontSize: 12 }}>Vehicle Unit</Text>
            <Text style={{ color: colors.text, fontSize: 12, fontWeight: "700" }}>
              {unit ? `${unit.unitNumber} (${unit.plateNumber})` : "Not selected"}
            </Text>
          </View>

          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={{ color: colors.muted, fontSize: 12 }}>Assigned Driver</Text>
            <Text style={{ color: colors.text, fontSize: 12, fontWeight: "700" }}>
              {driver ? driver.name : "Not selected"}
            </Text>
          </View>

          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={{ color: colors.muted, fontSize: 12 }}>Assigned Route</Text>
            <Text
              style={{ color: colors.text, fontSize: 12, fontWeight: "700", textAlign: "right", maxWidth: 180 }}
              numberOfLines={1}
            >
              {unit?.route || "McArthur Highway — Calumpit to Meycauayan"}
            </Text>
          </View>
        </View>

        {/* 4. Confirm Shift Setup Button */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Confirm Shift Setup"
          disabled={busy}
          onPress={() => void handleConfirmShiftSetup()}
          style={[
            styles.button,
            {
              backgroundColor: colors.primary,
              minHeight: 48,
              justifyContent: "center",
              alignItems: "center",
              borderRadius: isLofi ? 4 : 14,
            },
          ]}
        >
          <Text style={[styles.buttonText, { color: "#FFFFFF", fontWeight: "800", fontSize: 14 }]}>
            {busy ? "Starting Shift…" : "Confirm Shift Setup"}
          </Text>
        </Pressable>
      </ScrollView>
    </ScreenShell>
  );
}
