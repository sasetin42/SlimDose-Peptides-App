/**
 * Central Admin Audit Logger — writes real, immutable entries to Firestore.
 * Every admin mutation in the console should call logAdminAction().
 */

import { addDoc, collection, getDocs, query, orderBy, limit as fbLimit } from 'firebase/firestore';
import { db } from './firebase';

export interface AuditLogEntry {
  id?: string;
  user_email: string;
  user_role: string;
  action: string;
  module?: string;
  record_id?: string | null;
  before?: any;
  after?: any;
  details?: string;
  ip?: string;
  user_agent?: string;
  created_at: string;
}

const noopSession = { email: 'system', role: 'system', name: 'System' };

let currentSession: { email: string; role: string; name: string } | null = null;

/** Call once after login so every audit entry is attributed */
export const setAuditSession = (session: { email: string; role: string; name: string } | null) => {
  currentSession = session;
};

const getUserAgent = () => {
  try { return navigator.userAgent.slice(0, 250); } catch { return ''; }
};

/** Best-effort public IP (cached per session, never blocks the caller) */
let cachedIp: string | undefined = undefined;
const getIp = async (): Promise<string | undefined> => {
  if (cachedIp) return cachedIp;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 2500);
    const res = await fetch('https://api.ipify.org?format=json', { signal: ctrl.signal });
    clearTimeout(t);
    const data = await res.json();
    cachedIp = data?.ip || undefined;
    return cachedIp;
  } catch {
    return undefined;
  }
};

export const logAdminAction = async (
  action: string,
  payload?: {
    module?: string;
    record_id?: string | null;
    before?: any;
    after?: any;
    details?: string;
  }
): Promise<void> => {
  const session = currentSession || noopSession;
  const entry: AuditLogEntry = {
    user_email: session.email,
    user_role: session.role,
    action,
    module: payload?.module,
    record_id: payload?.record_id || undefined,
    before: payload?.before !== undefined ? safeClone(payload.before) : undefined,
    after: payload?.after !== undefined ? safeClone(payload.after) : undefined,
    details: payload?.details,
    user_agent: getUserAgent(),
    created_at: new Date().toISOString(),
  };

  try {
    entry.ip = await getIp();
  } catch {}

  try {
    await addDoc(collection(db, 'admin_audit_logs'), entry as any);
  } catch (e) {
    // Audit must never break the user flow — log locally as backup
    console.warn('[audit] Failed to persist audit entry, buffering locally:', e);
    try {
      const buffer = JSON.parse(localStorage.getItem('slimdose_audit_buffer') || '[]');
      buffer.unshift(entry);
      localStorage.setItem('slimdose_audit_buffer', JSON.stringify(buffer.slice(0, 100)));
    } catch {}
  }
};

/** Flush locally-buffered audit entries (called after successful writes elsewhere) */
export const flushAuditBuffer = async (): Promise<void> => {
  try {
    const buffer = JSON.parse(localStorage.getItem('slimdose_audit_buffer') || '[]');
    if (!Array.isArray(buffer) || buffer.length === 0) return;
    const remaining: AuditLogEntry[] = [];
    for (const entry of buffer.slice(0, 20)) {
      try {
        await addDoc(collection(db, 'admin_audit_logs'), entry as any);
      } catch {
        remaining.push(entry);
      }
    }
    localStorage.setItem('slimdose_audit_buffer', JSON.stringify(remaining));
  } catch {}
};

export const fetchAuditLogs = async (limitCount = 200): Promise<AuditLogEntry[]> => {
  try {
    const q = query(collection(db, 'admin_audit_logs'), orderBy('created_at', 'desc'), fbLimit(limitCount));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as AuditLogEntry[];
  } catch (e) {
    console.warn('[audit] fetchAuditLogs failed:', e);
    // Include buffered entries so admin still sees recent activity
    try {
      return JSON.parse(localStorage.getItem('slimdose_audit_buffer') || '[]');
    } catch {
      return [];
    }
  }
};

const safeClone = (value: any): any => {
  if (value === undefined) return undefined;
  try {
    const json = JSON.stringify(value);
    // Keep entries small — truncate giant payloads
    if (json && json.length > 8000) return { _truncated: true, preview: json.slice(0, 8000) };
    return JSON.parse(json);
  } catch {
    return { _unserializable: true };
  }
};
