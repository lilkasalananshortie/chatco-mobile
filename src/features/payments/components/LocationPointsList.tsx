import { Animated, Pressable, ScrollView, View } from "react-native";
import { Text, TextInput } from "../../../shared/ui/BrandText";
import { Ionicons } from "@expo/vector-icons";
import { usePaymentTheme } from "../../../core/theme/payment-theme";
import { appHaptics } from "../../../core/utils/haptics";
import type { FarePoint } from "../../../core/domain/types";
import { subDropoffPoints } from "../fare-helpers";
import type { SelectedPaymentMethod } from "../payment-types";
import { useAnimatedToggle } from "../../../shared/ui/useAnimatedFeedback";
import { useReducedMotion } from "../../../shared/ui/useWebEntrance";

function RotatingChevron({ expanded, color, disabled }: { expanded: boolean; color: string; disabled: boolean }) {
  const rotation = useAnimatedToggle(expanded, 200, disabled);
  return <Animated.View style={{ transform: [{ rotate: rotation.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "180deg"] }) }] }}>
    <Ionicons name="chevron-down" size={16} color={color} />
  </Animated.View>;
}

export interface LocationPointsListProps {
  styles: any;
  selectedMethod?: SelectedPaymentMethod | null;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  selectingField: "pickup" | "dropoff" | null;
  filteredPoints: FarePoint[];
  pickupPoint: FarePoint | null;
  dropoffPoint: FarePoint | null;
  pickupLandmark: string | null;
  dropoffLandmark: string | null;
  expandedBarangay: number | null;
  setExpandedBarangay: (brgy: number | null) => void;
  isSameBarangay: boolean;
  setPickupPoint: (point: FarePoint | null) => void;
  setPickupLandmark: (landmark: string | null) => void;
  setSelectingField: (field: "pickup" | "dropoff") => void;
  setDropoffPoint: (point: FarePoint | null) => void;
  setDropoffLandmark: (landmark: string | null) => void;
}

