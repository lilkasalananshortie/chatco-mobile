import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { usePaymentTheme } from "../../../core/theme/payment-theme";
import type { CommuterType, FarePoint } from "../../../core/domain/types";
import type { SelectedPaymentMethod } from "../payment-types";

export interface LocationSelectorCardsProps {
  styles: any;
  selectedMethod: SelectedPaymentMethod | null;
  isGroupMode: boolean;
  setIsGroupMode: (group: boolean) => void;
  commuterType: CommuterType;
  setCommuterType: (type: CommuterType) => void;
  pickupPoint: FarePoint | null;
  dropoffPoint: FarePoint | null;
  pickupLandmark: string | null;
  dropoffLandmark: string | null;
  selectingField: "pickup" | "dropoff" | null;
  setSelectingField: (field: "pickup" | "dropoff") => void;
  isSameBarangay: boolean;
  pickupDotColor: string;
  dropoffDotColor: string;
  pickupBadgeBg: string;
  pickupBadgeText: string;
  dropoffBadgeBg: string;
  dropoffBadgeText: string;
  clearPickup: () => void;
  clearDropoff: () => void;
  swapLocations: () => void;
}

export function LocationSelectorCards({
  styles,
  selectedMethod,
  isGroupMode,
  setIsGroupMode,
  commuterType,
  setCommuterType,
  pickupPoint,
  dropoffPoint,
  pickupLandmark,
  dropoffLandmark,
  selectingField,
  setSelectingField,
  isSameBarangay,
  pickupDotColor,
  dropoffDotColor,
  pickupBadgeBg,
  pickupBadgeText,
  dropoffBadgeBg,
  dropoffBadgeText,
  clearPickup,
  clearDropoff,
  swapLocations,
}: LocationSelectorCardsProps) {
  const { colors, isLofi } = usePaymentTheme();

  return (
    <View style={styles.locationSelectorSection}>
      {/* Pickup Card */}
      <View style={styles.cardWrapper}>
        <Pressable
          onPress={() => setSelectingField("pickup")}
          style={[
            styles.locationCard,
            selectingField === "pickup"
              ? {
                  borderColor: isSameBarangay
                    ? isLofi
                      ? "#6D28D9"
                      : "rgba(139, 92, 246, 0.5)"
                    : isLofi
                    ? colors.success
                    : "rgba(16, 185, 129, 0.5)",
                  backgroundColor: isSameBarangay
                    ? isLofi
                      ? "rgba(109, 40, 217, 0.12)"
                      : "rgba(139, 92, 246, 0.08)"
                    : isLofi
                    ? "rgba(22, 112, 90, 0.12)"
                    : "rgba(16, 185, 129, 0.08)",
                }
              : styles.locationCardInactive,
          ]}
        >
          <View style={styles.locationCardHeader}>
            <View style={[styles.dot, { backgroundColor: pickupDotColor }]} />
            <Text
              style={[
                styles.locationCardLabel,
                isSameBarangay
                  ? { color: isLofi ? "#6D28D9" : "#A78BFA" }
                  : { color: isLofi ? colors.success : "#34D399" },
              ]}
            >
              PICKUP
            </Text>
          </View>
          <View style={styles.locationCardBody}>
            <Text
              style={[
                styles.locationCardText,
                pickupPoint ? styles.locationCardTextActive : styles.locationCardTextPlaceholder,
              ]}
              numberOfLines={1}
            >
              {pickupPoint
                ? pickupLandmark
                  ? `${pickupPoint.name} · ${pickupLandmark}`
                  : pickupPoint.name
                : "Select pickup location"}
            </Text>
            {pickupPoint ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <View style={[styles.brgyPill, { backgroundColor: pickupBadgeBg }]}>
                  <Text style={[styles.brgyPillText, { color: pickupBadgeText }]}>
                    Brgy {pickupPoint.pointNumber}
                  </Text>
                </View>
              </View>
            ) : null}
          </View>
        </Pressable>
        {pickupPoint ? (
          <Pressable
            onPress={(e) => {
              e.stopPropagation();
              clearPickup();
            }}
            style={styles.clearButton}
            accessibilityLabel="Clear pickup"
          >
            <Ionicons name="close" size={14} color={colors.muted} />
          </Pressable>
        ) : null}
      </View>

      {/* Swap Button */}
      <View style={styles.swapButtonWrapper}>
        <Pressable onPress={swapLocations} style={styles.swapButton} accessibilityLabel="Swap locations">
          <Ionicons name="swap-vertical" size={16} color={colors.text} />
        </Pressable>
      </View>

      {/* Dropoff Card */}
      <View style={styles.cardWrapper}>
        <Pressable
          onPress={() => setSelectingField("dropoff")}
          style={[
            styles.locationCard,
            selectingField === "dropoff"
              ? {
                  borderColor: isSameBarangay
                    ? isLofi
                      ? "#6D28D9"
                      : "rgba(139, 92, 246, 0.5)"
                    : isLofi
                    ? colors.success
                    : "rgba(16, 185, 129, 0.5)",
                  backgroundColor: isSameBarangay
                    ? isLofi
                      ? "rgba(109, 40, 217, 0.12)"
                      : "rgba(139, 92, 246, 0.08)"
                    : isLofi
                    ? "rgba(22, 112, 90, 0.12)"
                    : "rgba(16, 185, 129, 0.08)",
                }
              : styles.locationCardInactive,
          ]}
        >
          <View style={styles.locationCardHeader}>
            <View style={[styles.dot, { backgroundColor: dropoffDotColor }]} />
            <Text
              style={[
                styles.locationCardLabel,
                isSameBarangay
                  ? { color: isLofi ? "#6D28D9" : "#A78BFA" }
                  : { color: isLofi ? colors.success : "#34D399" },
              ]}
            >
              DROP-OFF
            </Text>
          </View>
          <View style={styles.locationCardBody}>
            <Text
              style={[
                styles.locationCardText,
                dropoffPoint ? styles.locationCardTextActive : styles.locationCardTextPlaceholder,
              ]}
              numberOfLines={1}
            >
              {dropoffPoint
                ? dropoffLandmark
                  ? `${dropoffPoint.name} · ${dropoffLandmark}`
                  : dropoffPoint.name
                : "Select drop-off location"}
            </Text>
            {dropoffPoint ? (
              <View style={[styles.brgyPill, { backgroundColor: dropoffBadgeBg }]}>
                <Text style={[styles.brgyPillText, { color: dropoffBadgeText }]}>
                  Brgy {dropoffPoint.pointNumber}
                </Text>
              </View>
            ) : null}
          </View>
        </Pressable>
        {dropoffPoint ? (
          <Pressable
            onPress={(e) => {
              e.stopPropagation();
              clearDropoff();
            }}
            style={styles.clearButton}
            accessibilityLabel="Clear drop-off"
          >
            <Ionicons name="close" size={14} color={colors.muted} />
          </Pressable>
        ) : null}
      </View>

      {selectedMethod !== "Voucher" ? (
        <View style={{ marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.border }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <Text style={{ color: isLofi ? "#6B7280" : "rgba(255,255,255,0.4)", fontSize: 10, fontWeight: "700", letterSpacing: 1, textTransform: "uppercase" }}>
              {selectedMethod === "GCash" ? "Passengers" : "Commuter Type"}
            </Text>
            <View accessibilityRole="radiogroup" accessibilityLabel="Payment passenger mode" style={{ flexDirection: "row", padding: 2, borderWidth: 1, borderColor: colors.border, borderRadius: 8, backgroundColor: isLofi ? colors.surface2 : "rgba(255,255,255,0.05)" }}>
              {([false, true] as const).map((multiple) => {
                const active = isGroupMode === multiple;
                return (
                  <Pressable
                    key={String(multiple)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: active }}
                    onPress={() => setIsGroupMode(multiple)}
                    style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6, backgroundColor: active ? (isLofi ? colors.primary : "#1A5FB4") : "transparent" }}
                  >
                    <Text style={{ color: active ? "#FFFFFF" : (isLofi ? "#6B7280" : "rgba(255,255,255,0.45)"), fontSize: 10, fontWeight: "600" }}>
                      {multiple ? "Multiple" : "Single"}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <Text style={{ marginTop: 4, color: isLofi ? "#6B7280" : "rgba(255,255,255,0.45)", fontSize: 10 }}>
            {isGroupMode
              ? selectedMethod === "GCash"
                ? "Multiple - Enter companions only; the payer is added after QR claim"
                : "Multiple - Enter passenger quantities"
              : "Single · One payer, one transaction"}
          </Text>

          {!isGroupMode && selectedMethod !== "GCash" ? (
            <View style={{ flexDirection: "row", gap: 6, marginTop: 8 }}>
              {([
                { type: "REGULAR", label: "Regular" },
                { type: "STUDENT", label: "Student" },
                { type: "SENIOR_CITIZEN", label: "Senior" },
                { type: "PWD", label: "PWD" },
              ] as const).map(({ type, label }) => {
                const active = commuterType === type;
                return (
                  <Pressable
                    key={type}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    onPress={() => setCommuterType(type)}
                    style={{ flex: 1, minWidth: 0, alignItems: "center", paddingHorizontal: 3, paddingVertical: 6, borderRadius: 8, backgroundColor: active ? (isLofi ? colors.surface2 : "rgba(26,95,180,0.35)") : (isLofi ? colors.surface2 : "rgba(255,255,255,0.04)") }}
                  >
                    <Text numberOfLines={1} style={{ color: active ? (isLofi ? colors.primary : "#60A5FA") : colors.muted, fontSize: 10, fontWeight: active ? "700" : "500" }}>{label}</Text>
                  </Pressable>
                );
              })}
            </View>
          ) : null}

          {isGroupMode ? (
            <Text style={{ marginTop: 6, color: isLofi ? colors.primary : "rgba(96,165,250,0.7)", fontSize: 10 }}>
              Multiple selected - review the route, then enter passenger quantities.
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
