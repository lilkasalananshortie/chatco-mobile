import { CONDUCTOR_DEVICE_TYPE, getConductorDeviceId } from "../storage/device-id";
import type { FareMatrix, GcashInitiation, ReceiptSettings, Transaction } from "../domain/types";
import { NetworkError, post, request } from "./api-client";
import { cachedPublishedFares, normalizePublishedFares, savePublishedFares } from "./fare-matrix-cache";
import { mapTransaction } from "./api-mappers";
import { appStorage } from "../storage/app-storage";

export function isValidUuid(str?: string): boolean {
  return typeof str === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str.trim());
}

export const paymentService = {
  initiateGcash: async (input: {
    amount: number;
    from: string;
    to: string;
    baseFare: number;
    distance: number;
    discountAmount: number;
    pickupStopId?: string;
    dropoffStopId?: string;
    groupPassengers?: Array<{ type: "REGULAR" | "SENIOR_CITIZEN" | "STUDENT" | "PWD"; quantity: number }>;
  }): Promise<GcashInitiation> => {
    const deviceId = await getConductorDeviceId();
    const pickupStopId = isValidUuid(input.pickupStopId) ? input.pickupStopId : undefined;
    const dropoffStopId = isValidUuid(input.dropoffStopId) ? input.dropoffStopId : undefined;
    const d = await post<any>("/mobile/conductor/payments/gcash/initiate", {
      payment_method: "GCASH",
      final_amount: input.amount,
      pickup_name: input.from,
      dropoff_name: input.to,
      pickup_stop_id: pickupStopId,
      dropoff_stop_id: dropoffStopId,
      base_fare: input.baseFare,
      distance: input.distance,
      discount_amount: input.discountAmount,
      group_passengers: input.groupPassengers,
      device_id: deviceId,
      device_type: CONDUCTOR_DEVICE_TYPE,
    });
    return {
      transactionId: String(d.transaction_id),
      qrToken: d.qr_token,
      checkoutUrl: d.checkout_url ?? null,
      amount: Number(d.amount) || input.amount,
      expiresAt: d.expires_at,
      from: d.pickup_name ?? null,
      to: d.dropoff_name ?? null,
      groupId: d.group_id ?? null,
      multiplePaymentReference: d.multiple_payment_reference ?? null,
      receipts: Array.isArray(d.receipts) ? d.receipts.map(mapTransaction) : [],
    };
  },

  paymentStatus: async (id: string) => {
    const d = await request<any>(`/mobile/payments/${encodeURIComponent(id)}/status`);
    return String(d.status ?? "PENDING").toUpperCase();
  },

  paymentStatusDetails: async (id: string): Promise<{
    status: string;
    paidAt?: string | null;
    payerName?: string | null;
    payerId?: string | null;
    totalPassengers?: number;
    grossAmount?: number;
    discountAmount?: number;
    finalAmount?: number;
    groupId?: string | null;
    voucherAvailable?: boolean;
    voucherCode?: string | null;
    voucherId?: string | null;
    receipts?: Transaction[];
  }> => {
    const d = await request<any>(`/mobile/payments/${encodeURIComponent(id)}/status`);
    return {
      status: String(d.status ?? "PENDING").toUpperCase(),
      paidAt: d.paid_at ?? null,
      payerName: d.payer_name ?? null,
      payerId: d.payer_id ?? null,
      totalPassengers: d.total_passengers ? Number(d.total_passengers) : undefined,
      grossAmount: d.gross_amount ? Number(d.gross_amount) : undefined,
      discountAmount: d.discount_amount ? Number(d.discount_amount) : undefined,
      finalAmount: d.final_amount !== undefined ? Number(d.final_amount) : undefined,
      groupId: d.group_id ?? null,
      voucherAvailable: Boolean(d.voucher_available),
      voucherCode: d.voucher_code ?? null,
      voucherId: d.voucher_id ?? null,
      receipts: Array.isArray(d.receipts) ? d.receipts.map(mapTransaction) : [],
    };
  },

  pendingGcash: async (): Promise<GcashInitiation | null> => {
    const d = await request<any | null>("/mobile/conductor/payments/gcash/pending");
    if (!d) return null;
    return {
      transactionId: String(d.transaction_id),
      qrToken: d.qr_token,
      checkoutUrl: d.checkout_url ?? null,
      amount: Number(d.amount) || 0,
      expiresAt: d.expires_at,
      from: d.pickup_name ?? null,
      to: d.dropoff_name ?? null,
      groupId: d.group_id ?? null,
      multiplePaymentReference: d.multiple_payment_reference ?? null,
      receipts: Array.isArray(d.receipts) ? d.receipts.map(mapTransaction) : [],
      voucherAvailable: Boolean(d.voucher_available),
      voucherCode: d.voucher_code ?? null,
      voucherId: d.voucher_id ?? null,
      payerName: d.payer_name ?? null,
    };
  },

  cancelPayment: (id: string) => post(`/mobile/payments/${encodeURIComponent(id)}/cancel`, {}),

  simulatePayment: (id: string, status: "PAID" | "FAILED" = "PAID") =>
    post(`/mobile/payments/${encodeURIComponent(id)}/simulate`, { status }),

  fareMatrix: async (routeId?: string): Promise<FareMatrix> => {
    try {
      const raw = await request<any>(`/mobile/fare-matrix${routeId ? `?route_id=${encodeURIComponent(routeId)}` : ""}`);
      const matrix = normalizePublishedFares(raw, routeId);
      try { await savePublishedFares(matrix, routeId); } catch { /* Fresh server data remains usable if caching fails. */ }
      return { ...matrix, isCached: false, loadedAt: Date.now() };
    } catch (error) {
      if (!(error instanceof NetworkError)) throw error;
      const cached = await cachedPublishedFares(routeId);
      if (cached) return cached;
      throw new Error("No recent published fares are saved for this route. Reconnect before collecting offline cash.");
    }
  },

  receiptSettings: async (): Promise<ReceiptSettings> => {
    try {
      const d = await request<any>("/mobile/conductor/receipt-settings");
      const getBool = (v: any, fallback = true) =>
        v === undefined || v === null ? fallback : v === "true" || v === true;
      const settings: ReceiptSettings = {
        businessName: d.receipt_business_name ?? "CHATCO",
        addressLine: d.receipt_address_line ?? "",
        footerNote: d.receipt_footer_note ?? "Thank you for riding with Chatco!",
        paperWidth: d.receipt_paper_width === "80" ? "80" : "58",
        autoPrint: getBool(d.receipt_auto_print, true),
        showDateTime: getBool(d.receipt_show_datetime, true),
        showTransactionId: getBool(d.receipt_show_transaction_id, true),
        showRoute: getBool(d.receipt_show_route, true),
        showUnit: getBool(d.receipt_show_unit, true),
        showConductor: getBool(d.receipt_show_conductor, true),
        showPassenger: getBool(d.receipt_show_passenger, true),
        showFareBreakdown: getBool(d.receipt_show_fare_breakdown, true),
        showQrCode: getBool(d.receipt_show_qr_code, true),
        showManualCode: getBool(d.receipt_show_manual_code, true),
      };
      try { await appStorage.setItem("chatco_receipt_settings_v2", JSON.stringify(settings)); } catch { /* Use fresh settings even if caching fails. */ }
      return settings;
    } catch {
      try {
        const saved = await appStorage.getItem("chatco_receipt_settings_v2");
        const settings = saved ? JSON.parse(saved) : null;
        if (settings && typeof settings.businessName === "string" && typeof settings.showQrCode === "boolean" && typeof settings.showManualCode === "boolean") return settings;
      } catch { /* No usable saved settings: preserve legacy defaults below. */ }
      return {
        businessName: "CHATCO",
        addressLine: "",
        footerNote: "Thank you for riding with Chatco!",
        paperWidth: "58",
        autoPrint: true,
        showDateTime: true,
        showTransactionId: true,
        showRoute: true,
        showUnit: true,
        showConductor: true,
        showPassenger: true,
        showFareBreakdown: true,
        showQrCode: true,
        showManualCode: true,
      };
    }
  },
};
