import { useEffect, useMemo, useState } from "react";
import { Modal, Text, View, useWindowDimensions } from "react-native";
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
  const { width } = useWindowDimensions();
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
        handleClose={flow.handleClose}
        setStep={flow.setStep}
      />
    );
  }

  // MODAL OVERLAY FOR OTHER STEPS
  return (
    <Modal visible={visible} transparent animationType={isLowFidelity ? "none" : "fade"} onRequestClose={flow.handleClose}>
      <View style={[styles.modalBackdrop, displayStep === "method" && !centeredPanel ? { padding: 0, alignItems: "stretch" } : null, { justifyContent: centeredPanel || displayStep === "qr_code" ? "center" : "flex-end", backgroundColor: displayStep === "qr_code" ? "rgba(0,0,0,0.7)" : "rgba(0,0,0,0.6)" }]}>
        {displayStep !== "method" && flow.fareNotice ? <Text accessibilityLiveRegion="polite" style={{ color: colors.text, backgroundColor: colors.surface, padding: 12, marginBottom: 8 }}>{flow.fareNotice}</Text> : null}
        <View style={{ width: "100%", alignItems: "center" }}>
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
            onClose={flow.handleClose}
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
            fareInfo={flow.fareInfo}
            isInitiatingGcash={flow.isInitiatingGcash}
            handleConfirmPayment={flow.handleConfirmPayment}
            onClose={flow.handleClose}
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
            handleClose={flow.handleClose}
          />
        ) : null}

        {displayStep === "failed" ? (
          <PaymentFailedStep
            styles={styles}
            gcashError={flow.gcashError}
            selectedMethod={flow.selectedMethod}
            isGroupMode={flow.isGroupMode}
            handleClose={flow.handleClose}
            setStep={flow.setStep}
          />
        ) : null}
        </View>
      </View>
    </Modal>
  );
}
