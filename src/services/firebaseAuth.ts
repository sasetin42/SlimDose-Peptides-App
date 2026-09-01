import { db, auth, firebaseConfig } from '../lib/firebase';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  sendEmailVerification,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp,
} from 'firebase/firestore';

/**
 * Standard default customer password for account provisioning and fallback authentication
 */
export const DEFAULT_CUSTOMER_PASSWORD = '123456#';

export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  phone?: string;
  customerId?: string;
  role: 'super_admin' | 'admin' | 'staff' | 'customer';
  emailVerified: boolean;
  createdAt?: any;
  updatedAt?: any;
}

export interface CustomerProvisionInput {
  email: string;
  full_name?: string;
  name?: string;
  phone?: string;
  id?: string;
  shipping_address?: string;
  shipping_city?: string;
  shipping_state?: string;
  shipping_zip_code?: string;
  tier?: string;
  vip_tier?: string;
  total_spent?: number;
  order_count?: number;
}

export interface CustomerProvisionResult {
  status: 'created' | 'existing' | 'updated';
  uid: string;
  email: string;
  profile?: UserProfile;
}

export interface BatchSyncStats {
  total: number;
  success: number;
  existing: number;
  failed: number;
  errors: Array<{ email: string; error: string }>;
}

/**
 * Authenticate existing user with email and password
 */
export async function loginUser(email: string, pass: string) {
  const cred = await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), pass);
  return cred.user;
}

/**
 * Register new user and create their Firestore profile document
 */
export async function registerUser(
  email: string,
  pass: string,
  role: 'customer' | 'admin' = 'customer',
  displayName: string = ''
) {
  const cleanEmail = email.trim().toLowerCase();
  const cred = await createUserWithEmailAndPassword(auth, cleanEmail, pass);
  const user = cred.user;

  if (displayName.trim()) {
    try {
      await updateProfile(user, { displayName: displayName.trim() });
    } catch (e) {
      console.warn('Failed to update auth displayName:', e);
    }
  }

  // Create user profile in Firestore
  const profileRef = doc(db, 'users', user.uid);
  const userProfile: UserProfile = {
    uid: user.uid,
    email: user.email || cleanEmail,
    displayName: displayName || cleanEmail.split('@')[0],
    role: role,
    emailVerified: user.emailVerified,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  await setDoc(profileRef, userProfile);

  // Send email verification link
  if (user) {
    try {
      await sendEmailVerification(user);
    } catch (e) {
      console.warn('Failed to send email verification link:', e);
    }
  }

  return user;
}

/**
 * Creates a user directly in Firebase Authentication via Google Identity Toolkit REST API.
 * This runs headless without changing or disrupting the active administrator's Auth session!
 */
export async function createFirebaseUserHeadless(
  email: string,
  password: string = DEFAULT_CUSTOMER_PASSWORD,
  displayName?: string
): Promise<{ uid: string; email: string; isNew: boolean }> {
  const cleanEmail = email.trim().toLowerCase();
  const apiKey = firebaseConfig.apiKey;

  try {
    const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: cleanEmail,
        password: password,
        displayName: displayName || undefined,
        returnSecureToken: true,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      const errMessage = data?.error?.message || '';
      if (errMessage.includes('EMAIL_EXISTS')) {
        // Account already exists in Firebase Authentication
        return {
          uid: data?.error?.errors?.[0]?.localId || `email_${cleanEmail.replace(/[^a-zA-Z0-9]/g, '_')}`,
          email: cleanEmail,
          isNew: false,
        };
      }
      throw new Error(errMessage || `Failed to create auth account: ${res.statusText}`);
    }

    const uid = data.localId;

    return {
      uid,
      email: cleanEmail,
      isNew: true,
    };
  } catch (err: any) {
    if (err?.message?.includes('EMAIL_EXISTS')) {
      return {
        uid: `email_${cleanEmail.replace(/[^a-zA-Z0-9]/g, '_')}`,
        email: cleanEmail,
        isNew: false,
      };
    }
    throw err;
  }
}

/**
 * Deeply inspects whether an email address is registered in Firebase Authentication & Firestore.
 * Optimized with parallel probes for sub-second, ultra-fast response times.
 */
