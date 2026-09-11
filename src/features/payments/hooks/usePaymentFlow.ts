import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert } from "react-native";
import * as Location from "expo-location";
import { api } from "../../../core/api/chatco-api";
import type {
  CommuterType,
  FareConfig,
  FarePoint,
  ReceiptSettings,
  Shift,
  Transaction,
} from "../../../core/domain/types";
import { appHaptics } from "../../../core/utils/haptics";
import type {
  FareInfo,
  GroupPassengerType,
  SelectedPaymentMethod,
  Step,
} from "../payment-types";
import {
  DEFAULT_FARE_CONFIG,
  findNearestPoint,
  formatCurrency,
  getBarangaysTraversed,
  getFareBetween,
  selectedPointName,
  subDropoffPoints,
} from "../fare-helpers";
import { useGcashPayment } from "./useGcashPayment";
import { usePaymentPrinter } from "./usePaymentPrinter";

export interface UsePaymentFlowProps {
  visible: boolean;
  shift: Shift;
  isOnline: boolean;
  onClose: () => void;
  onSaved: () => void;
  colors: any;
  isLofi: boolean;
}

export function usePaymentFlow({
  visible,
  shift,
  isOnline,
  onClose,
  onSaved,
  colors,
  isLofi,
}: UsePaymentFlowProps) {
  const [step, setStep] = useState<Step>("method");
  const [selectedMethod, setSelectedMethod] = useState<SelectedPaymentMethod | null>(null);
  const [pointAreas, setPointAreas] = useState<FarePoint[]>([]);
  const [fareConfig, setFareConfig] = useState<FareConfig>(DEFAULT_FARE_CONFIG);
  const [pickupPoint, setPickupPoint] = useState<FarePoint | null>(null);
  const [isAutoPickup, setIsAutoPickup] = useState(false);
  const [dropoffPoint, setDropoffPoint] = useState<FarePoint | null>(null);
  const [pickupLandmark, setPickupLandmark] = useState<string | null>(null);
  const [dropoffLandmark, setDropoffLandmark] = useState<string | null>(null);
  const [commuterType, setCommuterType] = useState<CommuterType>("REGULAR");
  const [isGroupMode, setIsGroupMode] = useState(false);
  const [groupCounts, setGroupCounts] = useState<Record<GroupPassengerType, number>>({
    REGULAR: 0,
    SENIOR_CITIZEN: 0,
    STUDENT: 0,
    PWD: 0,
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [selectingField, setSelectingField] = useState<"pickup" | "dropoff" | null>("pickup");
  const [expandedBarangay, setExpandedBarangay] = useState<number | null>(null);

  // Voucher & Receipt state
  const [voucherCode, setVoucherCode] = useState("");
  const [cashReceiptToken, setCashReceiptToken] = useState<string | null>(null);
  const [receiptTransactions, setReceiptTransactions] = useState<Transaction[]>([]);
  const [receiptSettings, setReceiptSettings] = useState<ReceiptSettings | null>(null);
  const [showReceiptDetails, setShowReceiptDetails] = useState(false);

  // Load fare matrix & receipt settings
  useEffect(() => {
    if (!visible) return;

    void api
      .fareMatrix()
      .then((matrix) => {
        setPointAreas(matrix.points);
        setFareConfig(matrix.config);

        if (!pickupPoint && matrix.points.length > 0) {
          void (async () => {
            try {
              let loc = await Location.getLastKnownPositionAsync();
              if (!loc) {
                const { status } = await Location.getForegroundPermissionsAsync();
                if (status === "granted") {
                  loc = await Location.getCurrentPositionAsync({
                    accuracy: Location.Accuracy.Balanced,
                  });
                }
              }
              if (loc?.coords) {
                const nearest = findNearestPoint(loc.coords.latitude, loc.coords.longitude, matrix.points);
                if (nearest) {
                  setPickupPoint(nearest);
                  setIsAutoPickup(true);
                  setSelectingField("dropoff");
                }
              }
            } catch {
              // Location unavailable — normal manual selection
            }
          })();
        }
      })
      .catch((err) => {
        gcash.setGcashError(err instanceof Error ? err.message : "Unable to load fare matrix.");
      });

    void api
      .receiptSettings()
      .then(setReceiptSettings)
      .catch(() => undefined);
  }, [visible]);

  const triggerSuccessAlert = useCallback((amount: number, method: string) => {
    Alert.alert(
      "Payment Recorded",
      `Payment of ${formatCurrency(amount)} via ${method} has been recorded successfully.`,
      [{ text: "OK" }],
    );
  }, []);

  // Auto-expand landmark when switching selectingField
  useEffect(() => {
    if (step !== "select") return;
    if (selectingField === "pickup" && pickupPoint && subDropoffPoints(pickupPoint).length > 0) {
      setExpandedBarangay(pickupPoint.pointNumber);
    } else if (selectingField === "dropoff" && dropoffPoint && subDropoffPoints(dropoffPoint).length > 0) {
      setExpandedBarangay(dropoffPoint.pointNumber);
    }
  }, [selectingField, step, pickupPoint, dropoffPoint]);

  const isSameBarangay = !!(
    pickupPoint &&
    dropoffPoint &&
    pickupPoint.pointNumber === dropoffPoint.pointNumber
  );

  const pickupDotColor = isSameBarangay ? (isLofi ? "#6D28D9" : "#8B5CF6") : isLofi ? colors.success : "#10B981";
  const dropoffDotColor = isSameBarangay ? (isLofi ? "#6D28D9" : "#8B5CF6") : isLofi ? colors.success : "#10B981";
  const pickupBadgeBg = isSameBarangay
    ? isLofi
      ? "rgba(109, 40, 217, 0.12)"
      : "rgba(139, 92, 246, 0.1)"
    : isLofi
    ? "rgba(22, 112, 90, 0.12)"
    : "rgba(16, 185, 129, 0.1)";
  const pickupBadgeText = isSameBarangay ? (isLofi ? "#6D28D9" : "#A78BFA") : isLofi ? colors.success : "#34D399";
  const dropoffBadgeBg = isSameBarangay
    ? isLofi
      ? "rgba(109, 40, 217, 0.12)"
      : "rgba(139, 92, 246, 0.1)"
    : isLofi
    ? "rgba(22, 112, 90, 0.12)"
    : "rgba(16, 185, 129, 0.1)";
  const dropoffBadgeText = isSameBarangay ? (isLofi ? "#6D28D9" : "#A78BFA") : isLofi ? colors.success : "#34D399";

  // Fare calculations
  const fareInfo: FareInfo | null = useMemo(() => {
    if (!pickupPoint || !dropoffPoint) return null;

    const isDiscounted = commuterType !== "REGULAR";
    const barangaysTraveled = getBarangaysTraversed(pickupPoint, dropoffPoint);
    const regularFare = getFareBetween(pickupPoint, dropoffPoint, fareConfig, false);
    const discountedFare = getFareBetween(pickupPoint, dropoffPoint, fareConfig, true);
    const finalFare = isDiscounted ? discountedFare : regularFare;
    const discountAmount = regularFare - discountedFare;
    const succeedingCount = Math.max(0, barangaysTraveled - fareConfig.baseBarangayCount);

    return {
      barangaysTraveled,
      regularFare,
      discountedFare,
      finalFare,
      hasDiscount: isDiscounted,
      discountAmount,
      succeedingCount,
      baseBarangayCount: fareConfig.baseBarangayCount,
    };
  }, [pickupPoint, dropoffPoint, commuterType, fareConfig]);

  // Group passengers calculations
  const enteredGroupPassengers = useMemo(() => {
    return (Object.entries(groupCounts) as [GroupPassengerType, number][])
      .filter(([, quantity]) => quantity > 0)
      .map(([type, quantity]) => ({ type, quantity }));
  }, [groupCounts]);

  const groupPassengers = enteredGroupPassengers;
  const groupEnteredCount = enteredGroupPassengers.reduce((sum, row) => sum + row.quantity, 0);
  const groupPassengerCount = groupPassengers.reduce((sum, row) => sum + row.quantity, 0);
  const groupTotalFare = groupPassengers.reduce(
    (sum, row) =>
      sum +
      (row.type === "REGULAR" ? fareInfo?.regularFare ?? 0 : fareInfo?.discountedFare ?? 0) * row.quantity,
    0,
  );
  const groupGrossFare = (fareInfo?.regularFare ?? 0) * groupPassengerCount;
  const groupDiscount = groupGrossFare - groupTotalFare;

  // Filtered points by search query
  const filteredPoints = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return pointAreas;
    return pointAreas.filter(
      (p) =>
        p.name.toLowerCase().includes(query) ||
        p.code.toLowerCase().includes(query) ||
        subDropoffPoints(p).some((l) => l.toLowerCase().includes(query)),
    );
  }, [pointAreas, searchQuery]);

  const clearPickup = () => {
    setPickupPoint(null);
    setPickupLandmark(null);
    setIsAutoPickup(false);
    setSelectingField("pickup");
    if (expandedBarangay === pickupPoint?.pointNumber) {
      setExpandedBarangay(null);
    }
  };

  const clearDropoff = () => {
    setDropoffPoint(null);
    setDropoffLandmark(null);
    setSelectingField("dropoff");
    if (expandedBarangay === dropoffPoint?.pointNumber) {
      setExpandedBarangay(null);
    }
  };

  const swapLocations = () => {
    if (pickupPoint && dropoffPoint) {
      const tmpPoint = pickupPoint;
      const tmpLandmark = pickupLandmark;
      setPickupPoint(dropoffPoint);
      setPickupLandmark(dropoffLandmark);
      setDropoffPoint(tmpPoint);
      setDropoffLandmark(tmpLandmark);
      setIsAutoPickup(false);
    }
  };

  // GCash specialized hook
  const gcash = useGcashPayment({
    visible,
    step,
    setStep,
    isOnline,
    onSaved,
    triggerSuccessAlert,
    pickupPoint,
    pickupLandmark,
    dropoffPoint,
    dropoffLandmark,
    isGroupMode,
    setIsGroupMode,
    groupTotalFare,
    fareConfig,
    groupPassengers,
    setSelectedMethod,
    setReceiptTransactions,
  });

  // Printer specialized hook
  const printer = usePaymentPrinter({
    step,
    shift,
    receiptTransactions,
    receiptSettings,
    gcashInitiation: gcash.gcashInitiation,
    selectedMethod,
    isGroupMode,
    groupPassengerCount,
    groupGrossFare,
    groupTotalFare,
    groupPassengers,
    fareInfo,
    pickupPoint,
    pickupLandmark,
    dropoffPoint,
    dropoffLandmark,
    commuterType,
    cashReceiptToken,
  });

  const handleClose = () => {
    gcash.stopPolling();
    setStep("method");
    setSelectedMethod(null);
    setPickupPoint(null);
    setIsAutoPickup(false);
    setDropoffPoint(null);
    setPickupLandmark(null);
    setDropoffLandmark(null);
    setCommuterType("REGULAR");
    setIsGroupMode(false);
    setGroupCounts({ REGULAR: 0, SENIOR_CITIZEN: 0, STUDENT: 0, PWD: 0 });
    setSearchQuery("");
    setSelectingField("pickup");
    setExpandedBarangay(null);
    gcash.resetGcash();
    setVoucherCode("");
    setCashReceiptToken(null);
    setReceiptTransactions([]);
    setShowReceiptDetails(false);
    onClose();
  };

  // Cash payment
  const handlePayWithCash = async () => {
    if (!fareInfo || !pickupPoint || !dropoffPoint) return;

    setStep("processing");
    await new Promise((r) => setTimeout(r, 800));

    try {
      if (isGroupMode) {
        const result = await api.recordGroupCash({
          from: selectedPointName(pickupPoint, pickupLandmark),
          to: selectedPointName(dropoffPoint, dropoffLandmark),
          regularFare: fareInfo.regularFare,
          discountedFare: fareInfo.discountedFare,
          pickupStopId: pickupPoint.id,
          dropoffStopId: dropoffPoint.id,
          passengers: groupPassengers.map((p) => ({
            passenger_type: p.type,
            quantity: p.quantity,
          })),
          shiftId: shift.shiftId,
          unitNumber: shift.unitNumber,
        });
        setReceiptTransactions(result.transactions);
        const first = result.transactions[0];
        setCashReceiptToken(first?.receiptQrToken ?? null);
      } else {
        const transaction = await api.recordCash({
          amount: fareInfo.finalFare,
          from: selectedPointName(pickupPoint, pickupLandmark),
          to: selectedPointName(dropoffPoint, dropoffLandmark),
          baseFare: fareInfo.regularFare,
          distance: fareInfo.barangaysTraveled,
          discountAmount: fareInfo.discountAmount,
          passengerRole: commuterType,
          pickupStopId: pickupPoint.id,
          dropoffStopId: dropoffPoint.id,
          shiftId: shift.shiftId,
          unitNumber: shift.unitNumber,
        });
        setCashReceiptToken(transaction.receiptQrToken ?? null);
        setReceiptTransactions([transaction]);
      }
      const finalAmt = isGroupMode ? groupTotalFare : (fareInfo?.finalFare ?? 0);
      appHaptics.success();
      triggerSuccessAlert(finalAmt, "Cash");
      setShowReceiptDetails(false);
      onSaved();
      setStep("success");
    } catch (err) {
      appHaptics.error();
      gcash.setGcashError(err instanceof Error ? err.message : "Unable to record cash payment.");
      setStep("failed");
    }
  };

  // Voucher payment
  const handlePayWithVoucher = async () => {
    if (!isOnline) {
      gcash.setGcashError("Voucher validation requires an internet connection. Use cash while offline.");
      return;
    }
    if (!fareInfo || !pickupPoint || !dropoffPoint) return;
    if (!voucherCode.trim()) {
      gcash.setGcashError("Please enter the voucher code.");
      setStep("failed");
      return;
    }

    setStep("processing");

    try {
      const transaction = await api.recordCash({
        amount: 0,
        from: selectedPointName(pickupPoint, pickupLandmark),
        to: selectedPointName(dropoffPoint, dropoffLandmark),
        baseFare: fareInfo.regularFare,
        distance: fareInfo.barangaysTraveled,
        discountAmount: fareInfo.discountAmount,
        passengerRole: commuterType,
        voucherCode: voucherCode.trim(),
        pickupStopId: pickupPoint.id,
        dropoffStopId: dropoffPoint.id,
        shiftId: shift.shiftId,
        unitNumber: shift.unitNumber,
      });
      setReceiptTransactions([transaction]);
      appHaptics.success();
      triggerSuccessAlert(0, "Voucher");
      setShowReceiptDetails(false);
      onSaved();
      setStep("success");
    } catch (err) {
      appHaptics.error();
      gcash.setGcashError(err instanceof Error ? err.message : "Voucher validation failed.");
      setStep("failed");
    }
  };

  const handleConfirmPayment = () => {
    if (selectedMethod === "GCash") {
      gcash.handleInitiateGcash();
    } else if (selectedMethod === "Voucher") {
      handlePayWithVoucher();
    } else {
      handlePayWithCash();
    }
  };

  return {
    step,
    setStep,
    selectedMethod,
    setSelectedMethod,
    pointAreas,
    fareConfig,
    pickupPoint,
    setPickupPoint,
    isAutoPickup,
    setIsAutoPickup,
    dropoffPoint,
    setDropoffPoint,
    pickupLandmark,
    setPickupLandmark,
    dropoffLandmark,
    setDropoffLandmark,
    commuterType,
    setCommuterType,
    isGroupMode,
    setIsGroupMode,
    groupCounts,
    setGroupCounts,
    searchQuery,
    setSearchQuery,
    selectingField,
    setSelectingField,
    expandedBarangay,
    setExpandedBarangay,
    gcashInitiation: gcash.gcashInitiation,
    gcashStatus: gcash.gcashStatus,
    gcashError: gcash.gcashError,
    isInitiatingGcash: gcash.isInitiatingGcash,
    isCancellingGcash: gcash.isCancellingGcash,
    qrSecondsLeft: gcash.qrSecondsLeft,
    voucherCode,
    setVoucherCode,
    cashReceiptToken,
    receiptTransactions,
    receiptSettings,
    showReceiptDetails,
    setShowReceiptDetails,
    printerStatus: printer.printerStatus,
    pairedPrinterName: printer.pairedPrinterName,
    isSameBarangay,
    pickupDotColor,
    dropoffDotColor,
    pickupBadgeBg,
    pickupBadgeText,
    dropoffBadgeBg,
    dropoffBadgeText,
    fareInfo,
    groupPassengers,
    groupEnteredCount,
    groupPassengerCount,
    groupTotalFare,
    groupGrossFare,
    groupDiscount,
    filteredPoints,
    clearPickup,
    clearDropoff,
    swapLocations,
    handleClose,
    handleInitiateGcash: gcash.handleInitiateGcash,
    handleCancelGcash: gcash.handleCancelGcash,
    handleSimulatePayment: gcash.handleSimulatePayment,
    handlePayWithCash,
    handlePayWithVoucher,
    handleConfirmPayment,
    handlePrint: printer.handlePrint,
    stopPolling: gcash.stopPolling,
  };
}
