import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, Modal, Platform, Text, View, useWindowDimensions } from "react-native";
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
  const { colors, isLofi } = usePaymentTheme();
  const { width } = useWindowDimensions();
  const centeredPanel = width >= 640;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const panelProgress = useRef(new Animated.Value(1)).current;
  const [panelHeight, setPanelHeight] = useState(0);
  const useNativeDriver = Platform.OS !== "web";
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

  useEffect(() => {
    if (!visible || flow.step === "select" || panelHeight <= 0) return;
    backdropOpacity.setValue(0);
    panelProgress.setValue(1);
    const animation = Animated.parallel([
      Animated.timing(backdropOpacity, {
        toValue: 1,
        duration: 200,
        easing: Easing.out(Easing.quad),
        useNativeDriver,
      }),
      Animated.timing(panelProgress, {
        toValue: 0,
        duration: 320,
        easing: Easing.bezier(0.16, 1, 0.3, 1),
        useNativeDriver,
      }),
    ]);
    animation.start();
    return () => animation.stop();
  }, [visible, flow.step, panelHeight, backdropOpacity, panelProgress, useNativeDriver]);

  if (!visible) return null;

  // STEP: select (TRUE FULLSCREEN LOCATION PICKER 1:1 WITH WEB)
  if (flow.step === "select") {
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
    <Modal visible={visible} transparent animationType="none" onRequestClose={flow.handleClose}>
      <Animated.View style={[styles.modalBackdrop, flow.step === "method" && !centeredPanel ? { padding: 0, alignItems: "stretch" } : null, { justifyContent: centeredPanel || flow.step === "qr_code" ? "center" : "flex-end", backgroundColor: flow.step === "qr_code" ? "rgba(0,0,0,0.7)" : "rgba(0,0,0,0.6)", opacity: backdropOpacity }]}>
        {flow.fareNotice ? <Text accessibilityLiveRegion="polite" style={{ color: colors.text, backgroundColor: colors.surface, padding: 12, marginBottom: 8 }}>{flow.fareNotice}</Text> : null}
        <Animated.View
          onLayout={(event) => {
            const nextHeight = event.nativeEvent.layout.height;
            setPanelHeight(current => Math.abs(current - nextHeight) > 1 ? nextHeight : current);
          }}
          style={{ width: "100%", alignItems: "center", opacity: panelProgress.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }), transform: [{ translateY: panelProgress.interpolate({ inputRange: [0, 1], outputRange: [0, panelHeight] }) }] }}
        >
        {flow.step === "method" ? (
          <MethodSelectionStep
            styles={styles}
            fullBottomSheet={!centeredPanel}
            isOnline={isOnline}
            onSelectMethod={(method) => {
              if (!flow.fareReady) return;
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
            groupDiscount={flow.groupDiscount}
            groupPassengers={flow.groupPassengers}
            fareInfo={flow.fareInfo}
            isInitiatingGcash={flow.isInitiatingGcash}
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
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}
