# Plan: Complete Realtime Philippine Geographic Locations Hierarchy (PSGC)

## Objective
Implement complete, accurate, and live cascading Philippine location dropdowns (**Province** → **City / Municipality** → **Barangay** → **ZIP / Postal Code**) across the checkout and address management interfaces.

---

## Key Deliverables

1. **PSGC Live API Integration & Smart Caching (`src/lib/philippineLocations.ts`)**:
   - Integrate official PSGC (Philippine Standard Geographic Code) endpoints (`psgc.gitlab.io/api/`).
   - Implement local browser caching (`localStorage` / in-memory) for instant 0ms responses.
   - Comprehensive bundled baseline of all 82 Provinces + 1,600+ Cities/Municipalities + ZIP codes for 100% reliable offline fallback.

2. **Cascading React Hook (`src/hooks/usePhilippineLocations.ts`)**:
   - Realtime fetching and filtering for Provinces, Cities, and Barangays.
   - Automatic ZIP code assignment and shipping zone detection (`LUZON`, `VISAYAS`, `MINDANAO`, `MAXIM`).

3. **Enhanced Checkout UI & Live Dropdowns (`src/components/Checkout.tsx`)**:
   - Province selector with live search, region grouping, and total count badges.
   - Dynamic City/Municipality selector showing exact city counts based on the chosen Province.
   - Dynamic Barangay selector showing exact live barangays based on the chosen City.
   - Automated ZIP/Postal Code calculation with manual override option.

4. **Customer Dashboard Alignment (`src/components/CustomerDashboard.tsx`)**:
   - Sync the same complete location dataset in customer address book management.

---

## Verification Criteria
- [ ] Selecting any province immediately lists its authentic cities/municipalities.
- [ ] Selecting any city/municipality immediately lists its authentic barangays and auto-populates the correct ZIP code.
- [ ] Realtime search filtering works smoothly across all dropdowns.
- [ ] Zero build or runtime errors (`npm run build`).
