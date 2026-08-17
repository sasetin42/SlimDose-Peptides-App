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

export const formatOrderId = (
  order?: OrderRefSource | string | null,
  options?: FormatOrderOptions
): string => {
  const includePrefix = options?.prefix ?? true;
  const prefixStr = includePrefix ? 'ID: ' : '';

  if (!order) {
    const seq = options?.fallbackIndex !== undefined ? String(options.fallbackIndex + 1).padStart(4, '0') : '0001';
    return `${prefixStr}SDP${seq}`;
  }

  // If passed as a plain string
  if (typeof order === 'string') {
    const clean = order.replace(/^ID:\s*/i, '').replace(/^#/, '').trim();
    if (!clean) return `${prefixStr}SDP0001`;
    if (clean.toUpperCase().startsWith('SDP')) {
      return `${prefixStr}${clean.toUpperCase()}`;
    }
    if (/^\d+$/.test(clean)) {
      return `${prefixStr}SDP${clean.padStart(4, '0')}`;
    }
    if (options?.fallbackIndex !== undefined) {
      return `${prefixStr}SDP${String(options.fallbackIndex + 1).padStart(4, '0')}`;
    }
    return `${prefixStr}SDP${clean.slice(0, 6).toUpperCase()}`;
  }

  // If order object has explicit order_number
  if (order.order_number !== null && order.order_number !== undefined && String(order.order_number).trim() !== '') {
    const cleanNum = String(order.order_number).replace(/^ID:\s*/i, '').replace(/^#/, '').trim();
    if (cleanNum.toUpperCase().startsWith('SDP')) {
      return `${prefixStr}${cleanNum.toUpperCase()}`;
    }
    if (/^\d+$/.test(cleanNum)) {
      return `${prefixStr}SDP${cleanNum.padStart(4, '0')}`;
    }
    return `${prefixStr}SDP${cleanNum.toUpperCase()}`;
  }

  // Fallback to order.id or fallbackIndex
  const rawId = order.id ? String(order.id).trim() : '';
  if (options?.fallbackIndex !== undefined) {
    const seq = String(options.fallbackIndex + 1).padStart(4, '0');
    return `${prefixStr}SDP${seq}`;
  }

  if (rawId) {
    const cleanId = rawId.replace(/^ID:\s*/i, '').replace(/^#/, '').replace(/^ORD-?/i, '').trim();
    if (cleanId.toUpperCase().startsWith('SDP')) {
      return `${prefixStr}${cleanId.toUpperCase()}`;
    }
    if (/^\d+$/.test(cleanId)) {
      return `${prefixStr}SDP${cleanId.padStart(4, '0')}`;
    }
    return `${prefixStr}SDP${cleanId.slice(0, 6).toUpperCase()}`;
  }

  return `${prefixStr}SDP0001`;
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
