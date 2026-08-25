import { db, auth } from '../lib/firebase';
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
  phone?: string;
  id?: string;
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
 * Creates or updates a customer account in Firebase Auth & Firestore /users with default credentials '123456#' and role 'customer'.
 */
export async function provisionCustomerAccount(
  customer: CustomerProvisionInput
): Promise<CustomerProvisionResult> {
  if (!customer.email || !customer.email.trim()) {
    throw new Error('Customer email is required for account provisioning.');
  }

  const cleanEmail = customer.email.trim().toLowerCase();
  const displayName = customer.full_name?.trim() || cleanEmail.split('@')[0];
  const phone = customer.phone?.trim() || '';
  const customerId = customer.id || '';

  try {
    // 1. Attempt to create Firebase Auth user with default password
    const cred = await createUserWithEmailAndPassword(auth, cleanEmail, DEFAULT_CUSTOMER_PASSWORD);
    const user = cred.user;

    if (displayName) {
      try {
        await updateProfile(user, { displayName });
      } catch (e) {
        console.warn(`[provisionCustomerAccount] Warning updating auth display name for ${cleanEmail}:`, e);
      }
    }

    const userProfile: UserProfile = {
      uid: user.uid,
      email: cleanEmail,
      displayName,
      phone,
      customerId,
      role: 'customer',
      emailVerified: user.emailVerified,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    await setDoc(doc(db, 'users', user.uid), userProfile);

    return {
      status: 'created',
      uid: user.uid,
      email: cleanEmail,
      profile: userProfile,
    };
  } catch (err: any) {
    // Check if account already exists in Auth
    if (
      err?.code === 'auth/email-already-in-use' ||
      err?.message?.includes('auth/email-already-in-use') ||
      err?.message?.includes('already exists')
    ) {
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

      // If document not found by email, create or update indexed document by customerId if present
      const fallbackUid = customerId ? `cust_${customerId}` : `email_${cleanEmail.replace(/[^a-zA-Z0-9]/g, '_')}`;
      const userProfile: UserProfile = {
        uid: fallbackUid,
        email: cleanEmail,
        displayName,
        phone,
        customerId,
        role: 'customer',
        emailVerified: false,
        updatedAt: serverTimestamp(),
      };

      await setDoc(doc(db, 'users', fallbackUid), userProfile, { merge: true });

      return {
        status: 'existing',
        uid: fallbackUid,
        email: cleanEmail,
        profile: userProfile,
      };
    }

    // Re-throw unexpected errors
    throw err;
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
