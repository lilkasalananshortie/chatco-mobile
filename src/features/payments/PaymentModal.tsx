import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, Modal, StyleSheet, View, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text } from "../../shared/ui/BrandText";
import type { Shift } from "../../core/domain/types";
import { usePaymentTheme } from "../../core/theme/payment-theme";
import { createPaymentStyles } from "./payment-styles";
import { usePaymentFlow } from "./hooks/usePaymentFlow";
import { MethodSelectionStep } from "./components/MethodSelectionStep";
import { LocationPickerStep } from "./components/LocationPickerStep";
import { PassengerGroupStep } from "./components/PassengerGroupStep";
import { PaymentConfirmationStep } from "./components/PaymentConfirmationStep";
import { GcashQrStep } from "./components/GcashQrStep";
import { PaymentProcessingStep } from "./components/PaymentProcessingStep";
import { PaymentSuccessStep } from "./components/PaymentSuccessStep";
import { PaymentFailedStep } from "./components/PaymentFailedStep";
import { TransactionHistoryModal } from "../dashboard/TransactionHistoryModal";
import { loadTripCycleState, type TripCycleState } from "../../core/utils/trip-cycle-tracker";
import { useReducedMotion, useWebEntrance } from "../../shared/ui/useWebEntrance";

export interface PaymentModalProps {
  visible: boolean;
  shift: Shift;
  isOnline: boolean;
  onClose: () => void;
  onSaved: () => void;
  blockedReason?: string | null;
}

