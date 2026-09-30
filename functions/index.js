/**
 * SlimDose Cloud Functions — entrypoint.
 * package.json "main" points here; every deployable function must be exported
 * (directly or via re-export) from this module.
 */

// HTTPS SMTP relay (hosting rewrites /api/send-email, /api/smtp-test-connection)
export { apiSendEmail, apiSmtpTestConnection } from './relay.js';

// 24/7 email automation scheduler (follow-ups + scheduled campaigns)
export { processEmailAutomations } from './scheduledEmails.js';

// Public order-tracking mirror (powers the anonymous /track-order page)
export { onOrderTrackingMirror, backfillOrderTracking } from './orderTracking.js';

// Guarded E2E verification endpoints (can be removed after verification)
export { seedTestFollowUp, e2eTestOrder } from './e2eVerify.js';