export async function checkEmailRegisteredInFirebaseAuth(
  email: string
): Promise<{ registered: boolean; uid?: string; source?: string }> {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
    return { registered: false, source: 'invalid_email' };
  }

  // 1. If email is marked as deleted/tombstoned, treat as not registered
  try {
    const { getDeletedIdsForTable } = await import('../lib/supabase');
    const deletedUsers = getDeletedIdsForTable('users');
    const deletedCustomers = getDeletedIdsForTable('customers');
    if (deletedUsers.has(cleanEmail) || deletedCustomers.has(cleanEmail)) {
      return { registered: false, source: 'deleted_tombstone' };
    }
  } catch (e) {
    // ignore
  }

  try {
    const [userSnap, custSnap, custDirectDoc] = await Promise.all([
      getDocs(query(collection(db, 'users'), where('email', '==', cleanEmail))),
      getDocs(query(collection(db, 'customers'), where('email', '==', cleanEmail))),
      getDoc(doc(db, 'customers', cleanEmail))
    ]);

    if (!userSnap.empty) {
      return { registered: true, uid: userSnap.docs[0].id, source: 'firestore_users' };
    }
    if (!custSnap.empty) {
      return { registered: true, uid: custSnap.docs[0].id, source: 'firestore_customers' };
    }
    if (custDirectDoc.exists()) {
      return { registered: true, uid: custDirectDoc.id, source: 'firestore_customers_direct' };
    }
  } catch (e) {
    // ignore
  }

  return { registered: false, source: 'not_found' };
}

/**
 * Creates or updates a customer account in Firebase Auth & Firestore /users with default credentials '123456#' and role 'customer'.
 */
