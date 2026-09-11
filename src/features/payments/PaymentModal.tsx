import { useMemo } from "react";
import { Modal, View } from "react-native";
import type { Shift } from "../../core/domain/types";
import { useAppTheme } from "../../core/theme/ThemeProvider";
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

export interface PaymentModalProps {
  visible: boolean;
  shift: Shift;
  isOnline: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export function PaymentModal({
  visible,
  shift,
  isOnline,
  onClose,
  onSaved,
}: PaymentModalProps) {
  const { colors, isLofi } = useAppTheme();
  const styles = useMemo(() => createPaymentStyles(colors, isLofi), [colors, isLofi]);

  const flow = usePaymentFlow({
    visible,
    shift,
    isOnline,
    onClose,
    onSaved,
    colors,
    isLofi,
  });

  if (!visible) return null;

  // STEP: select (TRUE FULLSCREEN LOCATION PICKER 1:1 WITH WEB)
  if (flow.step === "select") {
    return (
      <LocationPickerStep
        visible={visible}
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
        isAutoPickup={flow.isAutoPickup}
        setIsAutoPickup={flow.setIsAutoPickup}
        expandedBarangay={flow.expandedBarangay}
        setExpandedBarangay={flow.setExpandedBarangay}
        searchQuery={flow.searchQuery}
        setSearchQuery={flow.setSearchQuery}
        filteredPoints={flow.filteredPoints}
        fareInfo={flow.fareInfo}
        isGroupMode={flow.isGroupMode}
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
    <Modal visible={visible} transparent animationType="fade" onRequestClose={flow.handleClose}>
      <View style={styles.modalBackdrop}>
        {flow.step === "method" ? (
          <MethodSelectionStep
            styles={styles}
            isOnline={isOnline}
            onSelectMethod={(method) => {
              flow.setSelectedMethod(method);
              flow.setStep("select");
            }}
            onClose={flow.handleClose}
          />
        ) : null}

        {flow.step === "passengers" ? (
          <PassengerGroupStep
            styles={styles}
            selectedMethod={flow.selectedMethod}
            pickupPoint={flow.pickupPoint}
            dropoffPoint={flow.dropoffPoint}
            groupCounts={flow.groupCounts}
            setGroupCounts={flow.setGroupCounts}
            groupEnteredCount={flow.groupEnteredCount}
            groupGrossFare={flow.groupGrossFare}
            groupDiscount={flow.groupDiscount}
            groupTotalFare={flow.groupTotalFare}
            fareInfo={flow.fareInfo}
            isInitiatingGcash={flow.isInitiatingGcash}
            handleConfirmPayment={flow.handleConfirmPayment}
            setStep={flow.setStep}
          />
        ) : null}

        {flow.step === "confirm" ? (
          <PaymentConfirmationStep
            styles={styles}
            selectedMethod={flow.selectedMethod}
            pickupPoint={flow.pickupPoint}
            pickupLandmark={flow.pickupLandmark}
            dropoffPoint={flow.dropoffPoint}
            dropoffLandmark={flow.dropoffLandmark}
            commuterType={flow.commuterType}
            isGroupMode={flow.isGroupMode}
            groupPassengerCount={flow.groupPassengerCount}
            groupTotalFare={flow.groupTotalFare}
            fareInfo={flow.fareInfo}
            voucherCode={flow.voucherCode}
            setVoucherCode={flow.setVoucherCode}
            isInitiatingGcash={flow.isInitiatingGcash}
            pickupBadgeText={flow.pickupBadgeText}
            dropoffBadgeText={flow.dropoffBadgeText}
            handleConfirmPayment={flow.handleConfirmPayment}
            setStep={flow.setStep}
          />
        ) : null}

        {flow.step === "qr_code" && flow.gcashInitiation ? (
          <GcashQrStep
            styles={styles}
            gcashInitiation={flow.gcashInitiation}
            pickupPoint={flow.pickupPoint}
            dropoffPoint={flow.dropoffPoint}
            gcashStatus={flow.gcashStatus}
            gcashError={flow.gcashError}
            qrSecondsLeft={flow.qrSecondsLeft}
            isCancellingGcash={flow.isCancellingGcash}
            handleSimulatePayment={flow.handleSimulatePayment}
            handleCancelGcash={flow.handleCancelGcash}
            stopPolling={flow.stopPolling}
            setStep={flow.setStep}
          />
        ) : null}

        {flow.step === "processing" ? (
          <PaymentProcessingStep styles={styles} selectedMethod={flow.selectedMethod} />
        ) : null}

        {flow.step === "success" ? (
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

        {flow.step === "failed" ? (
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
    </Modal>
  );
}
