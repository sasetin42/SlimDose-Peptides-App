# customer-crm-realtime-auth-sync.md

## Goal
Make the "Sync Customer Accounts to Firebase Auth" fully functional, real-time, live-linked, and synchronize all customer profile email addresses directly into Firebase Authentication with zero duplicate email entries when clicking the "Start Bulk Sync Now" button.

## Tasks
- [ ] Task 1: Refine customer email deduplication in [CustomerCRMManager.tsx](file:///c:/Users/User/OneDrive/Desktop/SASE%20PROJECT/SLIMDOSE%20Website/SlimDose%20Website-App/src/components/CustomerCRMManager.tsx) to ensure 100% unique profiles across all source feeds.
- [ ] Task 2: Polish the `handleSyncAllToFirebase` real-time progress loop and status messaging in [CustomerCRMManager.tsx](file:///c:/Users/User/OneDrive/Desktop/SASE%20PROJECT/SLIMDOSE%20Website/SlimDose%20Website-App/src/components/CustomerCRMManager.tsx) with accurate dynamic counters and no hardcoded numbers.
- [ ] Task 3: Ensure [firebaseAuth.ts](file:///c:/Users/User/OneDrive/Desktop/SASE%20PROJECT/SLIMDOSE%20Website/SlimDose%20Website-App/src/services/firebaseAuth.ts) headless Identity Toolkit REST API provisioning updates both `/users` and `/customers` documents with `auth_linked: true`.
- [ ] Task 4: Run `npm run build` and `npm run lint -- --quiet` verification.

## Done When
- [ ] Clicking "Start Bulk Sync Now" synchronizes all unique customer accounts to Firebase Authentication and Firestore smoothly.
- [ ] Progress bar, count numbers (`X / Total`), and completion badges reflect exact live counts without duplications.
