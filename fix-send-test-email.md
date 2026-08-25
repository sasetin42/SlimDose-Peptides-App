# Project Plan: Fix Send Test Email & Verification Test Data Details

## 1. Goal
Fix the **Send Test Email** functionality across Site Settings and Email Template Studio to eliminate false-positive `skipped_disabled` reference IDs, implement real multi-provider API dispatchers (Resend, SendGrid, Brevo, Gmail SMTP), and display comprehensive verification test email data details.

## 2. Domains & Assigned Specialized Agents
- `project-planner`: Root cause analysis & architecture plan
- `backend-specialist`: Multi-provider API dispatchers (Resend, SendGrid, Brevo, Gmail Relay) in `emailService.ts`
- `frontend-specialist`: Enhanced diagnostics cards and verification test details in `SiteSettingsManager.tsx` and `EmailTemplateManager.tsx`
- `test-engineer`: Verification, type checking, and production build testing

## 3. Key Solutions
1. **Never Skip on Test Send**:
   - `isTest: true` parameter bypasses master `smtp_enabled === false` so testing credentials works on-demand.
2. **Direct Outbound Delivery API Dispatchers**:
   - **Resend**: HTTPS REST API with `re_...` key.
   - **SendGrid**: HTTPS REST API with `SG....` key.
   - **Brevo**: HTTPS REST API with `xkeysib-...` key.
   - **Gmail / Custom SMTP**: Enhanced relay dispatcher.
3. **Comprehensive Verification Data Details**:
   - Recipient, Sender, Host, Port, Protocol, Triggers, Manila timestamp, and real transmission reference IDs.
