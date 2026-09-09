# smtp-reconstruction.md

## Goal
Reconstruct and redesign the SMTP Email Integration into a clean, simple, secure, real-time, and 100% functional system working in both local dev and live deployment.

## Tasks
- [x] Task 1: Fix missing imports and eliminate fake success/mock fallback logic in `emailService.ts` → Verify: TypeScript compiles and no false success returns.
- [x] Task 2: Build real backend connection test and email dispatch endpoints in `vite.config.ts` using `nodemailer.verify()` and `sendMail()` → Verify: Connection and test sends return genuine SMTP socket responses.
- [x] Task 3: Implement Convex live SMTP and email logging backend actions in `convex/smtp.ts` and `convex/http.ts` → Verify: Real transaction logging in `email_logs`.
- [x] Task 4: Rebuild the SMTP Settings tab in `SiteSettingsManager.tsx` with simplified, professional UI (Real-time Status Card, Server Config, Auth, Sender Info, Test Buttons, Test Email Card, and Activity Logs) → Verify: All buttons work, inputs validate, real server status reflects live.
- [x] Task 5: Enhance `LiveEmailViewerModal.tsx` and Transaction Log detail viewer to inspect genuine SMTP headers and response codes → Verify: Modal shows authentic server responses.
- [x] Task 6: End-to-end verification and testing with `npm run build` → Verify: Build passes cleanly with 0 errors.

## Done When
- [x] "Test SMTP Connection" connects to real server, verifies handshake & credentials, and shows actual server status.
- [x] "Send Test Email" submits real email through configured SMTP, returns authentic response, and email arrives in recipient inbox.
- [x] System never shows fake or simulated success.
- [x] Activity logs display real transactions with full details.
