export type Screen = "verify" | "home" | "report" | "metrics" | "settings";
export type Capacity = "AVAILABLE" | "STANDING" | "FULL";

export interface User {
  id: string;
  email: string;
  role: string;
  name: string;
}

export interface Unit {
  id: string;
  unitNumber: string;
  plateNumber: string;
  route: string;
  routeId?: string;
  status: "available" | "in-use" | "maintenance";
}

export interface Driver {
  id: string;
  name: string;
  status: "available" | "on-shift";
}

export interface Shift {
  shiftId: string;
  conductorName: string;
  unitNumber: string;
  route: string;
  driverName: string;
  timeIn: string;
  timeOut: string | null;
  isActive: boolean;
}

export interface Transaction {
  transactionId: string;
  paymentMethod: "Cash" | "GCash" | "Voucher";
  finalAmount: number;
  from: string;
  to: string;
  timestamp: number;
  passengerName?: string;
  passengerId?: string;
  passengerRole?: string;
  distance?: number;
  baseFare?: number;
  succeedingKm?: number;
  discountAmount?: number;
  conductorName?: string;
  unitNumber?: string;
  driverName?: string;
  voucherCode?: string;
  status?: "PENDING" | "PROCESSING" | "PAID" | "FAILED" | "CANCELLED" | "EXPIRED" | "REFUNDED";
  paidAt?: string | null;
}

export interface ShiftEarnings {
  cashTotal: number;
  gcashTotal: number;
  total: number;
}

export interface Rating {
  ratingId: string;
  commuterId: string;
  commuterName: string;
  shiftId: string;
  targetRole: "DRIVER" | "CONDUCTOR";
  targetId: string;
  score: number;
  comment: string;
  createdAt: string;
}

export interface Remittance {
  id?: string;
  shift_id?: string;
  date?: string;
  cash_total?: number | string;
  gcash_total?: number | string;
  voucher_total?: number | string;
  declared_amount?: number | string;
  total_collected?: number | string;
  remittance_status?: string;
  status?: string;
  remitted_at?: string;
  unit_number?: string;
  conductor_name?: string;
  driver_name?: string;
  total_passengers?: number | string;
  cash_declared?: number | string;
  total_cashless?: number | string;
  gcash_scanned_total?: number | string;
  gcash_direct_total?: number | string;
  time_in?: string;
  time_out?: string;
}

export interface GcashInitiation {
  transactionId: string;
  qrToken: string;
  checkoutUrl: string | null;
  amount: number;
  expiresAt: string;
  from?: string | null;
  to?: string | null;
}

export interface ConductorProfile {
  id: string;
  name: string;
  username: string;
  phoneNumber?: string;
}

export interface HailRequest {
  id: string;
  commuterName: string;
  latitude: number;
  longitude: number;
  label?: string;
  etaMinutes?: number;
}

export interface FarePoint {
  pointNumber: number;
  code: string;
  name: string;
  landmarks: string[];
  regularFare: number;
  discountedFare: number;
}

export interface FareConfig {
  baseBarangayCount: number;
  baseFareRegular: number;
  baseFareDiscounted: number;
  succeedingFareRegular: number;
  succeedingFareDiscounted: number;
  totalPoints: number;
}

export interface FareMatrix {
  points: FarePoint[];
  config: FareConfig;
}

export type CommuterType = "REGULAR" | "STUDENT" | "SENIOR" | "PWD";

export interface SosAlert {
  id: string;
  status: "ACTIVE" | "ACKNOWLEDGED" | "RESOLVED";
}
