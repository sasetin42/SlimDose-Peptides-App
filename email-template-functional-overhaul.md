# Task Plan: Full Functionality & Integration Overhaul for Email Notification Templates

## Context & Objectives
- **Goal:** Make sure that all email templates (especially all ordering notifications) are fully functional, completely working, and integrated end-to-end with the live SMTP service, real order events, and the Admin Email Template Studio.
- **Reference Artifacts:** Screenshots of the Email Template Studio showing the template selection dropdown with all order notification types (order-confirmed, order-received, order-processing, order-shipped, order-delivered, order-cancelled, order-confirmation, payment-confirmed, order-dispatched, etc.) and the Live Viewport Preview.

## Identified Gaps & Technical Architecture
1. **Category & Variable Mapping Inconsistency:**
   - Templates order-confirmation, payment-confirmed, and order-dispatched were marked with category: 'transactional' and COMMON_VARIABLES.transactional, which is undefined in COMMON_VARIABLES (only orders, marketing, customer, system exist).
   - This prevents them from showing under the 'Order Notifications' tab in EmailTemplateManager.tsx and causes undefined variable chips in the template editor.
   - Solution: Normalize all order-related templates to category: 'orders' and use COMMON_VARIABLES.orders.
2. **Order Reference & Sample Data Standardization:**
   - In emailRenderer.ts, preset sample datasets still used legacy sample codes SD-90412, SD-88190, SD-99000. Standardize them to SDP-090412, SDP-088190, SDP-099000 to maintain SDP compliance.
3. **End-to-End Triggering & Dispatch Alignment:**
   - Ensure all order state transitions cleanly dispatch the appropriate email templates:
     - Order Placed / Checkout: dispatches order-received (or order-confirmed as configured).
     - Proof Verified: dispatches payment-confirmed via InvoiceVerificationsManager and OrdersManager.
     - Processing / Packing: dispatches order-processing.
     - Dispatched / Shipped: dispatches order-shipped / order-dispatched with tracking info.
     - Delivered: dispatches order-delivered + loyalty 	hank-you-order.
     - Cancelled: dispatches order-cancelled.
4. **Email Template Studio Enhancements:**
   - Support category filter dropdown sync: selecting a template should also adjust the active category filter if needed so the template is never hidden.
   - Ensure test email dispatching renders all variables with complete mock/sample fallback data for accurate previews.

## Implementation Tasks
1. **Core Templates & Variables (src/utils/emailDefaults.ts):**
   - Fix categories and variables for order-confirmation, payment-confirmed, and order-dispatched to orders.
   - Ensure all order templates define rich HTML, matching modern branding and all standard merge tags ({{ order_number }}, {{ customer_name }}, {{ items_table_html }}, {{ total_price }}, etc.).
2. **Template Renderer (src/utils/emailRenderer.ts):**
   - Update preset sample datasets to standard SDP- order references.
   - Ensure resilient fallback for all tags including OTPs, URLs, item tables, and delivery tags.
3. **Service Layer (src/services/emailService.ts):**
   - Ensure all 9 order template keys are recognized in OrderTemplateKey and properly formatted with fallback items, tracking URL, and admin alerts.
4. **Admin Studio (src/components/EmailTemplateManager.tsx):**
   - Verify category selection and preview rendering for all 15+ templates across all 4 categories.
   - Test email dispatching verification with live Hostinger SMTP settings.

## Verification
- Run 
px tsc --noEmit.
- Run 
pm run build.
- Verify all template keys can be selected, edited, previewed, and dispatched without errors.
