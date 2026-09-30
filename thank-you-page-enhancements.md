# Task Plan: Thank You Page Enhancements (Order Message Box + Telegram Button + What Happens Next Section)

## Overview
Implement the visual and functional enhancements to `src/components/Success.tsx` based on the user's uploaded reference images:
1. **Order Message Box with Copy Functionality**: A card displaying the formatted order message details with a single-click "Copy" button.
2. **"Open Telegram" Action Button**: A call-to-action button linking directly to Telegram (`https://t.me/slimdose_mnl`), complete with helper text.
3. **"What Happens Next?" Process Timeline**: A styled numbered steps card matching the design details from Image 3.

## User Review Required
> [!IMPORTANT]
> - Order Message text is dynamically formatted from the order object (Ref number, Date & Time, Customer Name, Email, Phone, Items, Shipping Address, Payment Method, Total).
> - Telegram button opens `https://t.me/slimdose_mnl` in a new tab.

## Proposed Changes

### Component: `src/components/Success.tsx`

#### [MODIFY] [Success.tsx](file:///c:/Users/User/OneDrive/Desktop/SASE%20PROJECT/SLIMDOSE%20Website/SlimDose%20Website-App/src/components/Success.tsx)

- Add state for order message copy feedback (`orderMsgCopied`).
- Build helper `buildFormattedOrderMessage(order)` to compose clean text matching image 2.
- Render **Your Order Message** box with the **Copy** button.
- Render **Open Telegram** button with light bulb tip below ("If Telegram doesn't open, copy the message above and visit our page manually").
- Render **What Happens Next?** card with 5 step indicator badges matching Image 3 styling.

## Verification Plan

### Automated Verification
- Run `npx tsc --noEmit` to ensure zero compilation or type errors.

### Manual Verification
- View Success page to confirm Order Message box, Copy action feedback, Telegram button, and "What Happens Next?" step list render pixel-perfect.
