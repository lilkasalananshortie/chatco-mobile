# ChatCo Conductor Mobile change timeline

## Existing dated history

These dates come from the existing Git history and are retained unchanged.

| Date | Commit | Change |
| --- | --- | --- |
| 2026-09-21 | 909853a | Align conductor features with the web portal. |
| 2026-09-22 | 61ad2c1 | Isolate the conductor development server on port 8081. |
| 2026-09-22 | 64f030a | Improve network errors and multipart support. |
| 2026-09-22 | e0ef739 | Restore trip tracking, audio, dashboard tools and printer integration. |
| 2026-09-26 | 9479003 | Add release hardening and test documentation. |
| 2026-09-26 | 55b1b0e, e7fbed8 | Update dependency lock and EAS compatibility. |
| 2026-09-26 | be09d92 | Send location updates throughout an active shift. |

## 2026-10-16 — publish accumulated local changes

Pending work is published in separate commits for:

1. Mobile API contracts, cash synchronization acknowledgements and published fare caching.
2. Fare collection, sandbox GCash, vouchers and receipt/printer consistency.
3. Assignment verification, device handoff, incident reporting and shift controls.
4. Expo release metadata, source-only publication rules and this timeline.

The original implementation dates of uncommitted changes cannot be recovered reliably.
These entries describe their publication date, not invented historical completion dates.
Existing history is not rewritten or backdated.

## Publication checks and limitations

- TypeScript validation passed.
- Jest: 7 suites, 53 tests passed.
- Existing local changes are being published, not certified as production-ready.
- No deployment, backend changes, new APK or physical-device validation is included.
- Use a backend exposing `/api/v1/mobile/...` with compatible responses.
- `.env` files, signing keys, editor settings and generated native/build files stay local.
- Native Android sources can be regenerated using Expo prebuild; EAS configuration already
  excludes generated native projects from its upload.

## 2026-10-26 — Android testing release 1.0.10 (build 10)

Publish accumulated work as separate API/payment, operational UI, and release
commits with their actual publication date. Includes session/password setup,
strict offline-cash storage, payment status handling, photo/ratings/announcement
parity, shift-scoped GPS, location disclosure and diagnostics, legal/support
access, and the refreshed conductor login (no walkthrough).

Validation before publication: 135 Jest tests, TypeScript and Android bundle
export passed. Native APK build/physical-device results are reported separately;
these checks do not certify every production flow. Use the existing EAS preview
profile against https://api.chatco.online. Backend mobile endpoints must be
deployed first. No live payment mode or production backend changes are included.

Use `git log --date=iso --format="%h %ad %s"` for the exact retained commit chronology.