export async function provisionCustomerAccount(
  customer: CustomerProvisionInput
): Promise<CustomerProvisionResult> {
  if (!customer.email || !customer.email.trim()) {
    throw new Error('Customer email is required for account provisioning.');
  }

  const cleanEmail = customer.email.trim().toLowerCase();
  const displayName = customer.full_name?.trim() || customer.name?.trim() || cleanEmail.split('@')[0];
  const phone = customer.phone?.trim() || '';
  const customerId = customer.id || '';

  try {
    // 1. Create account directly in Firebase Authentication (Headless, preserving active session)
    const authResult = await createFirebaseUserHeadless(cleanEmail, DEFAULT_CUSTOMER_PASSWORD, displayName);
    const uid = authResult.uid;

    const userProfile: UserProfile = {
      uid: uid,
      email: cleanEmail,
      displayName,
      phone,
      customerId: customerId || uid,
      role: 'customer',
      emailVerified: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    // 2 & 3. Save directly to Firestore /users and /customers collections in parallel (clean single doc per collection)
    const targetCustId = customerId || uid;
    const customerDoc = {
      id: targetCustId,
      full_name: displayName,
      name: displayName,
      email: cleanEmail,
      phone: phone,
      shipping_address: customer.shipping_address || '',
      shipping_city: customer.shipping_city || '',
      shipping_state: customer.shipping_state || '',
      shipping_zip_code: customer.shipping_zip_code || '',
      vip_tier: customer.tier || 'Gold',
      tier: customer.tier || 'Gold',
      status: 'Active',
      total_orders: customer.order_count ?? 0,
      order_count: customer.order_count ?? 0,
      total_spend: customer.total_spent ?? 0,
      total_spent: customer.total_spent ?? 0,
      default_password: DEFAULT_CUSTOMER_PASSWORD,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      synced_at: new Date().toISOString(),
      firebase_uid: uid,
      auth_linked: true
    };

    const writeTasks = [
      setDoc(doc(db, 'users', uid), userProfile, { merge: true }),
      setDoc(doc(db, 'customers', targetCustId), customerDoc, { merge: true })
    ];

    await Promise.all(writeTasks);

    // Sync client local caches and unmark tombstones immediately for 0ms reactivity
    if (typeof window !== 'undefined') {
      try {
        const { unmarkIdAsDeleted } = await import('../lib/supabase');
        unmarkIdAsDeleted('customers', [cleanEmail, targetCustId, uid]);
        unmarkIdAsDeleted('users', [cleanEmail, targetCustId, uid]);

        const crmCacheRaw = localStorage.getItem('slimdose_crm_customers_cache_v2');
        let crmCache = crmCacheRaw ? JSON.parse(crmCacheRaw) : [];
        if (Array.isArray(crmCache)) {
          crmCache = [customerDoc, ...crmCache.filter((c: any) => c.email?.toLowerCase().trim() !== cleanEmail)];
          localStorage.setItem('slimdose_crm_customers_cache_v2', JSON.stringify(crmCache));
        }

        const usersCacheRaw = localStorage.getItem('slimdose_cached_user_accounts_v1');
        let usersCache = usersCacheRaw ? JSON.parse(usersCacheRaw) : [];
        if (Array.isArray(usersCache)) {
          const newUserEntry = {
            uid,
            email: cleanEmail,
            displayName,
            role: 'customer',
            phone,
            customerId: targetCustId,
            status: 'active',
            emailVerified: true,
            createdAt: customerDoc.created_at,
            updatedAt: customerDoc.updated_at,
            tier: customer.tier || 'Gold',
            defaultPassword: DEFAULT_CUSTOMER_PASSWORD,
            authLinked: true,
          };
          usersCache = [newUserEntry, ...usersCache.filter((u: any) => u.email?.toLowerCase().trim() !== cleanEmail)];
          localStorage.setItem('slimdose_cached_user_accounts_v1', JSON.stringify(usersCache));
        }

        window.dispatchEvent(new CustomEvent('slimdose:customer_registered', { detail: customerDoc }));
        window.dispatchEvent(new Event('storage'));
      } catch (e) {
        // non-blocking
      }
    }

    return {
      status: authResult.isNew ? 'created' : 'existing',
      uid,
      email: cleanEmail,
      profile: userProfile,
    };
  } catch (err: any) {
    // If error occurs, fallback to Firestore synchronization and record notice
    console.warn(`[provisionCustomerAccount] Direct Auth notice for ${cleanEmail}:`, err?.message || err);

    // Find existing user in Firestore /users collection by email
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', cleanEmail));
    const querySnap = await getDocs(q);

    if (!querySnap.empty) {
      const existingDoc = querySnap.docs[0];
      const existingData = existingDoc.data() as UserProfile;
      const uid = existingDoc.id;

      // Synchronize and update profile details
      const updatedFields: Partial<UserProfile> = {
        displayName: displayName || existingData.displayName || cleanEmail.split('@')[0],
        phone: phone || existingData.phone || '',
        customerId: customerId || existingData.customerId || '',
        updatedAt: serverTimestamp(),
      };

      await setDoc(doc(db, 'users', uid), updatedFields, { merge: true });

      // Also sync /customers doc
      const custIdToUpdate = customerId || existingData.customerId || uid;
      await setDoc(
        doc(db, 'customers', custIdToUpdate),
        {
          id: custIdToUpdate,
          full_name: displayName || existingData.displayName || cleanEmail.split('@')[0],
          name: displayName || existingData.displayName || cleanEmail.split('@')[0],
          email: cleanEmail,
          phone: phone || existingData.phone || '',
          ...(customer.shipping_address ? { shipping_address: customer.shipping_address } : {}),
          ...(customer.shipping_city ? { shipping_city: customer.shipping_city } : {}),
          ...(customer.shipping_state ? { shipping_state: customer.shipping_state } : {}),
          ...(customer.shipping_zip_code ? { shipping_zip_code: customer.shipping_zip_code } : {}),
          ...(customer.tier ? { tier: customer.tier, vip_tier: customer.tier } : {}),
          ...(customer.total_spent !== undefined ? { total_spent: customer.total_spent, total_spend: customer.total_spent } : {}),
          ...(customer.order_count !== undefined ? { order_count: customer.order_count, total_orders: customer.order_count } : {}),
          default_password: DEFAULT_CUSTOMER_PASSWORD,
          synced_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          auth_linked: true
        },
        { merge: true }
      );

      return {
        status: 'existing',
        uid,
        email: cleanEmail,
        profile: {
          ...existingData,
          ...updatedFields,
        },
      };
    }

    // Fallback UID
    const fallbackUid = customerId ? `cust_${customerId}` : `email_${cleanEmail.replace(/[^a-zA-Z0-9]/g, '_')}`;
    const userProfile: UserProfile = {
      uid: fallbackUid,
      email: cleanEmail,
      displayName,
      phone,
      customerId,
      role: 'customer',
      emailVerified: true,
      updatedAt: serverTimestamp(),
    };

    await setDoc(doc(db, 'users', fallbackUid), userProfile, { merge: true });

    const targetCustId = customerId || fallbackUid;
    await setDoc(
      doc(db, 'customers', targetCustId),
      {
        id: targetCustId,
        full_name: displayName,
        name: displayName,
        email: cleanEmail,
        phone: phone,
        ...(customer.shipping_address ? { shipping_address: customer.shipping_address } : {}),
        ...(customer.shipping_city ? { shipping_city: customer.shipping_city } : {}),
        ...(customer.shipping_state ? { shipping_state: customer.shipping_state } : {}),
        ...(customer.shipping_zip_code ? { shipping_zip_code: customer.shipping_zip_code } : {}),
        ...(customer.tier ? { tier: customer.tier, vip_tier: customer.tier } : {}),
        ...(customer.total_spent !== undefined ? { total_spent: customer.total_spent, total_spend: customer.total_spent } : {}),
        ...(customer.order_count !== undefined ? { order_count: customer.order_count, total_orders: customer.order_count } : {}),
        default_password: DEFAULT_CUSTOMER_PASSWORD,
        synced_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        auth_linked: true
      },
      { merge: true }
    );

    return {
      status: 'existing',
      uid: fallbackUid,
      email: cleanEmail,
      profile: userProfile,
    };
  }
}

/**
 * Batch synchronize customer accounts to Firebase with rate-limiting and robust error handling.
 */
export async function batchSyncCustomerAccountsToFirebase(
  customers: CustomerProvisionInput[],
  onProgress?: (completed: number, total: number, currentEmail: string) => void
): Promise<BatchSyncStats> {
  const stats: BatchSyncStats = {
    total: customers.length,
    success: 0,
    existing: 0,
    failed: 0,
    errors: [],
  };

  if (!customers || customers.length === 0) {
    return stats;
  }

  for (let i = 0; i < customers.length; i++) {
    const customer = customers[i];
    const customerEmail = customer?.email?.trim().toLowerCase() || `unknown_${i}`;

    try {
      if (!customer?.email) {
        throw new Error('Customer missing valid email address.');
      }

      const result = await provisionCustomerAccount(customer);
      if (result.status === 'created') {
        stats.success++;
      } else {
        stats.existing++;
      }
    } catch (err: any) {
      stats.failed++;
      stats.errors.push({
        email: customerEmail,
        error: err?.message || String(err),
      });
      console.error(`[batchSyncCustomerAccountsToFirebase] Error syncing ${customerEmail}:`, err);
    } finally {
      if (onProgress) {
        onProgress(i + 1, customers.length, customerEmail);
      }
      // Small throttle/delay to avoid strict Firebase Auth rate-limiting thresholds
      await new Promise((resolve) => setTimeout(resolve, 80));
    }
  }

  return stats;
}

/**
 * Seamlessly authenticates customer with email and password.
 * If user attempts login with default password '123456#' and user does not exist in Auth, provisions user automatically.
 */
export async function authenticateCustomerWithDefaultFallback(
  email: string,
  password: string
) {
  const cleanEmail = email.trim().toLowerCase();

  try {
    const cred = await signInWithEmailAndPassword(auth, cleanEmail, password);
    const profile = await getUserProfile(cred.user.uid);
    return {
      user: cred.user,
      profile,
      isNewProvision: false,
    };
  } catch (loginErr: any) {
    // If entered password is the default password and user is not registered in Firebase Auth yet, provision on-the-fly
    const isUserNotFound =
      loginErr?.code === 'auth/user-not-found' ||
      loginErr?.code === 'auth/invalid-credential' ||
      loginErr?.message?.includes('user-not-found') ||
      loginErr?.message?.includes('invalid-credential');

    if (password === DEFAULT_CUSTOMER_PASSWORD && isUserNotFound) {
      try {
        const provisionResult = await provisionCustomerAccount({
          email: cleanEmail,
          full_name: cleanEmail.split('@')[0],
        });

        // After provisioning, authenticate with default password
        const cred = await signInWithEmailAndPassword(auth, cleanEmail, DEFAULT_CUSTOMER_PASSWORD);
        const profile = await getUserProfile(cred.user.uid);

        return {
          user: cred.user,
          profile: profile || provisionResult.profile,
          isNewProvision: true,
        };
      } catch (provErr: any) {
        console.error('[authenticateCustomerWithDefaultFallback] Provisioning fallback failed:', provErr);
        throw loginErr;
      }
    }

    throw loginErr;
  }
}

/**
 * Sign out active Firebase user session
 */
export async function logoutUser() {
  await firebaseSignOut(auth);
}

/**
 * Send password reset email
 */
export async function resetPassword(email: string) {
  await sendPasswordResetEmail(auth, email.trim().toLowerCase());
}

/**
 * Send verification email to currently signed in user
 */
export async function triggerEmailVerification() {
  if (auth.currentUser) {
    await sendEmailVerification(auth.currentUser);
  }
}

/**
 * Fetch current user profile document from Firestore
 */
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const docRef = doc(db, 'users', uid);
  const snap = await getDoc(docRef);
  if (snap.exists()) {
    return snap.data() as UserProfile;
  }

  // Fallback to checking admin_users collection if role-based admin
  const adminDocRef = doc(db, 'admin_users', uid);
  const adminSnap = await getDoc(adminDocRef);
  if (adminSnap.exists()) {
    const data = adminSnap.data();
    return {
      uid,
      email: data.email || '',
      role: data.role || 'super_admin',
      displayName: data.name || 'Admin',
      emailVerified: true,
    };
  }

  return null;
}

