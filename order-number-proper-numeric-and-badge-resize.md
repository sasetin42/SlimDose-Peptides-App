# Task Plan: Mandate Purely Numeric SDP Orders (SDP-00000) & Compact 'Paid via GCash' Badge

## Context & Objectives
- **User Request:** 
  1. "Paid via GCash decrease the size."
  2. "Please make the Order number change into SDP-00000, meaning after the SDP make it properly number only and please apply this to all the Orders completely. and make it this apply as a default."
- **Reference Artifact:** Screenshot showing orders in mobile view (Order #SDP-ODPWY... and Order #SDP-EPPU6F...) where alphanumeric Firestore IDs were converted to SDP-<letters>, causing truncation (Order #SDP-ODPWY...) and pushing against a large Paid via GCash pill badge.

## Technical Architecture & Core Decisions
1. **Mandate Strictly Numeric Order Numbers after 'SDP-' (SDP-##### / SDP-######):**
   - In orderUtils.ts:
     - Every order must have an integer sequence / digits after SDP-.
     - No letters or alphanumeric hash doc IDs (e.g. EPPU6FOK or ODPWY...) should be shown after SDP-.
     - When an order has no digits or has an alphanumeric doc ID, derive a deterministic numeric code from its creation date, fallback index, or consistent numeric hash (e.g. positive integer % 900000 + 100000, or index padded like SDP-000123).
     - Standardize digit padding to 5 or 6 digits (e.g. SDP-00001 or SDP-000001), ensuring that all order numbers consistently display as SDP-<digits-only>.
     - Update uildOrderIdMap: assigns stable sequential numeric IDs (SDP-00001, SDP-00002...) so every order in the list is guaranteed to have a clean, numeric reference.
   - In Checkout.tsx:
     - Explicitly generate purely numeric 5-digit order numbers SDP- and assign to orderPayload.order_number before database insert, with fallback IDs also using digits only.
2. **Compact the 'Paid via GCash' Badge on Mobile Cards (OrdersManager.tsx):**
   - Reduce font size, padding, and icon size of the Paid via {paymentMethod} pill on mobile cards (e.g. 	ext-[9.5px] px-2 py-0.5 gap-1 shrink-0).
   - Allow the order title to have sufficient space so it doesn't truncate prematurely into Order #SDP-ODP....
3. **Apply Uniformly Across All Components:**
   - OrdersManager.tsx (mobile cards, desktop table, detail modals)
   - AdminDashboard.tsx
   - InvoiceVerificationsManager.tsx
   - CustomerDashboard.tsx
   - Success.tsx
   - OrderTracking.tsx

## Verification Plan
- Run 
px tsc --noEmit.
- Run 
pm run build.
- Verify mobile card header fits without truncation and badge is nicely compact.
