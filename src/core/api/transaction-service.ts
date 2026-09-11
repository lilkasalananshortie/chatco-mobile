import {
  enqueuePendingCash,
  getNextOfflineTicketSequence,
  pendingCashCount,
  pendingCashForShift,
} from "../storage/offline-cash-queue";
import { CONDUCTOR_DEVICE_TYPE, getConductorDeviceId } from "../storage/device-id";
import type { ShiftEarnings, Transaction } from "../domain/types";
import { NetworkError, post, request } from "./api-client";
import { mapTransaction } from "./api-mappers";

export const transactionService = {
  pendingCashCount: (shiftId?: string) => pendingCashCount(shiftId),

  transactions: async (shiftId: string) => {
    const pending = await pendingCashForShift(shiftId);
    try {
      return (await request<any[]>(`/conductor/transactions?shift_id=${encodeURIComponent(shiftId)}`))
        .map(mapTransaction)
        .concat(pending);
    } catch (cause) {
      if (cause instanceof NetworkError) return pending;
      throw cause;
    }
  },

  transactionsPage: async (
    shiftId: string,
    options: {
      page: number;
      perPage?: number;
      paymentMethod?: string;
      dateFrom?: string;
      dateTo?: string;
    },
  ): Promise<{
    transactions: Transaction[];
    currentPage: number;
    perPage: number;
    total: number;
    totalPages: number;
    totalAmount: number;
  }> => {
    const params = new URLSearchParams({
      shift_id: shiftId,
      page: String(options.page),
      per_page: String(options.perPage ?? 25),
    });
    if (options.paymentMethod && options.paymentMethod !== "ALL") {
      params.append("payment_method", options.paymentMethod.toUpperCase());
    }
    if (options.dateFrom) params.append("date_from", options.dateFrom);
    if (options.dateTo) params.append("date_to", options.dateTo);

    try {
      const res = await request<any>(`/conductor/transactions?${params.toString()}`);
      const rows = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
      return {
        transactions: rows.map(mapTransaction),
        currentPage: Number(res?.current_page ?? options.page),
        perPage: Number(res?.per_page ?? options.perPage ?? 25),
        total: Number(res?.total ?? rows.length),
        totalPages: Number(res?.last_page ?? 1),
        totalAmount: Number(res?.total_amount ?? rows.reduce((s: number, r: any) => s + (Number(r.final_amount) || 0), 0)),
      };
    } catch (cause) {
      if (cause instanceof NetworkError) {
        const local = await pendingCashForShift(shiftId);
        return {
          transactions: local,
          currentPage: 1,
          perPage: 25,
          total: local.length,
          totalPages: 1,
          totalAmount: local.reduce((s, t) => s + t.finalAmount, 0),
        };
      }
      throw cause;
    }
  },

  earnings: async (shiftId: string): Promise<ShiftEarnings> => {
    const d = await request<any>(`/conductor/earnings?shift_id=${encodeURIComponent(shiftId)}`);
    return {
      cashTotal: Number(d.cash_total) || 0,
      gcashTotal: Number(d.gcash_total) || 0,
      total: Number(d.total) || 0,
    };
  },

  recordCash: async (input: {
    amount: number;
    from: string;
    to: string;
    baseFare: number;
    distance: number;
    discountAmount: number;
    passengerRole?: string;
    voucherCode?: string;
    pickupStopId?: string;
    dropoffStopId?: string;
    idempotencyKey?: string;
    shiftId?: string;
    unitNumber?: string;
  }) => {
    const idempotencyKey = input.idempotencyKey ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const deviceId = await getConductorDeviceId();
    const offlineCreatedAt = new Date().toISOString();
    const passengerRole = input.passengerRole === "SENIOR" ? "SENIOR_CITIZEN" : input.passengerRole;
    const payload = {
      shift_id: input.shiftId,
      payment_method: input.voucherCode ? "VOUCHER" : "CASH",
      final_amount: input.amount,
      pickup_name: input.from,
      dropoff_name: input.to,
      base_fare: input.baseFare,
      distance: input.distance,
      discount_amount: input.discountAmount,
      passenger_role: passengerRole,
      pickup_stop_id: input.pickupStopId,
      dropoff_stop_id: input.dropoffStopId,
      idempotency_key: idempotencyKey,
      voucher_code: input.voucherCode || undefined,
      device_id: deviceId,
      device_type: CONDUCTOR_DEVICE_TYPE,
    };
    try {
      return mapTransaction(await post<any>("/conductor/transactions", payload));
    } catch (cause) {
      if (!(cause instanceof NetworkError) || input.voucherCode) throw cause;
      const seq = await getNextOfflineTicketSequence(input.shiftId ?? "local", 1);
      const cleanUnit = (input.unitNumber ?? "00").replace(/[^a-zA-Z0-9]/g, "") || "OFF";
      const ticketId = `TKT-${cleanUnit}-${String(seq).padStart(4, "0")}`;

      const local: Transaction = {
        transactionId: ticketId,
        paymentMethod: "Cash",
        finalAmount: input.amount,
        from: input.from,
        to: input.to,
        timestamp: Date.now(),
        passengerRole: passengerRole,
        distance: input.distance,
        baseFare: input.baseFare,
        discountAmount: input.discountAmount,
        status: "PAID",
        unitNumber: input.unitNumber,
      };
      await enqueuePendingCash({
        id: `pending-${idempotencyKey}`,
        shiftId: input.shiftId ?? "",
        kind: "single",
        idempotencyKey,
        payload: { ...payload, offline_created_at: offlineCreatedAt },
        localTransactions: [local],
        createdAt: Date.now(),
        deviceId,
        offlineCreatedAt,
        attempts: 0,
      });
      return local;
    }
  },

  recordGroupCash: async (input: {
    from: string;
    to: string;
    regularFare: number;
    discountedFare: number;
    pickupStopId?: string;
    dropoffStopId?: string;
    passengers: Array<{ passenger_type: "REGULAR" | "SENIOR_CITIZEN" | "STUDENT" | "PWD"; quantity: number }>;
    idempotencyKey?: string;
    shiftId?: string;
    unitNumber?: string;
  }) => {
    const idempotencyKey = input.idempotencyKey ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const deviceId = await getConductorDeviceId();
    const offlineCreatedAt = new Date().toISOString();
    const totalAmount = input.passengers.reduce(
      (sum, passenger) =>
        sum + passenger.quantity * (passenger.passenger_type === "REGULAR" ? input.regularFare : input.discountedFare),
      0,
    );
    const payload = {
      shift_id: input.shiftId,
      payment_method: "CASH",
      final_amount: Number(totalAmount.toFixed(2)),
      pickup_name: input.from,
      dropoff_name: input.to,
      pickup_stop_id: input.pickupStopId,
      dropoff_stop_id: input.dropoffStopId,
      idempotency_key: idempotencyKey,
      device_id: deviceId,
      device_type: CONDUCTOR_DEVICE_TYPE,
      group_passengers: input.passengers.map(passenger => {
        const finalAmount = passenger.passenger_type === "REGULAR" ? input.regularFare : input.discountedFare;
        return {
          type: passenger.passenger_type,
          quantity: passenger.quantity,
          final_amount: finalAmount,
          base_fare: input.regularFare,
          discount_amount: Math.max(0, input.regularFare - finalAmount),
        };
      }),
    };
    try {
      const d = await post<any>("/conductor/transactions", payload);
      return {
        groupId: String(d.group_id),
        multiplePaymentReference: d.multiple_payment_reference ?? null,
        transactions: Array.isArray(d.transactions) ? d.transactions.map(mapTransaction) : [],
      };
    } catch (cause) {
      if (!(cause instanceof NetworkError)) throw cause;
      const totalPassengers = input.passengers.reduce((sum, row) => sum + row.quantity, 0);
      const startSeq = await getNextOfflineTicketSequence(input.shiftId ?? "local", totalPassengers);
      const cleanUnit = (input.unitNumber ?? "00").replace(/[^a-zA-Z0-9]/g, "") || "OFF";
      const reference = `GRP-${cleanUnit}-${String(startSeq).padStart(4, "0")}`;

      let groupPosition = 0;
      const transactions = input.passengers.flatMap(passenger =>
        Array.from({ length: passenger.quantity }, () => {
          const currentTicketSeq = startSeq + groupPosition;
          groupPosition += 1;
          return {
            transactionId: `TKT-${cleanUnit}-${String(currentTicketSeq).padStart(4, "0")}`,
            paymentMethod: "Cash" as const,
            finalAmount: passenger.passenger_type === "REGULAR" ? input.regularFare : input.discountedFare,
            from: input.from,
            to: input.to,
            timestamp: Date.now(),
            passengerRole: passenger.passenger_type,
            baseFare: input.regularFare,
            discountAmount: passenger.passenger_type === "REGULAR" ? 0 : input.regularFare - input.discountedFare,
            status: "PAID" as const,
            groupId: `offline-${idempotencyKey}`,
            multiplePaymentReference: reference,
            groupPosition,
            totalPassengers,
            unitNumber: input.unitNumber,
          };
        }),
      );
      await enqueuePendingCash({
        id: `pending-${idempotencyKey}`,
        shiftId: input.shiftId ?? "",
        kind: "group",
        idempotencyKey,
        payload: { ...payload, offline_created_at: offlineCreatedAt },
        localTransactions: transactions,
        createdAt: Date.now(),
        deviceId,
        offlineCreatedAt,
        attempts: 0,
      });
      return { groupId: `offline-${idempotencyKey}`, multiplePaymentReference: reference, transactions };
    }
  },
};