export function LocationPointsList({
  styles,
  selectedMethod,
  searchQuery,
  setSearchQuery,
  selectingField,
  filteredPoints,
  pickupPoint,
  dropoffPoint,
  pickupLandmark,
  dropoffLandmark,
  expandedBarangay,
  setExpandedBarangay,
  isSameBarangay,
  setPickupPoint,
  setPickupLandmark,
  setSelectingField,
  setDropoffPoint,
  setDropoffLandmark,
}: LocationPointsListProps) {
  const { colors, isLofi, isLowFidelity } = usePaymentTheme();
  const reduceMotion = useReducedMotion();
  const standardSelection = selectedMethod === "Cash" || selectedMethod === "GCash";

  return (
    <>
      {/* Search Bar */}
      <View style={styles.searchBarWrapper}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={16} color={colors.muted} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search barangay or landmark…"
            placeholderTextColor={colors.muted}
            style={styles.searchInput}
          />
          {searchQuery ? (
            <Pressable onPress={() => setSearchQuery("")} accessibilityLabel="Clear search">
              <Ionicons name="close-circle" size={16} color={colors.muted} />
            </Pressable>
          ) : null}
        </View>
      </View>

      <Text style={[styles.searchTip, { paddingHorizontal: 16, paddingBottom: 8 }]}>Tap your destination Point Area → then select a sub drop-off point · Auto-opens after selection</Text>
      {/* Points List */}
      <ScrollView style={styles.pointsList} contentContainerStyle={styles.pointsListContent}>
        {filteredPoints.map((point) => {
          const isPickup = pickupPoint?.pointNumber === point.pointNumber;
          const isDropoff = dropoffPoint?.pointNumber === point.pointNumber;
          const isExpanded = expandedBarangay === point.pointNumber;
          const pointSubDropoffs = subDropoffPoints(point);

          let itemBg = colors.surface;
          let itemBorder = colors.border;
          if (isPickup || isDropoff) {
            itemBg = isSameBarangay
              ? isLofi
                ? "rgba(109, 40, 217, 0.08)"
                : "rgba(139, 92, 246, 0.08)"
              : isLofi
              ? "rgba(22, 112, 90, 0.08)"
              : "rgba(16, 185, 129, 0.08)";
            itemBorder = isSameBarangay
              ? isLofi
                ? "#6D28D9"
                : "rgba(139, 92, 246, 0.4)"
              : isLofi
              ? colors.success
              : "rgba(16, 185, 129, 0.4)";
          }

          if (standardSelection) {
            itemBg = "transparent";
            itemBorder = isPickup && isDropoff ? "#8B5CF6"
              : isDropoff && isExpanded ? colors.text
              : isPickup ? "#10B981"
              : isDropoff ? "#F97316" : colors.border;
          }

          return (
            <View key={point.pointNumber} style={styles.pointItemWrapper}>
              <Pressable
                onPress={() => {
                  appHaptics.light();
                  if (selectingField === "pickup") {
                    setPickupPoint(point);
                    setPickupLandmark(null);
                    setSelectingField("dropoff");
                    if (pointSubDropoffs.length > 0) {
                      setExpandedBarangay(point.pointNumber);
                    }
                  } else {
                    setDropoffPoint(point);
                    setDropoffLandmark(null);
                    if (pointSubDropoffs.length > 0) {
                      setExpandedBarangay(point.pointNumber);
                    }
                  }
                  setSearchQuery("");
                }}
                style={[styles.pointItemCard, { backgroundColor: itemBg, borderColor: itemBorder }]}
              >
                <View style={styles.pointItemLeft}>
                  <View style={styles.pointBadge}>
                    <Text style={styles.pointBadgePt}>PT</Text>
                    <Text style={styles.pointBadgeNum}>{point.pointNumber}</Text>
                  </View>
                  <View style={styles.pointItemDetails}>
                    <View style={styles.pointItemNameRow}>
                      <Text style={styles.pointItemName} numberOfLines={1}>
                        {point.name}
                      </Text>
                      <Text style={styles.pointItemBrgy}>Brgy {point.pointNumber}</Text>
                    </View>
                    {pointSubDropoffs.length > 0 ? (
                      <Text style={styles.pointItemSubstops} numberOfLines={1}>
                        {pointSubDropoffs.join(" · ")}
                      </Text>
                    ) : null}
                  </View>
                </View>

                <View style={styles.pointItemRight}>
                  {isPickup ? (
                    <View
                      style={[
                        styles.statusTag,
                        { backgroundColor: isSameBarangay ? "#8B5CF6" : "#10B981" },
                      ]}
                    >
                      <Text style={styles.statusTagText}>PICKUP</Text>
                    </View>
                  ) : null}
                  {isDropoff ? (
                    <View
                      style={[
                        styles.statusTag,
                        { backgroundColor: isSameBarangay ? "#8B5CF6" : standardSelection ? "#F97316" : "#10B981" },
                      ]}
                    >
                      <Text style={styles.statusTagText}>DROP-OFF</Text>
                    </View>
                  ) : null}

                  {pointSubDropoffs.length > 0 ? (
                    <Pressable
                      onPress={(e) => {
                        e.stopPropagation();
                        setExpandedBarangay(isExpanded ? null : point.pointNumber);
                      }}
                      style={styles.expandChevronButton}
                    >
                      <RotatingChevron expanded={isExpanded} color={colors.muted} disabled={isLowFidelity || reduceMotion} />
                    </Pressable>
                  ) : null}
                </View>
              </Pressable>

              {/* Expanded Sub-Stops List */}
              {isExpanded && pointSubDropoffs.length > 0 ? (
                <View style={styles.expandedSubstopsBox}>
                  <Text style={styles.expandedSubstopsTitle}>
                    Sub pickup/drop-off points in {point.name}{" "}
                    <Text style={{ color: colors.muted }}>· tap to select</Text>
                  </Text>

                  {/* Use Point Area Only */}
                  <Pressable
                    onPress={() => {
                      appHaptics.light();
                      if (selectingField === "pickup") {
                        setSelectingField("dropoff");
                      }
                      setExpandedBarangay(null);
                    }}
                    style={styles.usePointAreaButton}
                  >
                    <View style={[styles.miniDot, { backgroundColor: isLofi ? colors.warning : "#F59E0B" }]} />
                    <Text style={styles.usePointAreaText}>Use Point Area only</Text>
                  </Pressable>

                  {pointSubDropoffs.map((landmark, idx) => {
                    const isLmPickup =
                      pickupPoint?.pointNumber === point.pointNumber &&
                      pickupLandmark === landmark;
                    const isLmDropoff =
                      dropoffPoint?.pointNumber === point.pointNumber &&
                      dropoffLandmark === landmark;
                    const isLmSelected = isLmPickup || isLmDropoff;

                    return (
                      <Pressable
                        key={idx}
                        onPress={() => {
                          appHaptics.light();
                          if (selectingField === "pickup") {
                            if (pickupPoint?.pointNumber !== point.pointNumber) {
                              setPickupPoint(point);
                            }
                            setPickupLandmark(landmark);
                            setSelectingField("dropoff");
                          } else {
                            if (dropoffPoint?.pointNumber !== point.pointNumber) {
                              setDropoffPoint(point);
                            }
                            setDropoffLandmark(landmark);
                          }
                          setExpandedBarangay(null);
                        }}
                        style={[
                          styles.substopRow,
                          isLmSelected
                            ? {
                                backgroundColor: standardSelection ? colors.surface2 : isSameBarangay
                                  ? isLofi
                                    ? "rgba(109, 40, 217, 0.12)"
                                    : "rgba(139, 92, 246, 0.15)"
                                  : isLofi
                                  ? "rgba(22, 112, 90, 0.12)"
                                  : "rgba(16, 185, 129, 0.15)",
                                borderColor: standardSelection ? colors.text : isSameBarangay
                                  ? isLofi
                                    ? "#6D28D9"
                                    : "rgba(139, 92, 246, 0.3)"
                                  : isLofi
                                  ? colors.success
                                  : "rgba(16, 185, 129, 0.3)",
                              }
                            : null,
                        ]}
                      >
                        <View
                          style={[
                            styles.miniDot,
                            {
                              backgroundColor: isLmSelected
                                ? isSameBarangay
                                  ? isLofi
                                    ? "#6D28D9"
                                    : "#8B5CF6"
                                  : isLofi
                                  ? colors.success
                                  : "#10B981"
                                : colors.muted,
                            },
                          ]}
                        />
                        <Text
                          style={[
                            styles.substopName,
                            isLmSelected
                              ? {
                                  color: standardSelection ? colors.text : isSameBarangay
                                    ? isLofi
                                      ? "#6D28D9"
                                      : "#A78BFA"
                                    : isLofi
                                    ? colors.success
                                    : "#34D399",
                                  fontWeight: "600",
                                }
                              : null,
                          ]}
                        >
                          {landmark}
                        </Text>
                        {isLmPickup && !isLmDropoff ? (
                          <View style={styles.substopTag}>
                            <Text style={styles.substopTagText}>PICKUP</Text>
                          </View>
                        ) : null}
                        {isLmDropoff && !isLmPickup ? (
                          <View style={styles.substopTag}>
                            <Text style={styles.substopTagText}>DROP-OFF</Text>
                          </View>
                        ) : null}
                        {isLmPickup && isLmDropoff ? (
                          <View
                            style={[
                              styles.substopTag,
                              {
                                backgroundColor: isLofi
                                  ? "rgba(109, 40, 217, 0.12)"
                                  : "rgba(139, 92, 246, 0.2)",
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.substopTagText,
                                { color: isLofi ? "#6D28D9" : "#A78BFA" },
                              ]}
                            >
                              BOTH
                            </Text>
                          </View>
                        ) : null}
                      </Pressable>
                    );
                  })}
                </View>
              ) : null}
            </View>
          );
        })}
      </ScrollView>
    </>
  );
}
