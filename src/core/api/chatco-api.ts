/**
 * chatco-api.ts
 *
 * Facade API client for the ChatCo Conductor mobile app.
 * Aggregates specialized domain services into a cohesive public surface
 * while maintaining 100% backward compatibility with all screens and hooks.
 *
 * Architecture:
 * - api-client.ts: Base request handling, auth tokens, timeout, 401 session-ended handler.
 * - api-mappers.ts: Snake-to-camel domain model mappers.
 * - auth-service.ts: Login, logout, me, password reset.
 * - shift-service.ts: Start shift, active shift, device claiming/release, units & drivers cache.
 * - sync-service.ts: Offline cash synchronization & provisional shift reconciliation.
 * - transaction-service.ts: Cash transactions, group cash recording, pagination, earnings.
 * - payment-service.ts: GCash checkout initiation, polling, simulation, fare matrix, receipt settings.
 * - fleet-service.ts: GPS location reporting, hails, capacity, SOS, announcements, ratings, remittances.
 */

import { getConductorDeviceId } from "../storage/device-id";
import {
  CACHED_DRIVERS_KEY,
  CACHED_PROFILE_KEY,
  CACHED_UNITS_KEY,
  CACHED_USER_KEY,
  NetworkError,
  PROVISIONAL_SHIFT_KEY,
  setSessionEndedHandler,
} from "./api-client";
import { authService } from "./auth-service";
import { fleetService } from "./fleet-service";
import { paymentService } from "./payment-service";
import { shiftService } from "./shift-service";
import {
  addSyncListener,
  getSyncState,
  reconcileProvisionalShift,
  syncPendingCashTransactions,
  type SyncState,
} from "./sync-service";
import { transactionService } from "./transaction-service";

export {
  CACHED_DRIVERS_KEY,
  CACHED_PROFILE_KEY,
  CACHED_UNITS_KEY,
  CACHED_USER_KEY,
  NetworkError,
  PROVISIONAL_SHIFT_KEY,
  setSessionEndedHandler,
  addSyncListener,
  getSyncState,
  reconcileProvisionalShift,
  syncPendingCashTransactions,
  type SyncState,
};

export const api = {
  // Authentication
  login: authService.login,
  logout: authService.logout,
  forgotPassword: authService.forgotPassword,
  verifyResetCode: authService.verifyResetCode,
  resetPassword: authService.resetPassword,
  me: authService.me,

  // Shift & Fleet Resources
  units: shiftService.units,
  drivers: shiftService.drivers,
  profile: shiftService.profile,
  activeShift: shiftService.activeShift,
  checkConnectivity: shiftService.checkConnectivity,
  startShift: shiftService.startShift,
  claimShiftDevice: shiftService.claimShiftDevice,
  releaseShiftDevice: shiftService.releaseShiftDevice,
  getDeviceId: () => getConductorDeviceId(),

  // Offline Sync & Reconciliation
  reconcileProvisionalShift,
  syncPendingCashTransactions,
  addSyncListener,
  getSyncState,

  // Transactions & Cash Management
  pendingCashCount: transactionService.pendingCashCount,
  transactions: transactionService.transactions,
  transactionsPage: transactionService.transactionsPage,
  earnings: transactionService.earnings,
  recordCash: transactionService.recordCash,
  recordGroupCash: transactionService.recordGroupCash,

  // Payments & Settings
  initiateGcash: paymentService.initiateGcash,
  paymentStatus: paymentService.paymentStatus,
  pendingGcash: paymentService.pendingGcash,
  cancelPayment: paymentService.cancelPayment,
  simulatePayment: paymentService.simulatePayment,
  fareMatrix: paymentService.fareMatrix,
  receiptSettings: paymentService.receiptSettings,

  // Fleet Operations & Monitoring
  breakStatus: fleetService.breakStatus,
  routeGeometry: fleetService.routeGeometry,
  hails: fleetService.hails,
  acceptHail: fleetService.acceptHail,
  rejectHail: fleetService.rejectHail,
  capacity: fleetService.capacity,
  location: fleetService.location,
  sos: fleetService.sos,
  sosStatus: fleetService.sosStatus,
  announcements: fleetService.announcements,
  markAnnouncementRead: fleetService.markAnnouncementRead,
  ratings: fleetService.ratings,
  remittances: fleetService.remittances,
  remit: fleetService.remit,
};
