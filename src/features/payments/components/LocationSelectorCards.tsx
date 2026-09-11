import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "../../../core/theme/ThemeProvider";
import type { FarePoint } from "../../../core/domain/types";

export interface LocationSelectorCardsProps {
  styles: any;
  pickupPoint: FarePoint | null;
  dropoffPoint: FarePoint | null;
  pickupLandmark: string | null;
  dropoffLandmark: string | null;
  selectingField: "pickup" | "dropoff" | null;
  setSelectingField: (field: "pickup" | "dropoff") => void;
  isAutoPickup: boolean;
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
  pickupPoint,
  dropoffPoint,
  pickupLandmark,
  dropoffLandmark,
  selectingField,
  setSelectingField,
  isAutoPickup,
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
  const { colors, isLofi } = useAppTheme();

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
                {isAutoPickup ? (
                  <View style={styles.autoGpsBadge}>
                    <Ionicons name="location-sharp" size={10} color={isLofi ? colors.primary : "#60A5FA"} />
                    <Text style={styles.autoGpsBadgeText}>GPS</Text>
                  </View>
                ) : null}
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
    </View>
  );
}
