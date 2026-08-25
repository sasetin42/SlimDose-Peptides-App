# Project Plan: Guaranteed Real Email Inbox Delivery

## 1. Goal
Fix the email delivery engine so that clicking "Send Test Email" delivers real, physical emails directly to the recipient's inbox (`cesartrongcoso@gmail.com`) via active HTTPS mail delivery relays (Resend, SendGrid, Brevo, and zero-setup outbound gateway).

## 2. Domains & Assigned Specialized Agents
- `project-planner`: Architecture & outbound protocol plan
- `backend-specialist`: `emailService.ts` live HTTPS email gateways & multi-provider routing
- `frontend-specialist`: Enhanced delivery feedback banners & instructions in `SiteSettingsManager.tsx` and `EmailTemplateManager.tsx`
- `test-engineer`: Verification, type checking, and production build testing

## 3. Key Solutions
1. **Direct HTTPS Email API Relay**:
   - Resend API (`https://api.resend.com/emails`)
   - SendGrid API (`https://api.sendgrid.com/v3/mail/send`)
   - Brevo API (`https://api.brevo.com/v3/smtp/email`)
2. **Zero-Setup Outbound Gateway Fallback**:
   - When no custom API key is present or when testing with Gmail credentials from browser, the dispatcher uses an active HTTPS gateway to physically deliver the HTML email to `cesartrongcoso@gmail.com` immediately.
3. **Transparent Delivery Feedback**:
   - Alerts the user to check their Inbox & Spam folders with transmission tracking.
