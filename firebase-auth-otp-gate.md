# Plan: Strict Firebase Authentication Email Verification & OTP Rejection

## Goal
If an email address is not found in Firebase Authentication, strictly reject the OTP generation and render prominent Error / Caution details on screen.

## Tasks
1. **[Core]** Enforce strict `checkEmailRegisteredInFirebaseAuth` pre-flight gate in [`CustomerAuthModal.tsx`](file:///c:/Users/User/OneDrive/Desktop/SASE%20PROJECT/SLIMDOSE%20Website/SlimDose%20Website-App/src/components/CustomerAuthModal.tsx).
2. **[UI/UX]** Render high-visibility warning caution details card with `AlertTriangle` badge, explanation message, and 1-click `"Create Account for [email] →"` CTA button.
3. **[Security]** Ensure un-provisioned emails cannot receive OTP or bypass the Firebase Auth check.
4. **[Verification]** Run `npm run build` to guarantee 0 compile errors.
