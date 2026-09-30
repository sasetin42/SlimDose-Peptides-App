# Task: Philippine Geographic Database & Admin Panel Synchronization

## Goal
Implement a fully functional, complete Philippine Geographic database (82+ Provinces, Cities/Municipalities, Barangays, and ZIP/Postal Codes) in the Backend Admin Panel with two-way real-time synchronization to the customer Checkout selector.

## Tasks
- [x] Task 1: Create `src/lib/philippineLocationsDb.ts` with comprehensive data models, CRUD operations, database persistence (Supabase/Firestore + localStorage fallback cache), seeders, and real-time events. → Verify: `import` compiles and functions return data.
- [x] Task 2: Create React hook `src/hooks/usePhilippineLocationsAdmin.ts` providing filtered state, search, pagination, stats, and mutation handlers. → Verify: Hook exports all necessary state and actions cleanly.
- [x] Task 3: Build `src/components/PhilippineLocationsManager.tsx` featuring 4 interactive tabs (Provinces, Cities & Municipalities, Barangays, ZIP/Postal Codes), search/filtering, add/edit modals, active toggle, and seeder. → Verify: Component renders with responsive design and clean error handling.
- [x] Task 4: Integrate `PhilippineLocationsManager` into `src/components/AdminDashboard.tsx` under Orders & Customers menu (`#locations`) and link inside `src/components/ShippingManager.tsx`. → Verify: Navigating to `#locations` or clicking the tab in Shipping Manager displays the database.
- [x] Task 5: Connect `src/lib/philippineLocations.ts` and `src/components/Checkout.tsx` to read from the live synced database with event listener updates. → Verify: Modifying/adding locations in Admin instantly updates the Checkout dropdowns.
- [x] Task 6: Run build verification (`npm run build` or `npx tsc --noEmit`). → Verify: Zero TypeScript or bundling errors.

## Done When
- [x] Admin panel has a complete, working database for Provinces, Cities, Barangays, and ZIP Codes.
- [x] Administrators can add, edit, search, toggle status, and inspect any location and ZIP code.
- [x] The customer checkout dropdowns reflect any updates in real time.
- [x] Build and TypeScript checks pass cleanly.
