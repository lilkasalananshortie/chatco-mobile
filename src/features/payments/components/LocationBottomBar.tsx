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
  fareInfo,
  setStep,
}: LocationBottomBarProps) {
  const { colors } = useAppTheme();
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
              {isGroupMode ? "Review Transaction" : `Pay ${formatCurrency(fareInfo.finalFare)} with Cash`}
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
