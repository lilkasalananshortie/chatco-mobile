import { Modal, Pressable, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text } from "../../../shared/ui/BrandText";
import { Ionicons } from "@expo/vector-icons";
import { usePaymentTheme } from "../../../core/theme/payment-theme";
import type { CommuterType, FarePoint } from "../../../core/domain/types";
import type { FareInfo, SelectedPaymentMethod, Step } from "../payment-types";
import { LocationBottomBar } from "./LocationBottomBar";
import { LocationPointsList } from "./LocationPointsList";
import { LocationSelectorCards } from "./LocationSelectorCards";

export interface LocationPickerStepProps {
  visible: boolean;
  fareNotice?: string;
  styles: any;
  selectedMethod: SelectedPaymentMethod | null;
  pickupPoint: FarePoint | null;
  setPickupPoint: (point: FarePoint | null) => void;
  pickupLandmark: string | null;
  setPickupLandmark: (landmark: string | null) => void;
  dropoffPoint: FarePoint | null;
  setDropoffPoint: (point: FarePoint | null) => void;
  dropoffLandmark: string | null;
  setDropoffLandmark: (landmark: string | null) => void;
  selectingField: "pickup" | "dropoff" | null;
  setSelectingField: (field: "pickup" | "dropoff") => void;
  expandedBarangay: number | null;
  setExpandedBarangay: (brgy: number | null) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  filteredPoints: FarePoint[];
  fareInfo: FareInfo | null;
  isGroupMode: boolean;
  setIsGroupMode: (group: boolean) => void;
  commuterType: CommuterType;
  setCommuterType: (type: CommuterType) => void;
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
  onBack: () => void;
  handleClose: () => void;
  setStep: (step: Step) => void;
}

export function LocationPickerStep({
  visible,
  fareNotice,
  styles,
  selectedMethod,
  pickupPoint,
  setPickupPoint,
  pickupLandmark,
  setPickupLandmark,
  dropoffPoint,
  setDropoffPoint,
  dropoffLandmark,
  setDropoffLandmark,
  selectingField,
  setSelectingField,
  expandedBarangay,
  setExpandedBarangay,
  searchQuery,
  setSearchQuery,
  filteredPoints,
  fareInfo,
  isGroupMode,
  setIsGroupMode,
  commuterType,
  setCommuterType,
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
  onBack,
  handleClose,
  setStep,
}: LocationPickerStepProps) {
  const { colors } = usePaymentTheme();

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={handleClose}>
      <SafeAreaView style={styles.fullscreenContainer}>
        <View style={{ flex: 1, width: "100%", maxWidth: 512, alignSelf: "center" }}>
        {/* Top Bar: Back, Title, Method Badge, Close */}
        <View style={styles.topBar}>
          <View style={styles.topBarLeft}>
            <Pressable accessibilityRole="button" onPress={onBack} style={styles.iconButton} accessibilityLabel="Back to payment methods">
              <Ionicons name="chevron-back" size={20} color={colors.text} />
            </Pressable>
            <Text numberOfLines={1} style={styles.topBarTitle}>Select Location</Text>
          </View>
          <View style={styles.topBarRight}>
            <View
              style={[
                styles.methodBadge,
                selectedMethod === "GCash" || selectedMethod === "Cash"
                  ? styles.methodBadgeBlue
                  : styles.methodBadgeGreen,
                { backgroundColor: "transparent", flexDirection: "row", alignItems: "center", gap: 6 },
              ]}
            >
              <View style={{ width: 5, height: 5, backgroundColor: colors.primaryLight }} />
              <Text
                style={[
                  styles.methodBadgeText,
                  selectedMethod === "GCash" || selectedMethod === "Cash"
                    ? styles.methodBadgeTextBlue
                    : styles.methodBadgeTextGreen,
                ]}
              >
                {selectedMethod}
              </Text>
            </View>
            <Pressable accessibilityRole="button" onPress={handleClose} style={styles.iconButton} accessibilityLabel="Close payment">
              <Ionicons name="close" size={20} color={colors.muted} />
            </Pressable>
          </View>
        </View>

        {fareNotice ? <Text accessibilityLiveRegion="polite" style={{ color: colors.text, paddingHorizontal: 16, paddingVertical: 10 }}>{fareNotice}</Text> : null}
        {/* Location Selector Cards Header Section */}
        <LocationSelectorCards
          styles={styles}
          selectedMethod={selectedMethod}
          isGroupMode={isGroupMode}
          setIsGroupMode={setIsGroupMode}
          commuterType={commuterType}
          setCommuterType={setCommuterType}
          pickupPoint={pickupPoint}
          dropoffPoint={dropoffPoint}
          pickupLandmark={pickupLandmark}
          dropoffLandmark={dropoffLandmark}
          selectingField={selectingField}
          setSelectingField={setSelectingField}
          isSameBarangay={isSameBarangay}
          pickupDotColor={pickupDotColor}
          dropoffDotColor={dropoffDotColor}
          pickupBadgeBg={pickupBadgeBg}
          pickupBadgeText={pickupBadgeText}
          dropoffBadgeBg={dropoffBadgeBg}
          dropoffBadgeText={dropoffBadgeText}
          clearPickup={clearPickup}
          clearDropoff={clearDropoff}
          swapLocations={swapLocations}
        />

        {/* Search & Points List */}
        <LocationPointsList
          styles={styles}
          selectedMethod={selectedMethod}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          selectingField={selectingField}
          filteredPoints={filteredPoints}
          pickupPoint={pickupPoint}
          dropoffPoint={dropoffPoint}
          pickupLandmark={pickupLandmark}
          dropoffLandmark={dropoffLandmark}
          expandedBarangay={expandedBarangay}
          setExpandedBarangay={setExpandedBarangay}
          isSameBarangay={isSameBarangay}
          setPickupPoint={setPickupPoint}
          setPickupLandmark={setPickupLandmark}
          setSelectingField={setSelectingField}
          setDropoffPoint={setDropoffPoint}
          setDropoffLandmark={setDropoffLandmark}
        />

        {/* Bottom Action Area */}
        <LocationBottomBar
          styles={styles}
          selectedMethod={selectedMethod}
          pickupPoint={pickupPoint}
          dropoffPoint={dropoffPoint}
          pickupLandmark={pickupLandmark}
          dropoffLandmark={dropoffLandmark}
          pickupDotColor={selectedMethod === "Cash" || selectedMethod === "GCash" ? (isSameBarangay ? "#8B5CF6" : "#10B981") : pickupDotColor}
          dropoffDotColor={selectedMethod === "Cash" || selectedMethod === "GCash" ? (isSameBarangay ? "#8B5CF6" : "#F97316") : dropoffDotColor}
          isGroupMode={isGroupMode}
          fareInfo={fareInfo}
          setStep={setStep}
        />
        </View>
      </SafeAreaView>
    </Modal>
  );
}