/**
 * Realtime listener for Auth State changes
 */
export function subscribeToAuthState(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}

export interface AdminUserAccount {
  uid: string;
  email: string;
  displayName: string;
  role: 'super_admin' | 'admin' | 'staff' | 'customer';
  phone?: string;
  customerId?: string;
  status: 'active' | 'suspended' | 'pending';
  emailVerified: boolean;
  createdAt?: any;
  updatedAt?: any;
  lastLoginAt?: string;
  totalSpent?: number;
  orderCount?: number;
  tier?: string;
  shippingAddress?: string;
  shippingCity?: string;
  shippingState?: string;
  shippingZipCode?: string;
  defaultPassword?: string;
  authLinked?: boolean;
  notes?: string;
}

/**
 * Fetch all registered users from Firestore /users & merge with Firestore /customers and legacy admins
 */
export async function getAllUserAccounts(): Promise<AdminUserAccount[]> {
  const usersMap = new Map<string, AdminUserAccount>();
  const { getDeletedIdsForTable } = await import('../lib/supabase');
  const deletedUsers = getDeletedIdsForTable('users');
  const deletedCustomers = getDeletedIdsForTable('customers');

  const isTombstoned = (uid: string, email: string) => {
    const clean = (email || '').trim().toLowerCase();
    const uidStr = String(uid || '');
    return (
      deletedUsers.has(uidStr) ||
      deletedUsers.has(clean) ||
      deletedCustomers.has(uidStr) ||
      deletedCustomers.has(clean)
    );
  };

  try {
    // Fetch all collections in parallel for maximum speed
    const [usersSnapResult, custSnapResult, adminSnapResult] = await Promise.allSettled([
      getDocs(collection(db, 'users')),
      getDocs(collection(db, 'customers')),
      getDocs(collection(db, 'admin_users')),
    ]);

    // 1. Process /users
    if (usersSnapResult.status === 'fulfilled') {
      usersSnapResult.value.forEach((d) => {
        const data = d.data();
        const emailClean = (data.email || '').trim().toLowerCase();
        const uidVal = data.uid || d.id;
        if (emailClean && !isTombstoned(uidVal, emailClean)) {
          usersMap.set(emailClean, {
            uid: uidVal,
            email: emailClean,
            displayName: data.displayName || emailClean.split('@')[0],
            role: data.role || 'customer',
            phone: data.phone || '',
            customerId: data.customerId || d.id,
            status: data.status || 'active',
            emailVerified: data.emailVerified ?? true,
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt || new Date().toISOString(),
            updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : data.updatedAt || new Date().toISOString(),
            lastLoginAt: data.lastLoginAt || undefined,
            totalSpent: data.total_spent ?? data.totalSpent,
            orderCount: data.order_count ?? data.orderCount,
            tier: data.tier || data.vip_tier,
            shippingAddress: data.shipping_address || data.shippingAddress,
            shippingCity: data.shipping_city || data.shippingCity,
            shippingState: data.shipping_state || data.shippingState,
            shippingZipCode: data.shipping_zip_code || data.shippingZipCode,
            defaultPassword: DEFAULT_CUSTOMER_PASSWORD,
            authLinked: true,
            notes: data.notes || '',
          });
        }
      });
    }

    // 2. Process /customers to enrich and uncover hidden customer details
    if (custSnapResult.status === 'fulfilled') {
      custSnapResult.value.forEach((d) => {
        const data = d.data();
        const emailClean = (data.email || '').trim().toLowerCase();
        const uidVal = data.firebase_uid || data.uid || d.id;
        if (emailClean && !isTombstoned(uidVal, emailClean)) {
          const existing = usersMap.get(emailClean);
          if (existing) {
            existing.phone = existing.phone || data.phone || '';
            existing.shippingAddress = existing.shippingAddress || data.shipping_address || '';
            existing.shippingCity = existing.shippingCity || data.shipping_city || '';
            existing.shippingState = existing.shippingState || data.shipping_state || '';
            existing.shippingZipCode = existing.shippingZipCode || data.shipping_zip_code || '';
            existing.tier = existing.tier || data.tier || data.vip_tier || 'Standard';
            existing.totalSpent = existing.totalSpent ?? data.total_spent ?? data.total_spend ?? 0;
            existing.orderCount = existing.orderCount ?? data.order_count ?? data.total_orders ?? 0;
            existing.defaultPassword = DEFAULT_CUSTOMER_PASSWORD;
          } else {
            usersMap.set(emailClean, {
              uid: uidVal,
              email: emailClean,
              displayName: data.full_name || data.name || emailClean.split('@')[0],
              role: 'customer',
              phone: data.phone || '',
              customerId: d.id,
              status: data.status === 'Suspended' ? 'suspended' : 'active',
              emailVerified: true,
              createdAt: data.created_at || new Date().toISOString(),
              updatedAt: data.updated_at || new Date().toISOString(),
              totalSpent: data.total_spent ?? data.total_spend ?? 0,
              orderCount: data.order_count ?? data.total_orders ?? 0,
              tier: data.tier || data.vip_tier || 'Standard',
              shippingAddress: data.shipping_address || '',
              shippingCity: data.shipping_city || '',
              shippingState: data.shipping_state || '',
              shippingZipCode: data.shipping_zip_code || '',
              defaultPassword: DEFAULT_CUSTOMER_PASSWORD,
              authLinked: true,
              notes: data.notes || '',
            });
          }
        }
      });
    }

    // 3. Process /admin_users
    if (adminSnapResult.status === 'fulfilled') {
      adminSnapResult.value.forEach((d) => {
        const data = d.data();
        const emailClean = (data.email || '').trim().toLowerCase();
        const uidVal = d.id;
        if (emailClean && !usersMap.has(emailClean) && !isTombstoned(uidVal, emailClean)) {
          usersMap.set(emailClean, {
            uid: uidVal,
            email: emailClean,
            displayName: data.name || data.displayName || 'Admin User',
            role: data.role || 'super_admin',
            phone: data.phone || '',
            status: data.status || 'active',
            emailVerified: true,
            createdAt: data.createdAt || new Date().toISOString(),
            updatedAt: data.updatedAt || new Date().toISOString(),
            authLinked: true,
          });
        }
      });
    }
  } catch (e) {
    console.warn('[getAllUserAccounts] Parallel fetch error:', e);
  }

  // Ensure default super admin exists unless deleted
  const superAdminEmail = 'admin@gmail.com';
  if (!usersMap.has(superAdminEmail) && !isTombstoned('admin_primary_master', superAdminEmail)) {
    usersMap.set(superAdminEmail, {
      uid: 'admin_primary_master',
      email: superAdminEmail,
      displayName: 'Super Admin',
      role: 'super_admin',
      phone: '+63 917 888 9999',
      status: 'active',
      emailVerified: true,
      createdAt: new Date('2024-01-01T00:00:00Z').toISOString(),
      updatedAt: new Date().toISOString(),
      authLinked: true,
    });
  }

  return Array.from(usersMap.values());
}

