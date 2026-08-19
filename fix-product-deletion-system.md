# Fix & Optimize Product Deletion System (Single & Multi-Select Bulk Delete)

## Problem Analysis & Root Causes
1. **Fallback Resurrecting Deleted Products**:
   - When products were deleted from Firestore, `src/lib/supabase.ts` lines 390-400 checked if Firestore count was less than fallback count (`liveScrapedProducts.length`), and automatically re-injected all missing products from the fallback seed dataset.
   - Deletions were not tracked with a persistent tombstone/deleted-id registry, causing deleted products to reappear on refresh or next fetch.
2. **Stale Closure in Multi-Select Loop**:
   - `handleBulkDelete` in `AdminDashboard.tsx` looped through IDs calling `deleteProduct(id)`. Inside `useMenu.ts`, `setProducts(products.filter(...))` used a stale `products` closure rather than functional updates `setProducts(prev => ...)`.
   - As a result, deleting 79 selected items would only remove the last item in state.
3. **Missing Batch Delete in Storage & Local Cache**:
   - Deleting did not update `localStorage.getItem('slimdose_products_cache')` or handle batch Firestore deletion (`in` operator or batch `deleteDoc`).
4. **UI Deletion Triggers & Password Check**:
   - The deletion modal/action buttons used blocking browser `alert()` and `confirm()` instead of seamless modern confirmation dialogues with `fireToast` notifications.

---

## 3-Phase Implementation Plan

### Phase 1: Persistence & Tombstone Registry (`database-architect` / `backend-specialist`)
- In [`src/lib/supabase.ts`](file:///c:/Users/User/OneDrive/Desktop/SASE%20PROJECT/SLIMDOSE%20Website/SlimDose%20Website-App/src/lib/supabase.ts):
  - Add persistent deleted IDs tombstone tracking in Firestore (collection `deleted_records`) and `localStorage` (`slimdose_deleted_ids`).
  - When `delete()` runs with `.eq('id', id)` or `.in('id', ids)`, record the deleted IDs into the tombstone registry.
  - In `execute()`, filter out tombstoned IDs before merging fallback datasets so deleted products NEVER reappear.
  - Implement bulk `in` query deletion in `SupabaseQueryBuilder`.

### Phase 2: Menu Hook & Bulk Deletion Support (`backend-specialist` / `frontend-specialist`)
- In [`src/hooks/useMenu.ts`](file:///c:/Users/User/OneDrive/Desktop/SASE%20PROJECT/SLIMDOSE%20Website/SlimDose%20Website-App/src/hooks/useMenu.ts):
  - Implement `deleteProduct(id: string)` with functional state updates `setProducts(prev => ...)` and immediate local cache sync.
  - Implement `deleteMultipleProducts(ids: string[])` to delete multiple items simultaneously in a single optimized operation.
  - Clean up associated product variations from state and storage.

### Phase 3: Admin UI Single & Multiple Deletion Flow (`frontend-specialist` / `test-engineer`)
- In [`src/components/AdminDashboard.tsx`](file:///c:/Users/User/OneDrive/Desktop/SASE%20PROJECT/SLIMDOSE%20Website/SlimDose%20Website-App/src/components/AdminDashboard.tsx):
  - Enhance `handleDeleteProduct` and `handleBulkDelete` with progress indicators and `fireToast` feedback.
  - Ensure selection count (`79 selected`) and `Delete (X)` button executes `deleteMultipleProducts(Array.from(selectedProducts))`.
  - Clear selection (`setSelectedProducts(new Set())`) immediately upon deletion.
  - Run full test suite & production build verification.

---

## Verification Criteria
- [ ] Deleting a single product permanently removes it from the table and cache.
- [ ] Deleting multiple selected products (e.g., all 79 or any subset) removes all selected products simultaneously.
- [ ] Page reload does NOT resurrect deleted products.
- [ ] `npm run build` passes with 0 errors.