export function PaymentModal({
  visible,
  shift,
  isOnline,
  onClose,
  onSaved,
  blockedReason,
}: PaymentModalProps) {
  const { colors, isLofi, isLowFidelity } = usePaymentTheme();
  const { width, height } = useWindowDimensions();
  const backdropEntrance = useWebEntrance(visible, isLowFidelity, 0, 200);
  const reduceMotion = useReducedMotion();
  const exitProgress = useRef(new Animated.Value(0)).current;
  const backdropExit = useRef(new Animated.Value(0)).current;
  const closing = useRef(false);
  const centeredPanel = width >= 640;
  const [showHistory, setShowHistory] = useState(false);
  const [historyTrips, setHistoryTrips] = useState<TripCycleState | null>(null);
  const styles = useMemo(() => createPaymentStyles(colors, isLofi, isLowFidelity), [colors, isLofi, isLowFidelity]);

  const flow = usePaymentFlow({
    visible,
    shift,
    isOnline,
    onClose,
    onSaved,
    colors,
    isLofi,
  });
  const entrance = useWebEntrance(visible, isLowFidelity, height, 320, flow.step);
  const exitOpacity = exitProgress.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });
  const backdropExitOpacity = backdropExit.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });

  useEffect(() => {
    if (visible) {
      closing.current = false;
      exitProgress.setValue(0);
      backdropExit.setValue(0);
    }
  }, [visible, exitProgress, backdropExit]);

  const requestClose = () => {
    if (closing.current) return;
    if (flow.step === "processing") return;
    if (width < 1280 || isLowFidelity || reduceMotion) {
      flow.handleClose();
      return;
    }
    closing.current = true;
    Animated.parallel([
      Animated.timing(exitProgress, { toValue: 1, duration: 220, easing: Easing.in(Easing.quad), useNativeDriver: true }),
      Animated.timing(backdropExit, { toValue: 1, duration: 180, easing: Easing.in(Easing.quad), useNativeDriver: true }),
    ]).start(({ finished }) => {
      if (finished) flow.handleClose();
      else closing.current = false;
    });
  };

  useEffect(() => {
    if (!visible) setShowHistory(false);
  }, [visible]);

  useEffect(() => {
    if (visible && blockedReason && flow.step !== "method") onClose();
  }, [visible, blockedReason, flow.step, onClose]);

  useEffect(() => {
    if (!visible || !showHistory) return;
    let active = true;
    setHistoryTrips(null);
    void loadTripCycleState(shift.shiftId, shift.timeIn).then(state => { if (active) setHistoryTrips(state); }).catch(() => undefined);
    return () => { active = false; };
  }, [visible, showHistory, shift.shiftId, shift.timeIn]);

  if (!visible) return null;
  if (showHistory) return <TransactionHistoryModal visible shiftId={shift.shiftId} tripCycleState={historyTrips} onClose={() => { setShowHistory(false); onClose(); }} />;
  const displayStep = flow.step === "qr_code" && !flow.gcashInitiation ? "method" : flow.step;

  // STEP: select (TRUE FULLSCREEN LOCATION PICKER 1:1 WITH WEB)
  if (displayStep === "select") {
    return (
      <LocationPickerStep
        visible={visible}
        fareNotice={flow.fareNotice}
        styles={styles}
        selectedMethod={flow.selectedMethod}
        pickupPoint={flow.pickupPoint}
        setPickupPoint={flow.setPickupPoint}
        pickupLandmark={flow.pickupLandmark}
        setPickupLandmark={flow.setPickupLandmark}
        dropoffPoint={flow.dropoffPoint}
        setDropoffPoint={flow.setDropoffPoint}
        dropoffLandmark={flow.dropoffLandmark}
        setDropoffLandmark={flow.setDropoffLandmark}
        selectingField={flow.selectingField}
        setSelectingField={flow.setSelectingField}
        expandedBarangay={flow.expandedBarangay}
        setExpandedBarangay={flow.setExpandedBarangay}
        searchQuery={flow.searchQuery}
        setSearchQuery={flow.setSearchQuery}
        filteredPoints={flow.filteredPoints}
        fareInfo={flow.fareInfo}
        isGroupMode={flow.isGroupMode}
        setIsGroupMode={flow.setIsGroupMode}
        commuterType={flow.commuterType}
        setCommuterType={flow.setCommuterType}
        isSameBarangay={flow.isSameBarangay}
        pickupDotColor={flow.pickupDotColor}
        dropoffDotColor={flow.dropoffDotColor}
        pickupBadgeBg={flow.pickupBadgeBg}
        pickupBadgeText={flow.pickupBadgeText}
        dropoffBadgeBg={flow.dropoffBadgeBg}
        dropoffBadgeText={flow.dropoffBadgeText}
        clearPickup={flow.clearPickup}
        clearDropoff={flow.clearDropoff}
        swapLocations={flow.swapLocations}
        onBack={flow.handleBackToMethods}
        handleClose={requestClose}
        setStep={flow.setStep}
      />
    );
  }

  // MODAL OVERLAY FOR OTHER STEPS
  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={requestClose}>
      <SafeAreaView edges={["top", "bottom"]} style={[styles.modalBackdrop, displayStep === "method" && !centeredPanel ? { padding: 0, alignItems: "stretch" } : null, { justifyContent: centeredPanel || displayStep === "qr_code" ? "center" : "flex-end", backgroundColor: "transparent" }]}>
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: displayStep === "qr_code" ? "rgba(0,0,0,0.7)" : "rgba(0,0,0,0.6)" }, backdropEntrance, { opacity: Animated.multiply(backdropEntrance.opacity, backdropExitOpacity) }]} />
        {displayStep !== "method" && flow.fareNotice ? <Text accessibilityLiveRegion="polite" style={{ color: colors.text, backgroundColor: colors.surface, padding: 12, marginBottom: 8 }}>{flow.fareNotice}</Text> : null}
        <Animated.View style={[{ width: "100%", alignItems: "center" }, entrance, width >= 1280 ? { opacity: Animated.multiply(entrance.opacity, exitOpacity), transform: [...entrance.transform, { translateY: exitProgress.interpolate({ inputRange: [0, 1], outputRange: [0, 6] }) }, { scale: exitProgress.interpolate({ inputRange: [0, 1], outputRange: [1, 0.95] }) }] } : null]}>
        {displayStep === "method" ? (
          <MethodSelectionStep
            styles={styles}
            fullBottomSheet={!centeredPanel}
            isOnline={isOnline}
            fareReady={flow.fareReady}
            fareLoading={flow.fareLoading}
            fareLoadFailed={flow.fareLoadFailed}
            fareNotice={flow.fareNotice}
            onRetryFareLoad={flow.retryFareLoad}
            blockedReason={blockedReason}
            onShowHistory={() => { flow.stopPolling(); setShowHistory(true); }}
            onSelectMethod={(method) => {
              if (blockedReason || !flow.fareReady) return;
              flow.stopPolling();
              flow.setSelectedMethod(method);
              flow.setStep("select");
            }}
            onClose={requestClose}
          />
        ) : null}

        {displayStep === "passengers" ? (
          <PassengerGroupStep
            styles={styles}
            selectedMethod={flow.selectedMethod}
            pickupPoint={flow.pickupPoint}
            dropoffPoint={flow.dropoffPoint}
            groupCounts={flow.groupCounts}
            setGroupCounts={flow.setGroupCounts}
            groupEnteredCount={flow.groupEnteredCount}
            groupDiscount={flow.groupDiscount}
            groupTotalFare={flow.groupTotalFare}
            fareInfo={flow.fareInfo}
            isInitiatingGcash={flow.isInitiatingGcash}
            handleConfirmPayment={flow.handleConfirmPayment}
            setStep={flow.setStep}
          />
        ) : null}

        {displayStep === "confirm" ? (
          <PaymentConfirmationStep
            selectedMethod={flow.selectedMethod}
            isGroupMode={flow.isGroupMode}
            groupTotalFare={flow.groupTotalFare}
            groupGrossFare={flow.groupGrossFare}
            groupDiscount={flow.groupDiscount}
            groupPassengers={flow.groupPassengers}
            commuterType={flow.commuterType}
            pickupLandmark={flow.pickupLandmark}
            dropoffLandmark={flow.dropoffLandmark}
            fareInfo={flow.fareInfo}
            isInitiatingGcash={flow.isInitiatingGcash}
            handleConfirmPayment={flow.handleConfirmPayment}
            onBack={() => flow.setStep(flow.isGroupMode ? "passengers" : "select")}
          />
        ) : null}

        {displayStep === "qr_code" && flow.gcashInitiation ? (
          <GcashQrStep
            styles={styles}
            gcashInitiation={flow.gcashInitiation}
            pickupPoint={flow.pickupPoint}
            dropoffPoint={flow.dropoffPoint}
            gcashStatus={flow.gcashStatus}
            gcashError={flow.gcashError}
            qrSecondsLeft={flow.qrSecondsLeft}
            isCancellingGcash={flow.isCancellingGcash}
            handleCancelGcash={flow.handleCancelGcash}
            stopPolling={flow.stopPolling}
            setStep={flow.setStep}
          />
        ) : null}

        {displayStep === "processing" ? (
          <PaymentProcessingStep styles={styles} selectedMethod={flow.selectedMethod} />
        ) : null}

        {displayStep === "success" ? (
          <PaymentSuccessStep
            styles={styles}
            selectedMethod={flow.selectedMethod}
            receiptTransactions={flow.receiptTransactions}
            gcashInitiation={flow.gcashInitiation}
            isGroupMode={flow.isGroupMode}
            groupPassengerCount={flow.groupPassengerCount}
            groupGrossFare={flow.groupGrossFare}
            groupTotalFare={flow.groupTotalFare}
            groupPassengers={flow.groupPassengers}
            fareInfo={flow.fareInfo}
            commuterType={flow.commuterType}
            pickupPoint={flow.pickupPoint}
            pickupLandmark={flow.pickupLandmark}
            dropoffPoint={flow.dropoffPoint}
            dropoffLandmark={flow.dropoffLandmark}
            pickupBadgeText={flow.pickupBadgeText}
            dropoffBadgeText={flow.dropoffBadgeText}
            showReceiptDetails={flow.showReceiptDetails}
            setShowReceiptDetails={flow.setShowReceiptDetails}
            receiptSettings={flow.receiptSettings}
            shift={shift}
            cashReceiptToken={flow.cashReceiptToken}
            printerStatus={flow.printerStatus}
            pairedPrinterName={flow.pairedPrinterName}
            handlePrint={flow.handlePrint}
            handleClose={requestClose}
          />
        ) : null}

        {displayStep === "failed" ? (
          <PaymentFailedStep
            styles={styles}
            gcashError={flow.gcashError}
            selectedMethod={flow.selectedMethod}
            isGroupMode={flow.isGroupMode}
            handleClose={requestClose}
            setStep={flow.setStep}
          />
        ) : null}
        </Animated.View>
      </SafeAreaView>
    </Modal>
  );
}
