# ChatCo Conductor Mobile

This Expo/React Native client is extracted from the Conductor-facing portion of the supplied ChatCo Next.js frontend. It does not contain or create a backend.

## Setup

1. Copy `.env.example` to `.env`.
2. Set `EXPO_PUBLIC_API_URL` to the reachable Laravel host, without `/api/v1`.
   A physical phone cannot use the computer's `localhost`; use its LAN IP or HTTPS host.
3. Run `npm install`.
4. Run `npm start`.

The app authenticates directly against the existing Laravel `POST /api/v1/auth/login` contract, stores the returned Sanctum token in Expo SecureStore, and sends it as a Bearer token on subsequent calls.

## Extracted Conductor experience

- Existing Conductor login and `CONDUCTOR` role restriction
- Unit and driver verification
- Start/resume active shift
- Dashboard totals, capacity state, GPS broadcast, transaction history, and SOS confirmation
- Global Cash, GCash QR, and Voucher collection modal
- Ratings/metrics page
- End-of-day totals, cash declaration, remittance confirmation, success overlay, and report history
- Settings, clear-cache explanation, and sign-out confirmation
- Persistent Standard/Lo-Fi visual mode toggle in Settings. Lo-Fi mode keeps
  every route and workflow intact while removing decorative depth, animation,
  rounded surfaces, and high-contrast color accents.

## Project structure

```text
src/
├── core/
│   ├── api/          Existing Laravel API adapter and response mapping
│   ├── domain/       Shared Conductor domain types
│   └── theme/        Persistent Standard and Lo-Fi design systems
├── features/
│   ├── auth/
│   ├── dashboard/
│   ├── metrics/
│   ├── payments/
│   ├── remittance/
│   ├── settings/
│   └── shift/
└── shared/
    └── ui/           Reusable shells, navigation, loading and modal UI
```

## Backend

No Express, mock server, local JSON API, database, Next.js API routes, or other backend was added. All calls target existing `/api/v1` Laravel routes documented by the source frontend.
