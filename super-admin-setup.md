# Super Admin Setup Implementation Plan

## Objective
Grant "Super Admin" privileges to the user with the following credentials:
- **Identifier (Email):** `admin@gmail.com`
- **User UID:** `nRN46sB5qdPt7Mo6hkqu0A0HZvH3`

## Current Architecture Research
The project utilizes Firebase for authentication and database (Firestore), but interfaces with it using a custom adapter in `src/lib/supabase.ts` which mimics the Supabase SDK syntax. 

Currently, admin user roles are managed in:
1. **Firestore Collection (`admin_users`)**: Documents in this collection store the user roles. Currently, the document ID is the user's email.
2. **`src/lib/supabase.ts` (Firebase Adapter)**:
   - Contains a seeding script that injects `admin@gmail.com` as a `super_admin` if the `admin_users` collection is empty.
   - Contains a hardcoded authentication bypass in `signInWithPassword` for `admin@gmail.com`.
3. **`src/components/AdminDashboard.tsx`**:
   - Contains a `LOCAL_ADMINS` array used as a fallback for authentication.
   - Manages client-side sessions using `sessionStorage`/`localStorage`.
   - Role-based view access checks (e.g., restricts `content_editor` and `order_manager`, but implicitly allows `super_admin` and `admin` to see all views).
4. **`firestore.rules`**:
   - Currently, writes to sensitive collections (like `admin_users`) only require `request.auth != null`.

## Planned Changes

### 1. Database (Firestore) & `admin_users` Collection Update
- Update or create the document in the `admin_users` collection for `admin@gmail.com` to map to the specified UID (`nRN46sB5qdPt7Mo6hkqu0A0HZvH3`).
- **Proposed Document Data:**
  ```json
  {
    "id": "nRN46sB5qdPt7Mo6hkqu0A0HZvH3",
    "email": "admin@gmail.com",
    "role": "super_admin",
    "name": "Super Admin"
  }
  ```
- *Note: The current schema uses the email as the document ID (e.g. `doc(db, 'admin_users', email)`). We should plan to either continue this pattern or migrate to using UIDs as document IDs for better standard practice and security.*

### 2. Updates to `src/lib/supabase.ts`
- Clean up or update the seeding logic to ensure `admin@gmail.com` is created with the correct properties.
- Map the Firebase User UID (`nRN46sB5qdPt7Mo6hkqu0A0HZvH3`) correctly during the `getSession` and `signInWithPassword` methods to ensure the frontend uses the proper UID instead of just the email fallback.

### 3. Updates to `src/components/AdminDashboard.tsx`
- Add `admin@gmail.com` with role `super_admin` to the `LOCAL_ADMINS` fallback array (if required to be there as a local fallback).
- Ensure the password verification function `verifyAdminPassword` correctly handles this user without breaking the fallback loop.
- No changes needed for view restrictions since `super_admin` is already implicitly granted full access (it bypasses the `isStaff` restrictions).

### 4. Security Improvements (Optional but Recommended)
- **`firestore.rules`**: Update the rules for `admin_users` and other sensitive collections to strictly check if the logged-in UID has a `role == 'super_admin'` or `role == 'admin'` in their `admin_users` document, instead of just `request.auth != null`.
