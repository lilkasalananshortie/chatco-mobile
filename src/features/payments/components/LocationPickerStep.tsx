import { Modal, Pressable, SafeAreaView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "../../../core/theme/ThemeProvider";
import type { FarePoint } from "../../../core/domain/types";
import type { FareInfo, SelectedPaymentMethod, Step } from "../payment-types";
import { LocationBottomBar } from "./LocationBottomBar";
import { LocationPointsList } from "./LocationPointsList";
import { LocationSelectorCards } from "./LocationSelectorCards";

export interface LocationPickerStepProps {
  visible: boolean;
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
  isAutoPickup: boolean;
  setIsAutoPickup: (auto: boolean) => void;
  expandedBarangay: number | null;
  setExpandedBarangay: (brgy: number | null) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  filteredPoints: FarePoint[];
  fareInfo: FareInfo | null;
  isGroupMode: boolean;
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
  handleClose: () => void;
  setStep: (step: Step) => void;
}

export function LocationPickerStep({
  visible,
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
  isAutoPickup,
  setIsAutoPickup,
  expandedBarangay,
  setExpandedBarangay,
  searchQuery,
  setSearchQuery,
  filteredPoints,
  fareInfo,
  isGroupMode,
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
  handleClose,
  setStep,
}: LocationPickerStepProps) {
  const { colors } = useAppTheme();

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={handleClose}>
      <SafeAreaView style={styles.fullscreenContainer}>
        {/* Top Bar: Back, Title, Method Badge, Close */}
        <View style={styles.topBar}>
          <View style={styles.topBarLeft}>
            <Pressable onPress={() => setStep("method")} style={styles.iconButton} accessibilityLabel="Back">
              <Ionicons name="chevron-back" size={20} color={colors.text} />
            </Pressable>
            <Text style={styles.topBarTitle}>Select Location</Text>
          </View>
          <View style={styles.topBarRight}>
            <View
              style={[
                styles.methodBadge,
                selectedMethod === "GCash"
                  ? styles.methodBadgeBlue
                  : selectedMethod === "Voucher"
                  ? styles.methodBadgeViolet
                  : styles.methodBadgeGreen,
              ]}
            >
              <Text
                style={[
                  styles.methodBadgeText,
                  selectedMethod === "GCash"
                    ? styles.methodBadgeTextBlue
                    : selectedMethod === "Voucher"
                    ? styles.methodBadgeTextViolet
                    : styles.methodBadgeTextGreen,
                ]}
              >
                {selectedMethod}
              </Text>
            </View>
            <Pressable onPress={handleClose} style={styles.iconButton} accessibilityLabel="Close">
              <Ionicons name="close" size={20} color={colors.muted} />
            </Pressable>
          </View>
        </View>

        {/* Location Selector Cards Header Section */}
        <LocationSelectorCards
          styles={styles}
          pickupPoint={pickupPoint}
          dropoffPoint={dropoffPoint}
          pickupLandmark={pickupLandmark}
          dropoffLandmark={dropoffLandmark}
          selectingField={selectingField}
          setSelectingField={setSelectingField}
          isAutoPickup={isAutoPickup}
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
          setIsAutoPickup={setIsAutoPickup}
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
          pickupDotColor={pickupDotColor}
          dropoffDotColor={dropoffDotColor}
          isGroupMode={isGroupMode}
          fareInfo={fareInfo}
          setStep={setStep}
        />
      </SafeAreaView>
    </Modal>
  );
}
