# Remove Account Number & Account Name Display In Payment Methods

## Goal
Remove the "Account Number" and "Account Name" info blocks shown inside the checkout payment method section (as shown in the user screenshot) across the payment method cards/display.

## Tasks
- [x] Task 1: Inspect and update [Checkout.tsx](file:///c:/Users/User/OneDrive/Desktop/SASE%20PROJECT/SLIMDOSE%20Website/SlimDose%20Website-App/src/components/Checkout.tsx) to remove the 2-column Account Number and Account Name boxes from the payment instructions view → Verify: Payment method section only shows the clean QR code, payment method name, amount to pay, and receipt upload without the account number/name boxes.
- [x] Task 2: Check if method button cards or other areas show the redundant text and clean up accordingly → Verify: Checkout UI is uncluttered and clean.
- [x] Task 3: Build & typecheck verification → Verify: `npx tsc --noEmit` and build pass cleanly.

## Done When
- [x] The "ACCOUNT NUMBER" and "ACCOUNT NAME" block shown in the screenshot is removed from the payment methods in Checkout.
- [x] QR code, Amount to Pay, and Receipt upload remain fully functional.
