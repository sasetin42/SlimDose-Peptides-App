/**
 * SlimDose Admin Authentication & Permission System
 * - Salted SHA-256 password hashing (Web Crypto)
 * - Firestore-backed admin user store (collection: admin_users)
 * - Role-based permission matrix enforced across the Admin Console
 */

import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from './firebase';

// ─── Password hashing ──────────────────────────────────────────────────────────

const SHA_ALGO = { name: 'SHA-256' } as const;
const ITERATIONS = 3; // light re-hash rounds for legacy migration

const toHex = (buf: ArrayBuffer): string =>
  Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');

export const sha256Hex = async (input: string): Promise<string> => {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest(SHA_ALGO, data);
  return toHex(digest);
};

/** Generates a random hex salt */
export const generateSalt = (length = 16): string => {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
};

export interface PasswordHashRecord {
  hash: string;
  salt: string;
  iterations: number;
}

/** Hash a plaintext password with a random salt */
export const hashPassword = async (password: string, salt?: string): Promise<PasswordHashRecord> => {
  const useSalt = salt || generateSalt();
  let combined = `${useSalt}:${password}`;
  let digest = await sha256Hex(combined);
  for (let i = 1; i < ITERATIONS; i++) {
    digest = await sha256Hex(`${useSalt}:${digest}`);
  }
  return { hash: digest, salt: useSalt, iterations: ITERATIONS };
};

/** Verify a plaintext password against a stored record (hash+salt or legacy plaintext) */
export const verifyPassword = async (
  password: string,
  stored: string | PasswordHashRecord | undefined | null
): Promise<boolean> => {
  if (!stored) return false;
  if (typeof stored === 'string') {
    // Legacy plaintext stored value
    return stored === password;
  }
  if (!stored.hash) {
    // Some rows may store { password_hash: string }
    return false;
  }
  let digest = await sha256Hex(`${stored.salt}:${password}`);
  for (let i = 1; i < (stored.iterations || 1); i++) {
    digest = await sha256Hex(`${stored.salt}:${digest}`);
  }
  // Constant-time-ish compare
  if (digest.length !== stored.hash.length) return false;
  let diff = 0;
  for (let i = 0; i < digest.length; i++) diff |= digest.charCodeAt(i) ^ stored.hash.charCodeAt(i);
  return diff === 0;
};

// ─── Roles & permission matrix ─────────────────────────────────────────────────

export type AdminRole =
  | 'super_admin'
  | 'admin'
  | 'manager'
  | 'editor'
  | 'order_manager'
  | 'marketing_manager'
  | 'support'
  | 'content_editor' // legacy alias of editor
  | 'staff';         // legacy generic staff

export const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  manager: 'Manager',
  editor: 'Editor',
  content_editor: 'Editor',
  order_manager: 'Order Manager',
  marketing_manager: 'Marketing Manager',
  support: 'Support',
  staff: 'Staff',
};

export type Permission =
  | 'view'
  | 'create'
  | 'edit'
  | 'delete'
  | 'export'
  | 'manage_settings'
  | 'manage_users'
  | 'manage_orders'
  | 'manage_products'
  | 'manage_customers'
  | 'manage_emails'
  | 'manage_promotions'
  | 'manage_migration';

const ALL: Permission[] = [
  'view', 'create', 'edit', 'delete', 'export',
  'manage_settings', 'manage_users', 'manage_orders', 'manage_products',
  'manage_customers', 'manage_emails', 'manage_promotions', 'manage_migration',
];

export const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  super_admin: ALL,
  admin: [
    'view', 'create', 'edit', 'delete', 'export',
    'manage_orders', 'manage_products', 'manage_customers', 'manage_emails', 'manage_promotions',
  ],
  manager: [
    'view', 'create', 'edit', 'export',
    'manage_orders', 'manage_products', 'manage_customers', 'manage_emails', 'manage_promotions',
  ],
  editor: ['view', 'create', 'edit', 'manage_products'],
  content_editor: ['view', 'create', 'edit', 'manage_products'],
  order_manager: ['view', 'edit', 'export', 'manage_orders', 'manage_customers'],
  marketing_manager: ['view', 'create', 'edit', 'export', 'manage_emails', 'manage_promotions'],
  support: ['view', 'manage_orders'],
  staff: ['view', 'edit'],
};

