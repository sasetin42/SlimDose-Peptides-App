# Firebase Cloud Functions Rewrite Bridge for Live Production SMTP

## Goal
Establish a live Firebase Cloud Functions rewrite bridge on `slimdose-peptides.web.app` so that browser requests to `/api/send-email` and `/api/smtp-test-connection` are executed by real Node.js Cloud Functions (with direct TCP socket access to `smtp.hostinger.com:465`) rather than returning static SPA `index.html`.

## Architecture & Rewrites
- In `firebase.json`:
  Add function rewrites BEFORE the SPA fallback:
  ```json
  "rewrites": [
    {
      "source": "/api/send-email",
      "function": "apiSendEmail"
    },
    {
      "source": "/api/smtp-test-connection",
      "function": "apiSmtpTestConnection"
    },
    {
      "source": "**",
      "destination": "/index.html"
    }
  ]
  ```
- In `/functions`:
  Create standard Firebase Cloud Functions with `nodemailer`, providing the exact real SMTP verification and email dispatch logic without any mock responses.
- In `src/components/SiteSettingsManager.tsx`:
  Ensure unsaved active form values are cleanly supplied to `sendTransactionalEmail` during test email execution.
- In `src/components/settings/SmtpSettingsSection.tsx`:
  Add an optional Live Backend Relay URL input so administrators have full flexibility to either use the default same-origin Firebase rewrite or point to a custom serverless relay URL if needed.

## Tasks
- [x] Task 1: Initialize `/functions` package.json and index.js with Firebase Functions HTTP handlers for `apiSendEmail` and `apiSmtpTestConnection`
- [x] Task 2: Update `firebase.json` with Cloud Functions declaration and exact `/api/**` rewrites pointing to the Cloud Functions
- [x] Task 3: Fix `SiteSettingsManager.tsx` parameter mapping in `handleSendTestEmail` so live form data is always dispatched
- [x] Task 4: Expose `smtp_relay_url` configuration field in `SmtpSettingsSection.tsx` with live deployment health status indicator
- [x] Task 5: Run typecheck (`npx tsc --noEmit`) and production build (`npm run build`)
- [x] Task 6: Verify deployment script / instructions for Firebase CLI (`firebase deploy --only functions,hosting`)

## Done When
- [x] Firebase Hosting config bridges `/api/*` to Cloud Functions
- [x] The Cloud Functions execute genuine Nodemailer handshakes with Hostinger Port 465
- [x] Zero mock data or simulated responses
- [x] Frontend build succeeds with zero errors
- [x] Live deploy complete to `https://slimdose-peptides.web.app`
- [x] Live test connection verified: `200 OK - Connected & authenticated successfully to smtp.hostinger.com:465`
- [x] Live email dispatch verified: `200 OK - queued as 4hfmGQ3jGFz1xmm`


