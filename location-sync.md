# Plan: PH Location Hierarchy Sync (Province → City → Barangay → Zip Code)

## Overview
Ensure 100% accurate, seamless, real-time sync across the Philippine address hierarchy during Checkout:
1. **Province → City Sync**: Selecting a Province dynamically populates all available Cities/Municipalities for that Province, resets invalid City and Barangay selections, and clears the Zip Code.
2. **City → Barangay Sync**: Selecting a City dynamically populates all exact Barangays for that City, resets any previous Barangay selection, and auto-fills the precise Postal/Zip code.
3. **Data Integrity**: Provide comprehensive data mapping in `philippineLocations.ts` with fallback generators so no Province/City combination ever displays empty lists or mismatched data.

## Project Type
WEB (React + TypeScript + Tailwind CSS)

## Success Criteria
- [ ] Selecting any Province immediately filters Cities to show only cities in that Province.
- [ ] Selecting a City populates the exact corresponding Barangays and auto-fills the Zip code.
- [ ] Changing Province or City resets child selections clean without leftover stale text or state.
- [ ] Dropdowns render on top (`z-[9999]`) and unclipped.
- [ ] `npm run build` passes with zero errors.

## Task Breakdown

### Phase 1: Planning & Data Mapping
- [x] Task 1: Create `location-sync.md` plan file (**Agent**: `project-planner`).

### Phase 2: Implementation
- [x] Task 2: Refine `philippineLocations.ts` data mapping and lookup helpers (`getCitiesForProvince`, `getBarangaysForCity`) to guarantee 100% matching and zero missing records (**Agent**: `frontend-specialist`).
  - **INPUT**: `provinceNameOrCode`, `cityNameOrCode`
  - **OUTPUT**: Filtered Cities array & Barangays array
  - **VERIFY**: Unit test / function test returns non-empty arrays with accurate zip codes for all provinces.
- [x] Task 3: Enhance state reactivity and reset handlers in `src/components/Checkout.tsx` (**Agent**: `frontend-specialist`).
  - **INPUT**: User selects Province or City
  - **OUTPUT**: Child state resets (Province change clears City, Barangay, Zip; City change clears Barangay and updates Zip)
  - **VERIFY**: UI reactive state updates cleanly in real time.

### Phase 3: Verification (Phase X)
- [x] Task 4: Run production build and code linting (**Agent**: `test-engineer`).
  - **COMMAND**: `npm run build`
  - **VERIFY**: 0 TypeScript / Vite compilation errors.
