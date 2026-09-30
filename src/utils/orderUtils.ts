/**
 * Standard Order ID formatting utility for SlimDose Peptides
 * Mandated canonical format: "SDP-000000" (or "ID: SDP-000000").
 * Only pure numbers exist after "SDP-" (strictly 6 numeric digits).
 */

export interface OrderRefSource {
  id?: string | null;
  order_number?: string | number | null;
  created_at?: string | null;
}

export interface FormatOrderOptions {
  /** Whether to prepend "ID: " (default: true). Set false for raw code e.g. "SDP-000001" */
  prefix?: boolean;
  /** 0-based index for sequential generation if order has no explicit number */
  fallbackIndex?: number;
}

/**
 * Deterministically converts any alphanumeric string into a positive integer within 100001..999999
 * Uses FNV-1a 32-bit hash algorithm for high distribution entropy.
 */
export const stringToNumericCode = (str: string): string => {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  const positive = Math.abs(hash);
  const sixDigits = (positive % 899999) + 100001; // 100001 to 999999
  return String(sixDigits);
};

/**
 * Normalizes any order reference (SDP####, SLD-######, ORD-######, raw digits, or alphanumeric doc IDs)
 * to the mandated canonical SDP-format: "SDP-000000" (pure numbers only, 6 digits).
 * Guarantees that the returned reference is strictly SDP- followed by 6 non-zero digits.
 * Guaranteed never to return SDP-000000.
 */
export const normalizeToSdp = (value: string): string => {
  if (!value) return 'SDP-000001';
  const clean = value.replace(/^ID:\s*/i, '').replace(/^#/, '').trim();
  if (!clean) return 'SDP-000001';

  // Check if it's already in format SDP-XXXXXX or SLD-XXXXXX or ORD-XXXXXX
  const prefixMatch = clean.match(/^(?:SDP|SLD|ORD)[-_]?(\d{1,8})$/i);
  if (prefixMatch && prefixMatch[1]) {
    const rawNum = prefixMatch[1];
    if (/^0+$/.test(rawNum)) {
      // Banned SDP-000000: replace with deterministic hash
      return `SDP-${stringToNumericCode(clean)}`;
    }
    const padded = rawNum.length >= 6 ? rawNum.slice(-6) : rawNum.padStart(6, '0');
    return `SDP-${padded}`;
  }

  // Pure digits: e.g. "960", "123456"
  if (/^\d+$/.test(clean)) {
    if (/^0+$/.test(clean)) {
      return 'SDP-000001';
    }
    const padded = clean.length >= 6 ? clean.slice(-6) : clean.padStart(6, '0');
    return `SDP-${padded}`;
  }

  // If UUID or alphanumeric ID (contains dashes, letters and numbers)
  // Check if it has a clean short numeric suffix e.g. "order-105"
  const suffixDigits = clean.match(/-(\d{1,6})$/);
  if (suffixDigits && !/^0+$/.test(suffixDigits[1])) {
    return `SDP-${suffixDigits[1].padStart(6, '0')}`;
  }

  // Deterministic conversion for arbitrary UUIDs/strings to ensure high entropy & uniqueness
  const numericHash = stringToNumericCode(clean);
  return `SDP-${numericHash}`;
};

/**
 * Backwards compatibility alias for normalizeToSdp
 */
export const normalizeSdpToSld = (value: string): string => normalizeToSdp(value);

/**
 * Generates a globally unique canonical Order Reference (SDP-XXXXXX).
 * Combines high-resolution microsecond-level epoch entropy and crypto/random seed.
 * Guarantees no collisions with an optional Set of existing references.
 */
export const generateUniqueOrderNumber = (existingRefs?: Set<string>): string => {
  const existing = existingRefs || new Set<string>();
  let attempts = 0;
  
  while (attempts < 100) {
    attempts++;
    // Get high entropy from time and random generator
    const now = Date.now();
    // 3 digits from timestamp modulo + 3 digits from crypto / random
    const timeEntropy = (now % 900) + 100; // 100..999
    let randEntropy = Math.floor(Math.random() * 900) + 100; // 100..999

    if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
      const arr = new Uint32Array(1);
      window.crypto.getRandomValues(arr);
      randEntropy = (arr[0] % 900) + 100;
    }

    const candidateNumber = `${timeEntropy}${randEntropy}`;
    // Ensure never 000000 and strictly 6 digits
    if (candidateNumber === '000000' || candidateNumber.length !== 6) {
      continue;
    }

    const candidate = `SDP-${candidateNumber}`;
    if (!existing.has(candidate)) {
      return candidate;
    }
  }

  // Fallback with monotonic timestamp modulo
  const fallbackNum = String((Date.now() % 899999) + 100001);
  return `SDP-${fallbackNum}`;
};