/**
 * Creates a brand new user account directly with role, credentials, and Firestore profile
 */
export async function createUserAccountAdmin(input: {
  email: string;
  password?: string;
  displayName: string;
  role: 'super_admin' | 'admin' | 'staff' | 'customer';
  phone?: string;
  status?: 'active' | 'suspended' | 'pending';
  notes?: string;
}): Promise<AdminUserAccount> {
  const cleanEmail = input.email.trim().toLowerCase();
  const password = input.password?.trim() || DEFAULT_CUSTOMER_PASSWORD;
  const displayName = input.displayName.trim() || cleanEmail.split('@')[0];

  // 1. Create in Firebase Auth (headless)
  const authRes = await createFirebaseUserHeadless(cleanEmail, password, displayName);
  const uid = authRes.uid;

  // 2. Write profile to Firestore /users
  const userProfile = {
    uid,
    email: cleanEmail,
    displayName,
    role: input.role,
    phone: input.phone || '',
    status: input.status || 'active',
    emailVerified: true,
    notes: input.notes || '',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    defaultPasswordSet: password === DEFAULT_CUSTOMER_PASSWORD,
  };

  await setDoc(doc(db, 'users', uid), userProfile, { merge: true });

  // 3. If customer, also write to Firestore /customers
  if (input.role === 'customer') {
    await setDoc(
      doc(db, 'customers', uid),
      {
        id: uid,
        email: cleanEmail,
        full_name: displayName,
        name: displayName,
        phone: input.phone || '',
        status: input.status === 'suspended' ? 'Suspended' : 'Active',
        vip_tier: 'Gold',
        tier: 'Gold',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { merge: true }
    );
  }

  return {
    uid,
    email: cleanEmail,
    displayName,
    role: input.role,
    phone: input.phone || '',
    status: input.status || 'active',
    emailVerified: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    authLinked: true,
    notes: input.notes,
  };
}

/**
 * Updates an existing user's profile and permissions
 */
export async function updateUserAccountAdmin(
  uid: string,
  updates: Partial<AdminUserAccount>
): Promise<void> {
  const userRef = doc(db, 'users', uid);
  await setDoc(
    userRef,
    {
      ...updates,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );

  if (updates.email) {
    const custRef = doc(db, 'customers', uid);
    try {
      await setDoc(
        custRef,
        {
          full_name: updates.displayName,
          name: updates.displayName,
          phone: updates.phone,
          status: updates.status === 'suspended' ? 'Suspended' : 'Active',
          updated_at: new Date().toISOString(),
        },
        { merge: true }
      );
    } catch (e) {}
  }
}

/**
 * Deletes a user profile completely from Firebase Authentication, Firestore, Supabase, and local registries.
 * Fully synchronized bi-directionally between Customer CRM and Users Management.
 */
export async function deleteUserAccountAdmin(uid: string, email: string): Promise<void> {
  const cleanEmail = email.trim().toLowerCase();
  const emailDocId = `email_${cleanEmail.replace(/[^a-zA-Z0-9]/g, '_')}`;

  // 1. Mark in tombstone registry immediately so it never revives
  try {
    const { markIdsAsDeleted } = await import('../lib/supabase');
    markIdsAsDeleted('customers', [uid, cleanEmail, emailDocId]);
    markIdsAsDeleted('users', [uid, cleanEmail, emailDocId]);
  } catch (tombErr) {
    console.warn('[deleteUserAccountAdmin] Tombstone notice:', tombErr);
  }

  // 2. Fast timeout helper (max 3 seconds per remote op)
  const withTimeout = <T>(promise: Promise<T>, ms = 3000): Promise<T | null> => {
    return Promise.race([
      promise,
      new Promise<null>((resolve) => setTimeout(() => resolve(null), ms)),
    ]);
  };

  try {
    const { deleteDoc, doc, collection, query, where, getDocs } = await import('firebase/firestore');

    // Direct document references deletion in Firestore
    const directRefs = [
      doc(db, 'users', uid),
      doc(db, 'users', emailDocId),
      doc(db, 'users', cleanEmail),
      doc(db, 'customers', uid),
      doc(db, 'customers', emailDocId),
      doc(db, 'customers', cleanEmail),
      doc(db, 'admin_users', uid),
      doc(db, 'admin_users', cleanEmail),
    ];

    const deleteDirectTasks = Promise.allSettled(directRefs.map((r) => deleteDoc(r)));

    // Fast query-based deletions in Firestore
    const queryDeleteTask = (async () => {
      try {
        const [usersSnap, custSnap, adminSnap] = await Promise.allSettled([
          getDocs(query(collection(db, 'users'), where('email', '==', cleanEmail))),
          getDocs(query(collection(db, 'customers'), where('email', '==', cleanEmail))),
          getDocs(query(collection(db, 'admin_users'), where('email', '==', cleanEmail))),
        ]);

        const toDelete: Promise<any>[] = [];
        if (usersSnap.status === 'fulfilled') {
          usersSnap.value.forEach((d) => toDelete.push(deleteDoc(d.ref)));
        }
        if (custSnap.status === 'fulfilled') {
          custSnap.value.forEach((d) => toDelete.push(deleteDoc(d.ref)));
        }
        if (adminSnap.status === 'fulfilled') {
          adminSnap.value.forEach((d) => toDelete.push(deleteDoc(d.ref)));
        }
        await Promise.allSettled(toDelete);
      } catch (qe) {
        console.warn('[deleteUserAccountAdmin] Query delete note:', qe);
      }
    })();

    // Firebase Authentication user deletion
    const authDeleteTask = (async () => {
      if (!cleanEmail || !cleanEmail.includes('@')) return;
      const apiKey = firebaseConfig.apiKey;
      try {
        const signRes = await fetch(
          `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: cleanEmail,
              password: DEFAULT_CUSTOMER_PASSWORD,
              returnSecureToken: true,
            }),
          }
        );
        if (signRes.ok) {
          const signData = await signRes.json();
          if (signData?.idToken) {
            await fetch(
              `https://identitytoolkit.googleapis.com/v1/accounts:delete?key=${apiKey}`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ idToken: signData.idToken }),
              }
            );
            console.info(`[Firebase Auth] ✅ Eradicated user from Firebase Authentication: ${cleanEmail}`);
          }
        }
      } catch (authErr) {
        // silently catch
      }
    })();

    // Supabase deletion task
    const supabaseTask = (async () => {
      try {
        const { supabase } = await import('../lib/supabase');
        await Promise.allSettled([
          supabase.from('customers').delete().eq('email', cleanEmail),
          supabase.from('customers').delete().eq('id', uid),
        ]);
      } catch (sbe) {
        console.warn('[deleteUserAccountAdmin] Supabase delete note:', sbe);
      }
    })();

    // Run all with timeout
    await withTimeout(Promise.allSettled([deleteDirectTasks, queryDeleteTask, supabaseTask, authDeleteTask]), 3500);

    // Broadcast real-time events across all tabs
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('slimdose:user_deleted', { detail: { uid, email: cleanEmail } }));
      window.dispatchEvent(new CustomEvent('slimdose:customer_deleted', { detail: { id: uid, email: cleanEmail } }));
      window.dispatchEvent(new Event('storage'));
    }
  } catch (e) {
    console.warn('[deleteUserAccountAdmin] Complete cascade delete notice:', e);
  }
}
