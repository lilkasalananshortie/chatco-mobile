import type { CommuterType, FareConfig, FarePoint, GcashInitiation, ReceiptSettings, Shift, Transaction } from "../../core/domain/types";

export type Step =
  | "method"
  | "select"
  | "passengers"
  | "confirm"
  | "processing"
  | "qr_code"
  | "success"
  | "failed";

export type SelectedPaymentMethod = "GCash" | "Cash" | "Voucher";

export type GroupPassengerType = "REGULAR" | "SENIOR_CITIZEN" | "STUDENT" | "PWD";

export interface FareInfo {
  barangaysTraveled: number;
  regularFare: number;
  discountedFare: number;
  finalFare: number;
  hasDiscount: boolean;
  discountAmount: number;
  succeedingCount: number;
  baseBarangayCount: number;
}

export interface GroupPassengerRow {
  type: GroupPassengerType;
  quantity: number;
}