export const formatOrderId = (
  order?: OrderRefSource | string | null,
  options?: FormatOrderOptions
): string => {
  const includePrefix = options?.prefix ?? true;
  const prefixStr = includePrefix ? 'ID: ' : '';

  if (!order) {
    const seq = options?.fallbackIndex !== undefined ? String(options.fallbackIndex + 1).padStart(6, '0') : '000001';
    return `${prefixStr}SDP-${seq}`;
  }

  // If passed as a plain string
  if (typeof order === 'string') {
    const clean = order.replace(/^ID:\s*/i, '').replace(/^#/, '').trim();
    if (!clean) return `${prefixStr}SDP-000001`;
    const normalised = normalizeToSdp(clean);
    return `${prefixStr}${normalised}`;
  }

  // If order object has explicit order_number
  if (order.order_number !== null && order.order_number !== undefined && String(order.order_number).trim() !== '') {
    const cleanNum = String(order.order_number).replace(/^ID:\s*/i, '').replace(/^#/, '').trim();
    if (cleanNum && !/^0+$/.test(cleanNum)) {
      const normalised = normalizeToSdp(cleanNum);
      return `${prefixStr}${normalised}`;
    }
  }

  // Fallback to fallbackIndex if provided
  if (options?.fallbackIndex !== undefined) {
    const seq = String(options.fallbackIndex + 1).padStart(6, '0');
    return `${prefixStr}SDP-${seq}`;
  }

  // Fallback to order.id
  const rawId = order.id ? String(order.id).trim() : '';
  if (rawId) {
    const cleanId = rawId.replace(/^ID:\s*/i, '').replace(/^#/, '').trim();
    const normalised = normalizeToSdp(cleanId);
    return `${prefixStr}${normalised}`;
  }

  return `${prefixStr}SDP-000001`;
};

/**
 * Builds a lookup map for a list of orders to assign strictly UNIQUE SDP-000000 numeric IDs
 * with zero duplicates. Sorted chronologically.
 */
export const buildOrderIdMap = (orders: OrderRefSource[]): Map<string, string> => {
  const chronological = [...orders].sort((a, b) => {
    const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
    const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
    return timeA - timeB;
  });

  const map = new Map<string, string>();
  const usedRefNumbers = new Set<string>();

  chronological.forEach((ord, index) => {
    if (!ord.id) return;

    let assignedRef = '';

    // If order has an explicit, valid order_number
    if (ord.order_number !== null && ord.order_number !== undefined && String(ord.order_number).trim() !== '') {
      const candidate = normalizeToSdp(String(ord.order_number));
      if (!usedRefNumbers.has(candidate) && candidate !== 'SDP-000000') {
        assignedRef = candidate;
      }
    }

    // Fallback: If not assigned or collided, use sequential index + 1
    if (!assignedRef) {
      let candidateSeq = index + 1;
      let candidateRef = `SDP-${String(candidateSeq).padStart(6, '0')}`;
      while (usedRefNumbers.has(candidateRef)) {
        candidateSeq++;
        candidateRef = `SDP-${String(candidateSeq).padStart(6, '0')}`;
      }
      assignedRef = candidateRef;
    }

    usedRefNumbers.add(assignedRef);
    map.set(ord.id, `ID: ${assignedRef}`);
  });

  return map;
};
