# Increase Payment Method QR Code Size

## Goal
Increase the QR code display size across all Payment Methods in Checkout to provide high-clarity scanning and prominent visibility on all screen sizes (mobile, tablet, and desktop).

## Tasks
- [x] Task 1: Update the QR code image and container styling in [Checkout.tsx](file:///c:/Users/User/OneDrive/Desktop/SASE%20PROJECT/SLIMDOSE%20Website/SlimDose%20Website-App/src/components/Checkout.tsx) from `w-40 sm:w-52 md:w-60` to larger prominent dimensions (e.g. `w-64 h-64 sm:w-80 sm:h-80 md:w-96 md:h-96 max-w-full`) with crisp image rendering and click-to-expand / preview capability → Verify: QR code is noticeably larger, easy to scan with phones, and responsive on mobile devices.
- [x] Task 2: Typecheck & production build verification → Verify: `npx tsc --noEmit` and build pass without errors.

## Done When
- [x] Payment QR codes are significantly larger and clearer on both mobile and desktop.
- [x] Layout remains centered and responsive without overflowing container margins.