/** Admin console views and the permission each requires (beyond base 'view') */
export const VIEW_PERMISSION: Record<string, Permission> = {
  dashboard: 'view',
  products: 'manage_products',
  add: 'manage_products',
  edit: 'manage_products',
  categories: 'manage_products',
  bundles: 'manage_products',
  inventory: 'manage_products',
  coa: 'manage_products',
  payments: 'manage_settings',
  orders: 'manage_orders',
  'orders-new': 'manage_orders',
  'orders-confirmed': 'manage_orders',
  'orders-processing': 'manage_orders',
  'orders-shipped': 'manage_orders',
  'orders-delivered': 'manage_orders',
  'orders-cancelled': 'manage_orders',
  verifications: 'manage_orders',
  crm: 'manage_customers',
  segments: 'manage_customers',
  'follow-ups': 'manage_emails',
  'email-templates': 'manage_emails',
  campaigns: 'manage_emails',
  automations: 'manage_emails',
  'bulk-email': 'manage_emails',
  'promo-codes': 'manage_promotions',
  'global-discount': 'manage_promotions',
  'top-banner': 'edit',
  reviews: 'edit',
  'peptalk-videos': 'edit',
  guides: 'edit',
  faq: 'edit',
  popup: 'edit',
  'page-contents': 'edit',
  'seo': 'edit',
  shipping: 'manage_orders',
  locations: 'manage_orders',
  analytics: 'view',
  migration: 'manage_migration',
  users: 'manage_users',
  settings: 'manage_settings',
  audit: 'view',
};

export const can = (role: string | undefined | null, permission: Permission): boolean => {
  if (!role) return false;
  const perms = ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS.staff;
  if (perms.includes(permission)) return true;
  // Legacy roles map
  if (role === 'content_editor') return ROLE_PERMISSIONS.editor.includes(permission);
  if (role === 'staff') return ROLE_PERMISSIONS.staff.includes(permission);
  return false;
};

/** Whether a role may open a given admin view */
export const canAccessView = (role: string | undefined | null, view: string): boolean => {
  if (!role) return false;
  const required = VIEW_PERMISSION[view];
  // Unknown view → require edit at minimum
  const perm: Permission = required ?? 'edit';
  return can(role, perm);
};

// ─── Session management ────────────────────────────────────────────────────────

export interface AdminSession {
  email: string;
  role: AdminRole;
  name: string;
  token: string;
  loginTime: number;
}

const SESSION_KEY = 'slimdose_admin_session_v2';

export const saveSession = (session: Omit<AdminSession, 'token' | 'loginTime'>, remember: boolean): AdminSession => {
  const full: AdminSession = {
    ...session,
    token: `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`,
    loginTime: Date.now(),
  };
  try {
    // Always keep a sessionStorage copy for the tab; localStorage only when "remember me"
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(full));
    if (remember) localStorage.setItem(SESSION_KEY, JSON.stringify(full));
  } catch {}
  return full;
};

export const loadSession = (): AdminSession | null => {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY) || localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.email && parsed?.role) {
      return { ...parsed, token: parsed.token || 's_legacy' };
    }
  } catch {}
  return null;
};

export const clearSession = () => {
  try {
    sessionStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(SESSION_KEY);
  } catch {}
};

// ─── Admin user bootstrap & verification ───────────────────────────────────────

export interface AdminUserRecord {
  email: string;
  name: string;
  role: AdminRole;
  password?: PasswordHashRecord;
  legacy_password_hash?: string; // plaintext legacy value
  created_at?: string;
  updated_at?: string;
}

const BOOTSTRAP_ADMINS: Array<{ email: string; password: string; role: AdminRole; name: string }> = [
  { email: 'admin@gmail.com', password: '123456#', role: 'super_admin', name: 'Super Admin' },
  { email: 'superadmin@slimdose.ph', password: 'superadmin2026', role: 'super_admin', name: 'Super Admin' },
  { email: 'admin@slimdose.ph', password: 'admin2026', role: 'admin', name: 'Store Admin' },
  { email: 'editor@slimdose.ph', password: 'editor2026', role: 'editor', name: 'Content Editor' },
  { email: 'ordermanager@slimdose.ph', password: 'orders2026', role: 'order_manager', name: 'Order Manager' },
];

let bootstrapPromise: Promise<void> | null = null;

/**
 * One-time bootstrap: if the admin_users collection has no hashed accounts yet,
 * seed the default accounts with hashed passwords. Runs at most once per session.
 * (Runs in the browser; Firestore rules must allow it during first-run. Once
 * seeded, admins manage accounts through the Users module.)
 */
