import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "../../../core/theme/ThemeProvider";
import type { FarePoint } from "../../../core/domain/types";
import type { FareInfo, SelectedPaymentMethod, Step } from "../payment-types";
import { formatCurrency } from "../fare-helpers";

export interface LocationBottomBarProps {
  styles: any;
  selectedMethod: SelectedPaymentMethod | null;
  pickupPoint: FarePoint | null;
  dropoffPoint: FarePoint | null;
  pickupLandmark: string | null;
  dropoffLandmark: string | null;
  pickupDotColor: string;
  dropoffDotColor: string;
  isGroupMode: boolean;
  setIsGroupMode?: (group: boolean) => void;
  commuterType?: any;
  setCommuterType?: (type: any) => void;
  fareInfo: FareInfo | null;
  setStep: (step: Step) => void;
}

export function LocationBottomBar({
  styles,
  selectedMethod,
  pickupPoint,
  dropoffPoint,
  pickupLandmark,
  dropoffLandmark,
  pickupDotColor,
  dropoffDotColor,
  isGroupMode,
  setIsGroupMode,
  commuterType = "REGULAR",
  setCommuterType,
  fareInfo,
  setStep,
}: LocationBottomBarProps) {
  const { colors, isLofi } = useAppTheme();
  const isGCash = selectedMethod === "GCash";
  const bothLocationsSelected = Boolean(pickupPoint && dropoffPoint);

  return (
    <>
      {/* GCash mode: Route confirmation ONLY, NO fare displayed */}
      {isGCash && bothLocationsSelected ? (
        <View style={styles.bottomBarContainer}>
          <View style={styles.routeConfirmRow}>
            <View style={styles.routePointInline}>
              <View style={[styles.miniDot, { backgroundColor: pickupDotColor }]} />
              <Text style={styles.routePointInlineText} numberOfLines={1}>
                {pickupPoint?.name}
                {pickupLandmark ? ` · ${pickupLandmark}` : ""}
              </Text>
            </View>
            <Ionicons name="arrow-forward" size={14} color={colors.muted} />
            <View style={styles.routePointInline}>
              <View style={[styles.miniDot, { backgroundColor: dropoffDotColor }]} />
              <Text style={styles.routePointInlineText} numberOfLines={1}>
                {dropoffPoint?.name}
                {dropoffLandmark ? ` · ${dropoffLandmark}` : ""}
              </Text>
            </View>
          </View>

          {/* Passenger Mode Selector: Single vs Multiple */}
          <View style={{ flexDirection: "row", backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 8, padding: 3, marginBottom: 8, marginTop: 8 }}>
            <Pressable
              onPress={() => setIsGroupMode?.(false)}
              style={{
                flex: 1,
                paddingVertical: 6,
                alignItems: "center",
                borderRadius: 6,
                backgroundColor: !isGroupMode ? (isLofi ? colors.primary : "#1A5FB4") : "transparent",
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: "700", color: !isGroupMode ? "#FFFFFF" : colors.muted }}>
                Single Passenger
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setIsGroupMode?.(true)}
              style={{
                flex: 1,
                paddingVertical: 6,
                alignItems: "center",
                borderRadius: 6,
                backgroundColor: isGroupMode ? (isLofi ? colors.primary : "#1A5FB4") : "transparent",
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: "700", color: isGroupMode ? "#FFFFFF" : colors.muted }}>
                Multiple (Group)
              </Text>
            </Pressable>
          </View>

          <Pressable
            onPress={() => (isGroupMode ? setStep("passengers") : setStep("confirm"))}
            style={styles.gcashActionButton}
          >
            <Text style={styles.gcashActionButtonText}>
              {isGroupMode ? "Review Transaction" : "Generate QR Code"}
            </Text>
          </Pressable>
          <Text style={styles.bottomHintText}>
            Fare will be calculated after the commuter scans the QR code
          </Text>
        </View>
      ) : null}

      {/* Cash mode: Detailed fare breakdown & Pay button */}
      {!isGCash && fareInfo ? (
        <View style={styles.bottomBarContainer}>
          {/* Route row */}
          <View style={styles.routeConfirmRow}>
            <View style={styles.routePointInline}>
              <View style={[styles.miniDot, { backgroundColor: pickupDotColor }]} />
              <Text style={styles.routePointInlineText} numberOfLines={1}>
                {pickupPoint?.name}
                {pickupLandmark ? ` · ${pickupLandmark}` : ""}
              </Text>
            </View>
            <Ionicons name="arrow-forward" size={14} color={colors.muted} />
            <View style={styles.routePointInline}>
              <View style={[styles.miniDot, { backgroundColor: dropoffDotColor }]} />
              <Text style={styles.routePointInlineText} numberOfLines={1}>
                {dropoffPoint?.name}
                {dropoffLandmark ? ` · ${dropoffLandmark}` : ""}
              </Text>
            </View>
          </View>

          {/* Passenger Mode Selector: Single vs Multiple */}
          <View style={{ flexDirection: "row", backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 8, padding: 3, marginVertical: 8 }}>
            <Pressable
              onPress={() => setIsGroupMode?.(false)}
              style={{
                flex: 1,
                paddingVertical: 6,
                alignItems: "center",
                borderRadius: 6,
                backgroundColor: !isGroupMode ? (isLofi ? colors.primary : "#1A5FB4") : "transparent",
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: "700", color: !isGroupMode ? "#FFFFFF" : colors.muted }}>
                Single Passenger
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setIsGroupMode?.(true)}
              style={{
                flex: 1,
                paddingVertical: 6,
                alignItems: "center",
                borderRadius: 6,
                backgroundColor: isGroupMode ? (isLofi ? colors.primary : "#1A5FB4") : "transparent",
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: "700", color: isGroupMode ? "#FFFFFF" : colors.muted }}>
                Multiple (Group)
              </Text>
            </Pressable>
          </View>

          {/* Passenger Type Chips (only in Single mode) */}
          {!isGroupMode && setCommuterType && (
            <View style={{ flexDirection: "row", gap: 6, marginBottom: 8, justifyContent: "space-between" }}>
              {(
                [
                  { type: "REGULAR", label: "Regular" },
                  { type: "STUDENT", label: "Student" },
                  { type: "SENIOR_CITIZEN", label: "Senior" },
                  { type: "PWD", label: "PWD" },
                ] as const
              ).map((chip) => {
                const active = commuterType === chip.type;
                return (
                  <Pressable
                    key={chip.type}
                    onPress={() => setCommuterType(chip.type as any)}
                    style={{
                      flex: 1,
                      paddingVertical: 6,
                      alignItems: "center",
                      borderRadius: 6,
                      borderWidth: 1.5,
                      borderColor: active ? (isLofi ? colors.primary : "#38BDF8") : "rgba(255,255,255,0.12)",
                      backgroundColor: active
                        ? (isLofi ? colors.surface2 : "rgba(14, 165, 233, 0.25)")
                        : "rgba(255,255,255,0.03)",
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 11,
                        fontWeight: active ? "700" : "500",
                        color: active ? (isLofi ? colors.primary : "#38BDF8") : colors.muted,
                      }}
                    >
                      {chip.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}

          {/* Fare explanation box */}
          <View style={styles.fareExplanationBox}>
            <Text style={styles.fareExplanationText}>
              {fareInfo.barangaysTraveled} barangay
              {fareInfo.barangaysTraveled !== 1 ? "s" : ""} traversed
              {fareInfo.succeedingCount > 0
                ? ` · Base fare covers first ${fareInfo.baseBarangayCount} + ${fareInfo.succeedingCount} succeeding`
                : ""}
            </Text>
          </View>

          {/* Route & Price display */}
          <View style={styles.fareTotalRow}>
            <View style={{ flex: 1, paddingRight: 8 }}>
              <Text style={styles.fareRouteSub} numberOfLines={1}>
                {pickupPoint?.name}
                {pickupLandmark ? ` · ${pickupLandmark}` : ""} → {dropoffPoint?.name}
                {dropoffLandmark ? ` · ${dropoffLandmark}` : ""}
              </Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              {fareInfo.hasDiscount ? (
                <Text style={styles.fareStrikethrough}>{formatCurrency(fareInfo.regularFare)}</Text>
              ) : null}
              <Text style={styles.fareFinalLarge}>{formatCurrency(fareInfo.finalFare)}</Text>
              {fareInfo.hasDiscount ? (
                <Text style={styles.fareSavingsText}>
                  You save {formatCurrency(fareInfo.discountAmount)}
                </Text>
              ) : null}
            </View>
          </View>

          {/* Action button */}
          <Pressable
            onPress={() => setStep(isGroupMode ? "passengers" : "confirm")}
            style={styles.cashActionButton}
          >
            <Text style={styles.cashActionButtonText}>
              {isGroupMode ? "Enter Group Quantities" : `Pay ${formatCurrency(fareInfo.finalFare)} with Cash`}
            </Text>
          </Pressable>
        </View>
      ) : null}

      {/* Hint when neither selected */}
      {(!isGCash && !fareInfo) || (isGCash && !bothLocationsSelected) ? (
        <View style={styles.bottomBarContainer}>
          <Text style={styles.bottomPlaceholderText}>
            {isGCash
              ? "Select both pickup and drop-off locations to generate QR code"
              : "Select both pickup and drop-off to calculate fare"}
          </Text>
        </View>
      ) : null}
    </>
  );
}
