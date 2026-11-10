import { useEffect, useRef } from "react";
import { Animated, Easing, Pressable, View } from "react-native";
import { Text } from "../../../shared/ui/BrandText";
import { Ionicons } from "@expo/vector-icons";
import { usePaymentTheme } from "../../../core/theme/payment-theme";
import type { CommuterType, FarePoint } from "../../../core/domain/types";
import type { SelectedPaymentMethod } from "../payment-types";
import { useAnimatedColor } from "../../../shared/ui/useAnimatedFeedback";
import { useReducedMotion } from "../../../shared/ui/useWebEntrance";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

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
  const { colors, isLofi, isLowFidelity } = usePaymentTheme();
  const standardSelection = selectedMethod === "Cash" || selectedMethod === "GCash";
  const pickupAccent = isSameBarangay ? "#8B5CF6" : "#10B981";
  const dropoffAccent = isSameBarangay ? "#8B5CF6" : "#F97316";
  const inactiveBackground = isLofi ? colors.surface2 : "rgba(255,255,255,0.05)";
  const selectedBorder = standardSelection ? pickupAccent : isSameBarangay ? isLofi ? "#6D28D9" : "rgba(139, 92, 246, 0.5)" : isLofi ? colors.success : "rgba(16, 185, 129, 0.5)";
  const selectedBackground = standardSelection ? colors.surface : isSameBarangay ? isLofi ? "rgba(109, 40, 217, 0.12)" : "rgba(139, 92, 246, 0.08)" : isLofi ? "rgba(22, 112, 90, 0.12)" : "rgba(16, 185, 129, 0.08)";
  const reduceMotion = useReducedMotion();
  const pickupBorder = useAnimatedColor(selectingField === "pickup" ? selectedBorder : colors.border, 200, isLowFidelity || reduceMotion);
  const pickupBackground = useAnimatedColor(selectingField === "pickup" ? selectedBackground : inactiveBackground, 200, isLowFidelity || reduceMotion);
  const dropoffBorder = useAnimatedColor(selectingField === "dropoff" ? (standardSelection ? dropoffAccent : selectedBorder) : colors.border, 200, isLowFidelity || reduceMotion);
  const dropoffBackground = useAnimatedColor(selectingField === "dropoff" ? selectedBackground : inactiveBackground, 200, isLowFidelity || reduceMotion);
  const warningPulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!isSameBarangay || isLowFidelity || reduceMotion) {
      warningPulse.setValue(1);
      return;
    }
    const animation = Animated.loop(Animated.sequence([
      Animated.timing(warningPulse, { toValue: 0.45, duration: 1000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(warningPulse, { toValue: 1, duration: 1000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    ]));
    animation.start();
    return () => animation.stop();
  }, [isSameBarangay, isLowFidelity, reduceMotion, warningPulse]);

  return (
    <View style={styles.locationSelectorSection}>
      {/* Pickup Card */}
      <View style={styles.cardWrapper}>
        <AnimatedPressable
          onPress={() => setSelectingField("pickup")}
          style={[styles.locationCard, { borderColor: pickupBorder, backgroundColor: pickupBackground }]}
        >
          <View style={styles.locationCardHeader}>
            <View style={[styles.dot, { backgroundColor: standardSelection ? pickupAccent : pickupDotColor }]} />
            <Text
              style={[
                styles.locationCardLabel,
                standardSelection ? { color: colors.muted } : isSameBarangay
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
                <View style={[styles.brgyPill, { backgroundColor: standardSelection ? "transparent" : pickupBadgeBg }]}>
                  <Text style={[styles.brgyPillText, { color: standardSelection ? pickupAccent : pickupBadgeText }]}>
                    Brgy {pickupPoint.pointNumber}
                  </Text>
                </View>
              </View>
            ) : null}
          </View>
        </AnimatedPressable>
        {pickupPoint ? (
          <Pressable
            onPress={(e) => {
              e.stopPropagation();
              clearPickup();
            }}
            style={styles.clearButton}
            accessibilityRole="button"
            hitSlop={8}
            accessibilityLabel="Clear pickup"
          >
            <Ionicons name="close" size={14} color={colors.muted} />
          </Pressable>
        ) : null}
      </View>

      {/* Swap Button */}
      <View style={styles.swapButtonWrapper}>
        <Pressable accessibilityRole="button" hitSlop={4} onPress={swapLocations} style={styles.swapButton} accessibilityLabel="Swap locations">
          <Ionicons name="swap-vertical" size={16} color={colors.text} />
        </Pressable>
      </View>

      {/* Dropoff Card */}
      <View style={styles.cardWrapper}>
        <AnimatedPressable
          onPress={() => setSelectingField("dropoff")}
          style={[styles.locationCard, { borderColor: dropoffBorder, backgroundColor: dropoffBackground }]}
        >
          <View style={styles.locationCardHeader}>
            <View style={[styles.dot, { backgroundColor: standardSelection ? dropoffAccent : dropoffDotColor }]} />
            <Text
              style={[
                styles.locationCardLabel,
                standardSelection ? { color: colors.muted } : isSameBarangay
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
              <View style={[styles.brgyPill, { backgroundColor: standardSelection ? "transparent" : dropoffBadgeBg }]}>
                <Text style={[styles.brgyPillText, { color: standardSelection ? dropoffAccent : dropoffBadgeText }]}>
                  Brgy {dropoffPoint.pointNumber}
                </Text>
              </View>
            ) : null}
          </View>
        </AnimatedPressable>
        {dropoffPoint ? (
          <Pressable
            onPress={(e) => {
              e.stopPropagation();
              clearDropoff();
            }}
            style={styles.clearButton}
            accessibilityRole="button"
            hitSlop={8}
            accessibilityLabel="Clear drop-off"
          >
            <Ionicons name="close" size={14} color={colors.muted} />
          </Pressable>
        ) : null}
      </View>

      {isSameBarangay ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: "#8B5CF6", borderRadius: 8, marginTop: 10 }}>
          <Animated.View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#A78BFA", opacity: warningPulse }} />
          <Text style={{ flex: 1, color: isLofi ? "#6D28D9" : "#C4B5FD", fontSize: 10, fontWeight: "500" }}>Same pickup & drop-off — both locations shown in violet</Text>
        </View>
      ) : null}

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
