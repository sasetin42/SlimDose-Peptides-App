import { db, auth } from '../lib/firebase';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
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
  serverTimestamp,
} from 'firebase/firestore';

export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  role: 'super_admin' | 'admin' | 'staff' | 'customer';
  emailVerified: boolean;
  createdAt?: any;
  updatedAt?: any;
}

/**
 * Authenticate existing user with email and password
 */
export async function loginUser(email: string, pass: string) {
  const cred = await signInWithEmailAndPassword(auth, email, pass);
  return cred.user;
}

/**
 * Register new user and create their Firestore profile document
 */
export async function registerUser(email: string, pass: string, role: 'customer' | 'admin' = 'customer', displayName: string = '') {
  const cred = await createUserWithEmailAndPassword(auth, email, pass);
  const user = cred.user;
  
  // Create user profile in Firestore
  const profileRef = doc(db, 'users', user.uid);
  const userProfile: UserProfile = {
    uid: user.uid,
    email: user.email || email,
    displayName: displayName || email.split('@')[0],
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
 * Sign out active Firebase user session
 */
export async function logoutUser() {
  await firebaseSignOut(auth);
}

/**
 * Send password reset email
 */
export async function resetPassword(email: string) {
  await sendPasswordResetEmail(auth, email);
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
