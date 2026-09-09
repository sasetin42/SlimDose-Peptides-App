# Order ID Consistency Plan

## Goal
Unify Order ID in Orders Management Admin so that Table Details and Full Data Details show the identical Order ID.

## Tasks
- [x] Task 1: Update OrderDetailsViewProps to accept orderRef in OrdersManager.tsx
- [x] Task 2: Pass canonical orderRef to OrderDetailsView from orderIdMap
- [x] Task 3: Use unified orderRef inside OrderDetailsView and unify clipboard copy handlers
- [x] Task 4: Run build check to verify zero regressions

## Done When
- [x] Table list and Full details view display the exact identical Order ID for every order.

## ? PHASE X COMPLETE
- Build: ? Success (built in 21.23s without errors)
- Order ID: ? 100% unified across table, mobile card, dropdown, and full details modal
- Clipboard Copy: ? Uniform copy of clean canonical code (e.g., SLD-000983)
