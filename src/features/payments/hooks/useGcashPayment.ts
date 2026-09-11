import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../../../core/api/chatco-api";
import type { FareConfig, FarePoint, GcashInitiation, Transaction } from "../../../core/domain/types";
import { appHaptics } from "../../../core/utils/haptics";
import type { FareInfo, GroupPassengerType, SelectedPaymentMethod, Step } from "../payment-types";
import { getBarangaysTraversed, getFareBetween, selectedPointName } from "../fare-helpers";

export interface UseGcashPaymentProps {
  visible: boolean;
  step: Step;
  setStep: (step: Step) => void;
  isOnline: boolean;
  onSaved: () => void;
  triggerSuccessAlert: (amount: number, method: string) => void;
  pickupPoint: FarePoint | null;
  pickupLandmark: string | null;
  dropoffPoint: FarePoint | null;
  dropoffLandmark: string | null;
  isGroupMode: boolean;
  setIsGroupMode: (group: boolean) => void;
  groupTotalFare: number;
  fareConfig: FareConfig;
  groupPassengers: Array<{ type: GroupPassengerType; quantity: number }>;
  setSelectedMethod: (method: SelectedPaymentMethod | null) => void;
  setReceiptTransactions: (txns: Transaction[]) => void;
}

export function useGcashPayment({
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
}: UseGcashPaymentProps) {
  const [gcashInitiation, setGcashInitiation] = useState<GcashInitiation | null>(null);
  const [gcashStatus, setGcashStatus] = useState<string | null>(null);
  const [gcashError, setGcashError] = useState<string | null>(null);
  const [isInitiatingGcash, setIsInitiatingGcash] = useState(false);
  const [isCancellingGcash, setIsCancellingGcash] = useState(false);
  const [qrSecondsLeft, setQrSecondsLeft] = useState<number | null>(null);

  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const expiredAtRef = useRef<number | null>(null);
  const checkedPendingRef = useRef(false);

  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    if (pollTimeoutRef.current) {
      clearTimeout(pollTimeoutRef.current);
      pollTimeoutRef.current = null;
    }
    expiredAtRef.current = null;
  }, []);

  const pollGcashStatus = useCallback(
    (transactionId: string, expiresAt?: string, expectedAmount?: number) => {
      stopPolling();
      const LATE_SETTLEMENT_GRACE_MS = 60 * 1000;

      pollIntervalRef.current = setInterval(async () => {
        try {
          const rawStatus = await api.paymentStatus(transactionId);
          const status = rawStatus.toUpperCase();
          setGcashStatus(status.toLowerCase());

          if (status === "PAID") {
            stopPolling();
            onSaved();
            appHaptics.success();
            triggerSuccessAlert(expectedAmount ?? 0, "GCash");
            setStep("success");
            return;
          }

          if (["FAILED", "CANCELLED", "REFUNDED"].includes(status)) {
            stopPolling();
            appHaptics.error();
            setGcashError(`Payment ${status.toLowerCase()}.`);
            setStep("failed");
            return;
          }

          if (status === "EXPIRED") {
            if (expiredAtRef.current === null) {
              expiredAtRef.current = Date.now();
            }
            const elapsed = Date.now() - expiredAtRef.current;
            if (elapsed >= LATE_SETTLEMENT_GRACE_MS) {
              stopPolling();
              setGcashError(
                "This QR code has expired. If the commuter already paid on PayMongo, the late webhook may still settle the transaction — check your transaction history in a minute.",
              );
              setStep("failed");
            }
          }
        } catch {
          // Network hiccup — keep polling
        }
      }, 3000);

      const msUntilExpiry = expiresAt
        ? new Date(expiresAt).getTime() - Date.now()
        : 10 * 60 * 1000;
      pollTimeoutRef.current = setTimeout(
        () => {
          stopPolling();
          setGcashError(
            "This QR code has expired. If the commuter already paid on PayMongo, the late webhook may still settle the transaction — check your transaction history in a minute.",
          );
          setGcashStatus("expired");
          setStep("failed");
        },
        Math.max(10_000, msUntilExpiry + LATE_SETTLEMENT_GRACE_MS + 30_000),
      );
    },
    [stopPolling, onSaved, triggerSuccessAlert, setStep],
  );

  // Countdown timer for QR code
  useEffect(() => {
    if (step !== "qr_code" || !gcashInitiation) {
      setQrSecondsLeft(null);
      return;
    }
    const expiryMs = new Date(gcashInitiation.expiresAt).getTime();
    const tick = () => {
      setQrSecondsLeft(Math.max(0, Math.floor((expiryMs - Date.now()) / 1000)));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [step, gcashInitiation]);

  // Interrupted GCash payment resume check
  useEffect(() => {
    if (!visible) {
      checkedPendingRef.current = false;
      return;
    }
    if (checkedPendingRef.current) return;
    checkedPendingRef.current = true;

    void (async () => {
      try {
        const pending = await api.pendingGcash();
        if (!pending) return;

        setSelectedMethod("GCash");
        setGcashInitiation(pending);
        setIsGroupMode(Boolean(pending.groupId));
        setReceiptTransactions(pending.receipts ?? []);
        setGcashStatus(null);
        setGcashError(null);
        setStep("qr_code");
        pollGcashStatus(pending.transactionId, pending.expiresAt, pending.amount);
      } catch {
        // Continue normally
      }
    })();
  }, [visible, pollGcashStatus, setIsGroupMode, setSelectedMethod, setReceiptTransactions, setStep]);

  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, [stopPolling]);

  const handleInitiateGcash = async () => {
    if (!isOnline) {
      setGcashError("GCash is unavailable while offline. Use cash and it will sync when you reconnect.");
      return;
    }
    if (!pickupPoint || !dropoffPoint) return;

    setIsInitiatingGcash(true);
    setGcashError(null);
    setGcashStatus(null);
    setGcashInitiation(null);

    try {
      const regularFare = getFareBetween(pickupPoint, dropoffPoint, fareConfig, false);
      const barangaysTraveled = getBarangaysTraversed(pickupPoint, dropoffPoint);
      const amount = isGroupMode ? groupTotalFare : regularFare;

      const initiation = await api.initiateGcash({
        amount,
        from: selectedPointName(pickupPoint, pickupLandmark),
        to: selectedPointName(dropoffPoint, dropoffLandmark),
        baseFare: regularFare,
        distance: barangaysTraveled,
        discountAmount: isGroupMode
          ? regularFare - getFareBetween(pickupPoint, dropoffPoint, fareConfig, true)
          : 0,
        groupPassengers: isGroupMode
          ? groupPassengers.map((p) => ({ type: p.type, quantity: p.quantity }))
          : undefined,
        pickupStopId: pickupPoint.id,
        dropoffStopId: dropoffPoint.id,
      });

      setGcashInitiation(initiation);
      setReceiptTransactions(initiation.receipts ?? []);
      setStep("qr_code");
      pollGcashStatus(initiation.transactionId, initiation.expiresAt, initiation.amount);
    } catch (err) {
      setGcashError(
        err instanceof Error ? err.message : "Failed to start GCash payment. Please try again.",
      );
      setStep("failed");
    } finally {
      setIsInitiatingGcash(false);
    }
  };

  const handleCancelGcash = async () => {
    if (!gcashInitiation) return;
    setIsCancellingGcash(true);
    setGcashError(null);
    try {
      await api.cancelPayment(gcashInitiation.transactionId);
      stopPolling();
      setGcashInitiation(null);
      setGcashStatus(null);
      setStep("method");
      setSelectedMethod(null);
    } catch (error) {
      setGcashError(error instanceof Error ? error.message : "Unable to cancel payment.");
    } finally {
      setIsCancellingGcash(false);
    }
  };

  const handleSimulatePayment = async () => {
    if (!gcashInitiation) return;
    try {
      await api.simulatePayment(gcashInitiation.transactionId, "PAID");
    } catch (err) {
      setGcashError(err instanceof Error ? err.message : "Simulation failed.");
    }
  };

  const resetGcash = () => {
    setGcashInitiation(null);
    setGcashStatus(null);
    setGcashError(null);
    setIsInitiatingGcash(false);
    setIsCancellingGcash(false);
  };

  return {
    gcashInitiation,
    setGcashInitiation,
    gcashStatus,
    setGcashStatus,
    gcashError,
    setGcashError,
    isInitiatingGcash,
    isCancellingGcash,
    qrSecondsLeft,
    stopPolling,
    handleInitiateGcash,
    handleCancelGcash,
    handleSimulatePayment,
    resetGcash,
  };
}
