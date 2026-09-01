# customer-crm-firebase-sync.md

## Goal
Completely eliminate duplicate email addresses in Customer CRM Directory, synchronize and link all customer email accounts to Firebase Authentication and Firestore, and ensure seamless OTP delivery and sign-in for all customer accounts.

## Tasks
- [ ] Task 1: Enforce strict email normalization and deduplication in [CustomerCRMManager.tsx](file:///c:/Users/User/OneDrive/Desktop/SASE%20PROJECT/SLIMDOSE%20Website/SlimDose%20Website-App/src/components/CustomerCRMManager.tsx) across all sources.
- [ ] Task 2: Enhance [firebaseAuth.ts](file:///c:/Users/User/OneDrive/Desktop/SASE%20PROJECT/SLIMDOSE%20Website/SlimDose%20Website-App/src/services/firebaseAuth.ts) to provision and link customer accounts to Firebase Auth & Firestore seamlessly.
- [ ] Task 3: Upgrade Bulk Sync and add 1-click individual Firebase Auth sync in [CustomerCRMManager.tsx](file:///c:/Users/User/OneDrive/Desktop/SASE%20PROJECT/SLIMDOSE%20Website/SlimDose%20Website-App/src/components/CustomerCRMManager.tsx).
- [ ] Task 4: Connect OTP verification in [CustomerAuthModal.tsx](file:///c:/Users/User/OneDrive/Desktop/SASE%20PROJECT/SLIMDOSE%20Website/SlimDose%20Website-App/src/components/CustomerAuthModal.tsx) to recognize all synced Firebase customers and dispatch OTP emails reliably.
- [ ] Task 5: Run project build, security scanner, and lint validation scripts.

## Done When
- [ ] Customer CRM Directory has 0 duplicate email addresses.
- [ ] Syncing customers provisions/links them directly into Firebase Authentication and Firestore.
- [ ] Customers can request and receive their 6-digit OTP code without "No Data" false rejections.
