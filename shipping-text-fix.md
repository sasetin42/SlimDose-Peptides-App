# Shipping Text Fix Plan

## Goal
Update the shipping label in Orders Details Financial Summary from 'PAID UPON DELIVERY (Customer pays rider — Not Free)' to 'COD (Customer pays Rider)'.

## Tasks
- [x] Task 1: Update shipping fee fallback in OrdersManager.tsx to 'COD (Customer pays Rider)'
- [x] Task 2: Build verification via npm run build

## Done When
- [x] Orders details view displays 'COD (Customer pays Rider)' whenever shipping fee is 0/empty.
