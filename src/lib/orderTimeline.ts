/**
 * Order Timeline — chronological events written to the order_timeline
 * collection whenever an order changes state.
 */

import { collection, addDoc, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from './firebase';

export type TimelineEventType =
  | 'order_created'
  | 'payment_received'
  | 'payment_verified'
  | 'processing'
  | 'packed'
  | 'shipped'
  | 'out_for_delivery'
  | 'delivered'
  | 'completed'
  | 'cancelled'
  | 'note_added'
  | 'tracking_added'
  | 'status_changed'
  | 'imported';

export const TIMELINE_LABELS: Record<TimelineEventType, string> = {
  order_created: 'Order Created',
  payment_received: 'Payment Received',
  payment_verified: 'Payment Verified',
  processing: 'Processing',
  packed: 'Packed',
  shipped: 'Shipped',
  out_for_delivery: 'Out for Delivery',
  delivered: 'Delivered',
  completed: 'Completed',
  cancelled: 'Cancelled',
  note_added: 'Note Added',
  tracking_added: 'Tracking Added',
  status_changed: 'Status Changed',
  imported: 'Imported from Old Website',
};

export interface TimelineEvent {
  id?: string;
  order_id: string;
  event_type: TimelineEventType;
  label: string;
  details?: string | null;
  actor?: string | null;
  created_at: string;
}

/** Append a timeline event for an order (never throws) */
export const addOrderTimelineEvent = async (
  orderId: string,
  eventType: TimelineEventType,
  details?: string,
  actor?: string
): Promise<void> => {
  try {
    await addDoc(collection(db, 'order_timeline'), {
      order_id: orderId,
      event_type: eventType,
      label: TIMELINE_LABELS[eventType] || eventType,
      details: details || null,
      actor: actor || null,
      created_at: new Date().toISOString(),
    });
  } catch (e) {
    console.warn('[timeline] Failed to append order timeline event:', e);
  }
};

/** Fetch all events for an order, oldest first */
export const getOrderTimeline = async (_orderId: string): Promise<TimelineEvent[]> => {
  try {
    const q = query(collection(db, 'order_timeline'), orderBy('created_at', 'asc'));
    const snap = await getDocs(q);
    return snap.docs
      .map((d) => ({ id: d.id, ...(d.data() as any) })) as TimelineEvent[];
  } catch (e) {
    console.warn('[timeline] getOrderTimeline failed:', e);
    return [];
  }
};

/** Map an order-status change to the canonical timeline event */
export const statusToTimelineEvent = (status: string): TimelineEventType | null => {
  switch (String(status).toLowerCase()) {
    case 'new': return 'order_created';
    case 'confirmed': return 'payment_verified';
    case 'processing': return 'processing';
    case 'packed': return 'packed';
    case 'shipped': return 'shipped';
    case 'out_for_delivery': return 'out_for_delivery';
    case 'delivered': return 'delivered';
    case 'completed': return 'completed';
    case 'cancelled': return 'cancelled';
    default: return 'status_changed';
  }
};
