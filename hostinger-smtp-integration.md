# Project Plan: Full Hostinger Email SMTP Integration

## 1. Goal
Integrate **Hostinger Email (`smtp.hostinger.com:465`)** as a first-class email relay provider with a dedicated 1-click preset, full credential synchronization for `info@slimdoseph.com`, and seamless outbound delivery for transactional notifications and verification tests.

## 2. Domains & Assigned Specialized Agents
- `project-planner`: Architecture & Hostinger connection mapping in [`hostinger-smtp-integration.md`](file:///c:/Users/User/OneDrive/Desktop/SASE%20PROJECT/SLIMDOSE%20Website/SlimDose%20Website-App/hostinger-smtp-integration.md)
- `backend-specialist`: Hostinger mail transport & relay handlers in `emailService.ts`
- `frontend-specialist`: Dedicated Hostinger Email preset button & diagnostics in `SiteSettingsManager.tsx` and `EmailTemplateManager.tsx`
- `test-engineer`: Verification, type checking, and production build testing

## 3. Key Solutions
1. **Hostinger Email 1-Click Preset**:
   - `host`: `smtp.hostinger.com`
   - `port`: `465`
   - `secure`: `true` (SSL/TLS)
   - `user` / `fromEmail`: `info@slimdoseph.com`
2. **Dedicated Dispatcher Routing**:
   - Authenticated delivery using Hostinger SMTP credentials with real outbound delivery.
3. **Template & Test Verification**:
   - Live test sender displays Hostinger provider badge and sends branded verification emails.
