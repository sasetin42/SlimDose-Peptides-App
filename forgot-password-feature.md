# Project Plan: Fully Functional Forgot Password Subsystem

## 1. Goal
Add a complete, secure, and user-friendly **Forgot Password** workflow to the Customer Authentication modal (`CustomerAuthModal.tsx`), allowing users to request a 6-digit OTP reset code sent via Hostinger/SMTP transactional email, verify their PIN, reset their password, and immediately log in.

## 2. Domains & Assigned Specialized Agents
- `project-planner`: Architecture & state machine in [`forgot-password-feature.md`](file:///c:/Users/User/OneDrive/Desktop/SASE%20PROJECT/SLIMDOSE%20Website/SlimDose%20Website-App/forgot-password-feature.md)
- `backend-specialist`: Password reset email dispatcher & database credential update logic in `emailService.ts` and `supabase.ts`
- `frontend-specialist`: Responsive 2-step Forgot Password UI, PIN inputs, and validation in `CustomerAuthModal.tsx`
- `test-engineer`: Verification, type checking, and production build testing

## 3. Key Solutions
1. **Forgot Password Link & Switcher**:
   - Easily accessible from the password field on the Sign In form.
2. **Step 1: Request 6-Digit PIN**:
   - Validates email and dispatches branded OTP email through Hostinger / active SMTP relay.
3. **Step 2: Enter PIN & Set New Password**:
   - SHA-256 client hashing + database sync across Supabase / Firebase.
   - Auto-login and VIP Portal entry.
