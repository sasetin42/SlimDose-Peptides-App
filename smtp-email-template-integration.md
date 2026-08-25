# Project Plan: Comprehensive SMTP Integration & Dynamic Email Template Studio

## 1. Goal
Build a complete, fully functional, and deeply integrated SMTP Email Relay and dynamic Email Template System that allows administrators to configure SMTP credentials, edit/update/save/reset email templates with live dynamic variables, test dispatch emails via active SMTP, and automate customer transactional notifications.

## 2. Domains & Assigned Specialist Agents
- `project-planner`: Architecture & end-to-end flow planning
- `database-architect` / `backend-specialist`: `emailService.ts` relay dispatcher, dynamic template loader, and database integration
- `frontend-specialist`: `SiteSettingsManager.tsx` SMTP tab & `EmailTemplateManager.tsx` studio enhancements
- `test-engineer`: Verification, type checking, and production build testing

## 3. Key Deliverables
1. **`src/services/emailService.ts`**:
   - Universal SMTP dispatcher supporting direct API relays (SendGrid, Resend, Brevo, Gmail SMTP, Custom SMTP, Supabase edge function).
   - Dynamic template compiler matching active orders to saved templates.
   - Live test verification engine.
2. **`src/components/SiteSettingsManager.tsx` (SMTP Relay Tab)**:
   - Full UI matching user design with 1-click provider presets, port/security switcher, revealable credentials, master toggle, automated triggers, and live diagnostic test sender.
3. **`src/components/EmailTemplateManager.tsx` (Email Studio)**:
   - Live SMTP status indicator in studio toolbar.
   - Direct test email dispatch using configured SMTP credentials.
   - Responsive Desktop & Mobile viewport preview with realistic sample order data.
   - Dynamic variable chips, factory reset, custom template creation, and HTML export.
4. **Automated Order Hooks**:
   - Integrated with Checkout and OrdersManager for automated customer receipts and status updates.
