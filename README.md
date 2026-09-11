# ChatCo Conductor Mobile

A **React Native / Expo** mobile application for jeepney conductors on the **McArthur Highway — Calumpit to Meycauayan** franchise route in Bulacan, Philippines.

The app does **not** include a backend. All data is served by the existing Laravel `/api/v1` REST API used by the ChatCo web portal.

---

## Table of Contents

- [Overview](#overview)
- [Project Structure](#project-structure)
- [Architecture](#architecture)
- [Main Features](#main-features)
- [Authentication](#authentication)
- [API Layer](#api-layer)
- [State Management](#state-management)
- [Offline Support](#offline-support)
- [File Handling](#file-handling)
- [Navigation](#navigation)
- [Environment Configuration](#environment-configuration)
- [Development Setup](#development-setup)
- [Building](#building)
- [Business Rules](#business-rules)
- [Troubleshooting](#troubleshooting)

---

## Overview

ChatCo Mobile is the conductor-facing terminal device for the ChatCo transportation management system. It handles:

- Shift management (start, break, end)
- Real-time fare and payment collection (Cash, GCash, Voucher)
- GPS location broadcasting
- Offline cash recording with automatic sync
- Commuter hail pickup coordination
- End-of-day remittance reporting
- Commuter ratings and performance metrics
- ESC/POS thermal receipt printing
- SOS emergency alerts

---

## Project Structure

```
chatco-mobile/
├── App.tsx                    # Root: session management, screen routing, PaymentModal host
├── app.json                   # Expo app manifest
├── app.config.js              # Dynamic config (Google Maps, Carto API key injection)
├── eas.json                   # EAS Build profiles (development, preview, production)
├── .env                       # Local environment variables (not committed)
├── .env.example               # Template for required environment variables
│
└── src/
    ├── core/                  # Application-wide infrastructure (no UI)
    │   ├── api/
    │   │   └── chatco-api.ts  # Full Laravel API adapter, response mappers, offline sync
    │   ├── domain/
    │   │   └── types.ts       # All shared TypeScript interfaces and types
    │   ├── offline/           # (Reserved for future offline modules)
    │   ├── storage/
    │   │   ├── app-storage.ts         # Unified storage: SecureStore (token) / AsyncStorage / localStorage
    │   │   ├── device-id.ts           # Stable per-install device ID for shift ownership coordination
    │   │   └── offline-cash-queue.ts  # Durable offline cash transaction queue (FIFO, serialized writes)
    │   ├── theme/
    │   │   └── ThemeProvider.tsx      # Standard and Lo-Fi visual themes, persisted toggle
    │   └── utils/
    │       ├── audio-cues.ts          # 6-category Web Audio tone system + haptics (no file assets)
    │       ├── corridor-guard.ts      # GPS speed limiter (50 km/h) and corridor deviation detector
    │       ├── haptics.ts             # Expo Haptics wrapper (silent on web)
    │       ├── terminal-headway.ts    # Terminal wait timer state machine (trip done → ready countdown)
    │       ├── thermal-guard.ts       # Battery / temperature monitoring for printer protection
    │       ├── thermal-printer.ts     # ESC/POS Bluetooth thermal receipt printer driver
    │       ├── trip-cycle-tracker.ts  # Trip cycle state machine (Calumpit ↔ Meycauayan)
    │       └── voice-announcer.ts     # expo-speech stop announcer with geofence trigger
    │
    ├── features/              # Screen-level feature modules
    │   ├── auth/
    │   │   └── LoginScreen.tsx        # Username/password login, CONDUCTOR role gate
    │   ├── dashboard/
    │   │   ├── DashboardScreen.tsx    # Main conductor HUD (GPS, capacity, hails, earnings, trip cycle)
    │   │   ├── dashboard-styles.ts    # StyleSheet factory for DashboardScreen (extracted for readability)
    │   │   ├── LiveMap.d.ts           # Platform-split type declaration
    │   │   ├── LiveMap.native.tsx     # Expo Maps implementation (Android/iOS)
    │   │   ├── LiveMap.web.tsx        # React Leaflet implementation (web)
    │   │   ├── leaflet-base.css       # Leaflet default CSS (imported by web map)
    │   │   ├── location-task.ts       # expo-task-manager background location task definition
    │   │   ├── route-data.ts          # Franchise route polyline (78 GPS waypoints, Calumpit→Meycauayan)
    │   │   ├── TransactionHistoryModal.tsx  # Paginated shift transaction list modal
    │   │   └── TripLogbookModal.tsx         # Trip cycle history logbook modal
    │   ├── metrics/
    │   │   └── MetricsScreen.tsx      # Shift ratings, star distribution, commuter feedback
    │   ├── payments/
    │   │   ├── PaymentModal.tsx       # Multi-step fare collection (Cash / GCash / Voucher)
    │   │   ├── payment-styles.ts      # StyleSheet factory for PaymentModal
    │   │   └── TransactionReceipt.tsx # Receipt display with QR code
    │   ├── remittance/
    │   │   └── ReportScreen.tsx       # End-of-day summary, cash declaration, remittance submission
    │   ├── settings/
    │   │   └── SettingsScreen.tsx     # App settings: theme, audio, voice, printer, headway timer, etc.
    │   └── shift/
    │       └── VerificationScreen.tsx # Pre-shift: unit/driver selection, shift start, remittance history
    │
    ├── shared/
    │   └── ui/
    │       ├── index.tsx          # Loading, Header, ScreenShell, ModalShell, BottomNav components
    │       ├── SlideToConfirm.tsx # Drag-to-confirm slider (used for break end, trip start)
    │       └── SosConfirmModal.tsx # 3-second hold-to-confirm SOS alert modal
    │
    └── types/
        └── styles.d.ts            # CSS module type declaration (for Leaflet import)
```

---

## Architecture

The app follows a **feature-based layered architecture**:

```
App.tsx (session + screen orchestration)
  │
  ├── core/api      ← All backend communication. Single API client object.
  ├── core/domain   ← TypeScript types shared across features.
  ├── core/storage  ← Persistent state (token, queue, device ID, settings).
  ├── core/utils    ← Business utilities (no React: pure functions and state machines).
  ├── core/theme    ← Theme context provider.
  │
  ├── features/*    ← Screens and their tightly-coupled sub-components.
  └── shared/ui     ← Truly reusable UI building blocks.
```

**Screen routing** is handled by a single `screen` state in `App.tsx` — there is no navigation library. The screens are: `verify`, `home`, `report`, `metrics`, `settings`.

---

## Main Features

### Conductor Dashboard (`DashboardScreen`)
- Real-time GPS broadcasting to backend every few seconds
- Speed display with 50 km/h limit warning (corridor guard)
- Corridor deviation alert when jeep leaves franchise route (>300 m)
- Passenger capacity status (Available / Standing / Full)
- Commuter hail pickup requests (accept/reject)
- Live sync indicator (pending offline cash count)
- Shift earnings totals (Cash, GCash)
- Transaction history modal (paginated)
- SOS emergency alert button (3-second hold to confirm)
- Voice stop announcer (Filipino/English via expo-speech)
- No-look audio cues (6 sound categories via Web Audio API)
- Trip cycle tracker (Calumpit ↔ Meycauayan with turnaround logging)
- Terminal headway timer (configurable 1–60 min countdown after trip completion)

### Payment Collection (`PaymentModal`)
- Multi-step flow: method → stop selection → passenger type → confirm → process
- **Cash**: single passenger or group (multi-type batch)
- **GCash**: generates QR code, polls payment status, auto-detects success
- **Voucher**: code entry with discount application
- Fare matrix loaded from backend, with fallback default config
- Current GPS location used to pre-select pickup stop
- Offline cash: queued locally with sequential ticket numbers (TKT-UNIT-NNNN)

### Shift Management (`VerificationScreen`)
- Select unit (jeepney) and driver from backend lists
- Start shift online or offline (provisional shift with local ID)
- Claim / release shift from another device
- Remittance history list with quick-remit access

### Remittance (`ReportScreen`)
- End-of-shift summary (transaction totals, passenger count)
- Cash declaration input
- Shortage/overage calculation
- Remittance submission to backend
- Printable summary

### Settings (`SettingsScreen`)
- Standard / Lo-Fi visual mode toggle
- No-look audio cues toggle (per-category)
- Voice stop announcer toggle + test
- ESC/POS thermal printer Bluetooth pairing
- Terminal headway timer adjustment (1–60 minutes, default 15)
- Profile display
- Sign out

---

## Authentication

Authentication uses **Laravel Sanctum bearer tokens**.

1. `POST /api/v1/auth/login` — returns token + user object. Role must be `CONDUCTOR`.
2. Token stored in **SecureStore** on native (iOS Keychain / Android Keystore) or `localStorage` on web.
3. Every API request sends `Authorization: Bearer <token>`.
4. A **401 response** on any non-login request clears the token and triggers `sessionEndedHandler`, which signs the user out.
5. **"Latest login wins"**: logging in on a new device revokes all previous tokens on the backend. The old device gets a 401 on its next API call and is automatically signed out.

---

## API Layer

All backend communication lives in **`src/core/api/chatco-api.ts`**.

The module exports:
- `api` — the main API client object with methods for auth, shifts, transactions, payments, etc.
- `syncPendingCashTransactions()` — flushes the offline cash queue to the server
- `reconcileProvisionalShift()` — promotes an offline provisional shift to an official backend shift
- `setSessionEndedHandler()` — registers the 401 callback
- `addSyncListener()` / `getSyncState()` — observable sync status (idle/syncing/error)

**Response mapping**: raw Laravel snake_case responses are mapped to camelCase TypeScript domain types by private `mapUnit`, `mapDriver`, `mapShift`, `mapTransaction` functions within the module.

**Request timeout**: 15 seconds. Exceeded requests throw `NetworkError`.

---

## State Management

The app uses **React's built-in `useState` / `useEffect`** — no external state library.

- **`App.tsx`** owns: `user`, `shift`, `screen`, `isOnline`, `refreshKey`
- **`DashboardScreen`** owns: all GPS, earnings, hail, trip cycle, headway timer, and UI state for the conductor HUD
- **Shared mutable state** (audio cues enabled, voice announcer enabled) lives in module-level variables in `audio-cues.ts` and `voice-announcer.ts` with subscribe/notify patterns
- **Persisted state** uses `appStorage` (AsyncStorage / SecureStore / localStorage) via keys defined as constants at the top of each module

---

## Offline Support

**Offline cash queue** (`src/core/storage/offline-cash-queue.ts`):
- When the network is unreachable during a cash/voucher transaction, the payment is saved locally
- Each offline item gets a sequential ticket number: `TKT-UNITNUMBER-NNNN`
- Items are written atomically via a serialized promise chain to prevent race conditions
- On next online period, `syncPendingCashTransactions()` replays items in order to the server
- Corrupt queue data is preserved (not overwritten) for manual recovery

**Provisional shifts** (`chatco_provisional_shift` key):
- If the backend is unreachable when starting a shift, a local provisional shift is created
- The provisional shift ID is prefixed `PROV-` and only used locally
- On reconnect, `reconcileProvisionalShift()` creates the official server shift and remaps all pending cash items to the new shift ID

**Offline reads**:
- Units, drivers, user profile, and conductor user are cached locally and returned if the server is unreachable

---

## File Handling

The app does **not** upload files or work with user documents.

File-related operations:
- **Leaflet CSS** (`leaflet-base.css`) — static CSS import required by the React Leaflet web map. Declared via `src/types/styles.d.ts`.
- **ESC/POS thermal printing** (`thermal-printer.ts`) — sends raw byte arrays over Bluetooth to a connected receipt printer. No file I/O.
- **Receipt QR codes** — rendered as SVG via `react-native-qrcode-svg`. No file storage.

---

## Navigation

Navigation is screen-state driven (no router library). `App.tsx` manages the active `Screen` value:

| Screen     | Component            | Condition                              |
|------------|----------------------|----------------------------------------|
| `verify`   | VerificationScreen   | No active shift, or user requested     |
| `home`     | DashboardScreen      | Shift is active                        |
| `report`   | ReportScreen         | Shift active or remittance selected    |
| `metrics`  | MetricsScreen        | Always available if shift exists       |
| `settings` | SettingsScreen       | Always available if shift exists       |

`PaymentModal` is rendered in `App.tsx` overlaid on top of all screens (not a separate screen).

---

## Environment Configuration

Copy `.env.example` to `.env` and fill in:

| Variable                 | Required | Description                                                                 |
|--------------------------|----------|-----------------------------------------------------------------------------|
| `EXPO_PUBLIC_API_URL`    | ✅       | Base URL of the Laravel backend, **without** `/api/v1` (e.g. `http://192.168.1.100:8000`) |
| `EXPO_PUBLIC_CARTO_API_KEY` | Optional | Carto API key for the web map tile layer                               |
| `GOOGLE_MAPS_API_KEY`    | Optional | Android-restricted Google Maps SDK key (required for native Android map)    |

> ⚠️ A physical phone cannot reach your computer's `localhost`. Use the LAN IP address or an HTTPS host.

---

## Development Setup

```bash
# 1. Install dependencies
npm install

# 2. Copy environment config
cp .env.example .env
# Edit .env — set EXPO_PUBLIC_API_URL to your Laravel server

# 3. Start the Expo dev server
npm start

# 4. Type check
npm run typecheck

# 5. Run on specific platforms
npm run android
npm run ios
npm run web
```

---

## Building

This project uses **EAS Build** for production APKs/IPAs.

```bash
# Preview APK (Android)
eas build --platform android --profile preview

# Set sensitive environment variables for EAS builds:
eas env:set preview --name GOOGLE_MAPS_API_KEY --value "YOUR_KEY" --visibility sensitive
```

EAS profiles are defined in `eas.json`.

---

## Business Rules

These rules are enforced in the codebase and must not be changed without a corresponding backend contract change:

**Fares**:
- Base fare covers the first 4 barangays (configurable via `/fare-matrix`)
- Regular base: ₱15, Discounted base: ₱12 (defaults — live values from API)
- Succeeding rate: ₱2.25/barangay regular, ₱1.75 discounted
- Discount types: STUDENT, SENIOR_CITIZEN (alias SENIOR), PWD

**Passenger groups**:
- Group cash payments allow mixed types (Regular + Discounted) in one transaction
- Each passenger in a group gets a separate `Transaction` record with its own ticket ID

**Shift ownership**:
- Only one device can operate a shift at a time (`operating_device_id` in backend)
- Devices that are not the operating device enter view-only mode (no payments)
- Any device can claim an unclaimed shift

**GCash payments**:
- Voucher payments cannot be queued offline (they require real-time backend validation)
- GCash payments cannot be processed offline

**Terminal Headway Timer**:
- After a trip is marked complete, a countdown starts (default 15 minutes, configurable 1–60 min)
- The next trip can be started manually (button/slider) or automatically when the jeep moves >8 km/h

**Speed limit**:
- 50 km/h is the maximum enforced limit matching the backend's LocationService
- Warning zone starts at 45 km/h
- Overspeed triggers haptic + voice alert (20-second cooldown between voice alerts)

---

## Troubleshooting

**App cannot reach the server**
- Check `EXPO_PUBLIC_API_URL` in `.env` — it must be reachable from the physical device
- Physical phones cannot use `localhost` — use LAN IP or a tunneling service

**Signed out unexpectedly**
- The session was claimed by another login on another device (backend token revocation)
- Offline cash is preserved — sync will resume after re-login

**Offline cash not syncing**
- Check connectivity indicator on the dashboard
- The sync runs every 20 seconds and on app foreground

**Map not showing on Android**
- `GOOGLE_MAPS_API_KEY` must be set and the EAS build must include it
- The key must be restricted to package `com.chatco.conductor`

**Thermal printer not connecting**
- Pair the printer in the device Bluetooth settings first
- Tap "Pair Printer" in Settings → it will scan for nearby Bluetooth devices
- Only ESC/POS-compatible printers are supported (58mm or 80mm paper width)

**TypeScript errors after editing**
```bash
npm run typecheck
```