export const ensureAdminBootstrap = async (): Promise<void> => {
  if (bootstrapPromise) return bootstrapPromise;
  bootstrapPromise = (async () => {
    try {
      const markerRaw = localStorage.getItem('slimdose_admin_bootstrap_done');
      if (markerRaw === '1') return;
      // Check the primary account
      const ref = doc(db, 'admin_users', 'admin@gmail.com');
      const snap = await getDoc(ref);
      if (snap.exists()) {
        localStorage.setItem('slimdose_admin_bootstrap_done', '1');
        return;
      }
      // Seed all default accounts with hashed passwords
      for (const a of BOOTSTRAP_ADMINS) {
        const record = await hashPassword(a.password);
        await setDoc(doc(db, 'admin_users', a.email), {
          id: a.email,
          email: a.email,
          name: a.name,
          role: a.role,
          password: record,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }
      // Best-effort Firebase Auth mirror (optional; ignore failures)
      for (const a of BOOTSTRAP_ADMINS) {
        try { await createUserWithEmailAndPassword(auth, a.email, a.password); } catch {}
      }
      localStorage.setItem('slimdose_admin_bootstrap_done', '1');
    } catch (e) {
      console.warn('[auth] Admin bootstrap skipped (will retry next session):', e);
      bootstrapPromise = null;
    }
  })();
  return bootstrapPromise;
};

/** Attempt to sign in an admin by email + password */
export const authenticateAdmin = async (
  email: string,
  password: string
): Promise<{ ok: true; session: AdminSession } | { ok: false; error: string }> => {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail || !password) return { ok: false, error: 'Email and password are required.' };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) return { ok: false, error: 'Please enter a valid email address.' };

  await ensureAdminBootstrap();

  try {
    const ref = doc(db, 'admin_users', cleanEmail);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const data = snap.data() as AdminUserRecord;
      const status = (data as any).status;
      if (status === 'suspended' || status === 'disabled') {
        return { ok: false, error: 'This account is suspended. Contact a Super Admin.' };
      }
      // Verify against hashed record or legacy plaintext
      const legacy = data.legacy_password_hash ?? (data as any).password_hash;
      let valid = await verifyPassword(password, data.password);
      if (!valid && legacy) valid = await verifyPassword(password, legacy);

      if (!valid) return { ok: false, error: 'Invalid email or password.' };

      // One-time migration: rewrite plaintext legacy rows to hashed records
      if (legacy && typeof legacy === 'string') {
        const hashed = await hashPassword(password);
        await setDoc(ref, { password: hashed, legacy_password_hash: null, updated_at: new Date().toISOString() }, { merge: true });
      }

      return {
        ok: true,
        session: {
          email: data.email || cleanEmail,
          role: (data.role || 'admin') as AdminRole,
          name: data.name || 'Store Admin',
          token: 'authenticated_v1',
          loginTime: Date.now(),
        },
      };
    }
  } catch (e: any) {
    // Firestore rules may deny reads on admin_users for anonymous clients.
    // Fall back to Firebase Auth sign-in; the doc may exist but be unreadable.
    try {
      const cred = await signInWithEmailAndPassword(auth, cleanEmail, password);
      let role: AdminRole = 'admin';
      let name = 'Store Admin';
      try {
        const ref = doc(db, 'admin_users', cleanEmail);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          role = (snap.data().role || 'admin') as AdminRole;
          name = snap.data().name || 'Store Admin';
        }
      } catch {}
      return {
        ok: true,
        session: {
          email: cred.user.email || cleanEmail,
          role,
          name,
          token: await cred.user.getIdToken().catch(() => 'authenticated_v1'),
          loginTime: Date.now(),
        },
      };
    } catch (authErr: any) {
      return { ok: false, error: 'Invalid email or password.' };
    }
  }

  // No Firestore doc — try Firebase Auth as a fallback path
  try {
    const cred = await signInWithEmailAndPassword(auth, cleanEmail, password);
    return {
      ok: true,
      session: {
        email: cred.user.email || cleanEmail,
        role: 'admin',
        name: 'Store Admin',
        token: await cred.user.getIdToken().catch(() => 'authenticated_v1'),
        loginTime: Date.now(),
      },
    };
  } catch {
    return { ok: false, error: 'Invalid email or password.' };
  }
};

/** Verify the current admin's password (for destructive-action confirmation) */
export const verifyCurrentAdminPassword = async (email: string | undefined, password: string): Promise<boolean> => {
  if (!email) return false;
  try {
    const ref = doc(db, 'admin_users', email.toLowerCase().trim());
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const data = snap.data() as AdminUserRecord;
      const legacy = data.legacy_password_hash ?? (data as any).password_hash;
      let valid = await verifyPassword(password, data.password);
      if (!valid && legacy) valid = await verifyPassword(password, legacy);
      if (valid) return true;
    }
  } catch {}
  return false;
};

/** Change an admin user's password (writes hashed record) */
export const setAdminPassword = async (email: string, newPassword: string): Promise<boolean> => {
  const clean = email.trim().toLowerCase();
  if (newPassword.length < 6) throw new Error('Password must be at least 6 characters.');
  const hashed = await hashPassword(newPassword);
  try {
    await setDoc(doc(db, 'admin_users', clean), { password: hashed, legacy_password_hash: null, updated_at: new Date().toISOString() }, { merge: true });
    return true;
  } catch (e) {
    console.error('[auth] Failed to set admin password:', e);
    return false;
  }
};
