/**
 * Standard Order ID formatting utility for SlimDose Peptides
 * Formats order identifiers to standard "ID: SDP0001" or "SDP0001" representation.
 */

export interface OrderRefSource {
  id?: string | null;
  order_number?: string | number | null;
  created_at?: string | null;
}

export interface FormatOrderOptions {
  /** Whether to prepend "ID: " (default: true). Set false for raw code e.g. "SDP0001" */
  prefix?: boolean;
  /** 0-based index for sequential generation if order has no explicit number */
  fallbackIndex?: number;
}

/**
 * Converts old SDP####-format order numbers to the canonical SLD-######-format.
 * e.g. "SDP0960" → "SLD-000960", "SDP0959" → "SLD-000959"
 * Non-SDP values are returned unchanged.
 */
export const normalizeSdpToSld = (value: string): string => {
  const match = value.match(/^SDP(\d+)$/i);
  if (match) {
    return `SLD-${match[1].padStart(6, '0')}`;
  }
  return value;
};

export const formatOrderId = (
  order?: OrderRefSource | string | null,
  options?: FormatOrderOptions
): string => {
  const includePrefix = options?.prefix ?? true;
  const prefixStr = includePrefix ? 'ID: ' : '';

  // Helper: does a string look like a proper named reference (e.g. SLD-001834)?
  const isKnownRef = (s: string) => /^[A-Z]+-\d+$/i.test(s);

  if (!order) {
    const seq = options?.fallbackIndex !== undefined ? String(options.fallbackIndex + 1).padStart(4, '0') : '0001';
    return `${prefixStr}SLD-${seq.padStart(6, '0')}`;
  }

  // If passed as a plain string
  if (typeof order === 'string') {
    const clean = order.replace(/^ID:\s*/i, '').replace(/^#/, '').trim();
    if (!clean) return `${prefixStr}SLD-000001`;
    // Normalise SDP#### → SLD-######
    const normalised = normalizeSdpToSld(clean);
    if (isKnownRef(normalised)) return `${prefixStr}${normalised.toUpperCase()}`;
    if (/^\d+$/.test(clean)) return `${prefixStr}SLD-${clean.padStart(6, '0')}`;
    if (options?.fallbackIndex !== undefined) {
      return `${prefixStr}SLD-${String(options.fallbackIndex + 1).padStart(6, '0')}`;
    }
    return `${prefixStr}${clean.slice(0, 10).toUpperCase()}`;
  }

  // If order object has explicit order_number
  if (order.order_number !== null && order.order_number !== undefined && String(order.order_number).trim() !== '') {
    const cleanNum = String(order.order_number).replace(/^ID:\s*/i, '').replace(/^#/, '').trim();
    // Normalise SDP#### → SLD-######
    const normalised = normalizeSdpToSld(cleanNum);
    if (isKnownRef(normalised)) return `${prefixStr}${normalised.toUpperCase()}`;
    if (/^\d+$/.test(cleanNum)) return `${prefixStr}SLD-${cleanNum.padStart(6, '0')}`;
    return `${prefixStr}${cleanNum.toUpperCase()}`;
  }

  // Fallback to order.id or fallbackIndex
  const rawId = order.id ? String(order.id).trim() : '';
  if (options?.fallbackIndex !== undefined) {
    const seq = String(options.fallbackIndex + 1).padStart(6, '0');
    return `${prefixStr}SLD-${seq}`;
  }

  if (rawId) {
    const cleanId = rawId.replace(/^ID:\s*/i, '').replace(/^#/, '').replace(/^ORD-?/i, '').trim();
    const normalised = normalizeSdpToSld(cleanId);
    if (isKnownRef(normalised)) return `${prefixStr}${normalised.toUpperCase()}`;
    if (/^\d+$/.test(cleanId)) return `${prefixStr}SLD-${cleanId.padStart(6, '0')}`;
    return `${prefixStr}SLD-${cleanId.slice(0, 6).toUpperCase()}`;
  }

  return `${prefixStr}SLD-000001`;
};



/**
 * Builds a lookup map for a list of orders to assign stable sequential SDP IDs (e.g. SDP0001, SDP0002)
 * sorted chronologically.
 */
export const buildOrderIdMap = (orders: OrderRefSource[]): Map<string, string> => {
  const chronological = [...orders].sort((a, b) => {
    const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
    const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
    return timeA - timeB;
  });

  const map = new Map<string, string>();
  chronological.forEach((ord, index) => {
    if (ord.id) {
      map.set(ord.id, formatOrderId(ord, { prefix: true, fallbackIndex: index }));
    }
  });
  return map;
};
