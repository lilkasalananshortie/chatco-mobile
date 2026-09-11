import { CONDUCTOR_DEVICE_TYPE, getConductorDeviceId } from "../storage/device-id";
import type { FareMatrix, GcashInitiation, ReceiptSettings } from "../domain/types";
import { post, request } from "./api-client";
import { mapTransaction } from "./api-mappers";

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
    const d = await post<any>("/conductor/payments/gcash/initiate", {
      payment_method: "GCASH",
      final_amount: input.amount,
      pickup_name: input.from,
      dropoff_name: input.to,
      pickup_stop_id: input.pickupStopId,
      dropoff_stop_id: input.dropoffStopId,
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
    const d = await request<any>(`/payments/${encodeURIComponent(id)}/status`);
    return String(d.status ?? "PENDING").toUpperCase();
  },

  pendingGcash: async (): Promise<GcashInitiation | null> => {
    const d = await request<any | null>("/conductor/payments/gcash/pending");
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
    };
  },

  cancelPayment: (id: string) => post(`/payments/${encodeURIComponent(id)}/cancel`, {}),

  simulatePayment: (id: string, status: "PAID" | "FAILED" = "PAID") =>
    post(`/payments/${encodeURIComponent(id)}/simulate`, { status }),

  fareMatrix: async (): Promise<FareMatrix> => {
    const d = await request<any>("/fare-matrix");
    const points = Array.isArray(d?.points) ? d.points : [];
    return {
      points: points.map((p: any) => ({
        pointNumber: Number(p.pointNumber ?? p.point_number),
        id: String(p.id ?? ""),
        code: p.code ?? "",
        name: p.name,
        landmarks: p.landmarks ?? [],
        subStops: p.subStops ?? p.sub_stops ?? [],
        latitude: p.latitude === null || p.latitude === undefined ? undefined : Number(p.latitude),
        longitude: p.longitude === null || p.longitude === undefined ? undefined : Number(p.longitude),
        regularFare: Number(p.regularFare ?? p.regular_fare) || 0,
        discountedFare: Number(p.discountedFare ?? p.discounted_fare) || 0,
      })),
      config: {
        baseBarangayCount: Number(d?.config?.baseBarangayCount ?? d?.config?.base_barangay_count) || 4,
        baseFareRegular: Number(d?.config?.baseFareRegular ?? d?.config?.base_fare_regular) || 15,
        baseFareDiscounted: Number(d?.config?.baseFareDiscounted ?? d?.config?.base_fare_discounted) || 12,
        succeedingFareRegular: Number(d?.config?.succeedingFareRegular ?? d?.config?.succeeding_fare_regular) || 2.25,
        succeedingFareDiscounted:
          Number(d?.config?.succeedingFareDiscounted ?? d?.config?.succeeding_fare_discounted) || 1.75,
        totalPoints: Number(d?.config?.totalPoints ?? d?.config?.total_points) || points.length,
      },
    };
  },

  receiptSettings: async (): Promise<ReceiptSettings> => {
    try {
      const d = await request<any>("/conductor/receipt-settings");
      const getBool = (v: any, fallback = true) =>
        v === undefined || v === null ? fallback : v === "true" || v === true;
      return {
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
      };
    } catch {
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
      };
    }
  },
};
