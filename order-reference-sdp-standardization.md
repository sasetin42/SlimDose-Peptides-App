# Task Plan: Mandate 'SDP' Order Reference Across All Systems

## Context & Objectives
- **Goal:** Mandate and standardize by default that all order references start with SDP across the entire application (Storefront + Backend Admin Panel).
- **Trigger:** Order confirmation screenshot showed ORDER REF: ORD-EPPU6FOK due to fallback patterns; some existing utilities use SLD- or #ORD-.

## Implementation Strategy
1. **Core Utilities (src/utils/orderUtils.ts):**
   - Change default order prefix from SLD- to SDP-.
   - Update normalization logic (
ormalizeToSdp) to convert any legacy SLD-, ORD-, or raw numbers into SDP-######.
   - Ensure alphanumeric fallback IDs strip unwanted prefixes and format to SDP-XXXXXX.
2. **Storefront Customer Views:**
   - src/components/Success.tsx: Replace ORD- with ormatOrderId(order, { prefix: false }).
   - src/components/Checkout.tsx: Save explicit order_number in orderPayload and remove ORD- fallbacks.
   - src/components/CustomerDashboard.tsx: Ensure order tags display #SDP-....
   - src/components/OrderTracking.tsx: Support SDP order search queries seamlessly.
3. **Backend Admin Panel:**
   - src/components/OrdersManager.tsx: Standardize table cards, details modal, and search to SDP-....
   - src/components/AdminDashboard.tsx: Format recent orders and verification cards to SDP-....
   - src/components/InvoiceVerificationsManager.tsx & CustomerCRMManager.tsx: Ensure all linked order references display SDP-....

## Verification Steps
- Run TypeScript compile check (
px tsc --noEmit).
- Run build check (
pm run build).
- Verify visual output alignment with user requirement.
