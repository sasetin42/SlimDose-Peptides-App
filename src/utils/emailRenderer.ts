import { DEFAULT_EMAIL_TEMPLATES, EmailTemplateData } from './emailDefaults';

export interface SampleContext {
  customer_name: string;
  customer_email: string;
  order_number: string;
  order_id: string;
  order_status: string;
  items_summary: string;
  subtotal: string;
  shipping_fee: string;
  discount: string;
  promo_code: string;
  total_price: string;
  payment_method: string;
  shipping_address: string;
  shipping_provider: string;
  tracking_number: string;
  tracking_url: string;
  site_url: string;
  catalog_url: string;
  support_email: string;
  discount_percentage: string;
  [key: string]: any;
}

export const PRESET_SAMPLE_DATASETS: { name: string; description: string; data: SampleContext }[] = [
  {
    name: 'Order #SD-90412 (Tirzepatide)',
    description: 'Paid order with Tirzepatide and Bacteriostatic Water',
    data: {
      customer_name: 'Maria Santos',
      customer_email: 'maria.santos@gmail.com',
      order_number: 'SD-90412',
      order_id: '90412',
      order_status: 'Confirmed',
      items_summary: '• Tirzepatide 10mg Lyophilized (1x) — ₱3,500.00\n• BAC Water 10ml Reconstitution Solution (2x) — ₱800.00',
      subtotal: '4,300.00',
      shipping_fee: '200.00',
      discount: '430.00',
      promo_code: 'SLIMVIP10',
      total_price: '4,070.00',
      payment_method: 'GCash (Verified)',
      shipping_address: 'Unit 1402, Icon Residences, 26th St, BGC, Taguig City, Metro Manila',
      shipping_provider: 'LBC Express Priority',
      tracking_number: 'LBC-PH-992019482',
      tracking_url: 'https://slimdoseph.com/track-order?id=SD-90412',
      site_url: 'https://slimdoseph.com',
      catalog_url: 'https://slimdoseph.com/#products',
      support_email: 'support@slimdoseph.com',
      discount_percentage: '10%',
    },
  },
  {
    name: 'Order #SD-88190 (Semaglutide + BPC-157)',
    description: 'Multi-item research protocol with Express Delivery',
    data: {
      customer_name: 'Dr. Juan Dela Cruz',
      customer_email: 'juan.delacruz@medclinic.ph',
      order_number: 'SD-88190',
      order_id: '88190',
      order_status: 'Shipped',
      items_summary: '• Semaglutide 5mg (2x) — ₱5,600.00\n• BPC-157 5mg Pure Grade (1x) — ₱2,100.00\n• Insulin Syringes 31G Pack of 10 (1x) — ₱350.00',
      subtotal: '8,050.00',
      shipping_fee: '250.00',
      discount: '800.00',
      promo_code: 'DOCTORCARE',
      total_price: '7,500.00',
      payment_method: 'Bank Transfer (BDO)',
      shipping_address: 'Medical Plaza Suite 801, Ortigas Center, Pasig City',
      shipping_provider: 'J&T Express Cold-Pack',
      tracking_number: 'JT-982103991-PH',
      tracking_url: 'https://slimdoseph.com/track-order?id=SD-88190',
      site_url: 'https://slimdoseph.com',
      catalog_url: 'https://slimdoseph.com/#products',
      support_email: 'support@slimdoseph.com',
      discount_percentage: '15%',
    },
  },
  {
    name: 'VIP New Subscriber (Sofia)',
    description: 'Welcome promotion campaign for VIP leads',
    data: {
      customer_name: 'Sofia Rodriguez',
      customer_email: 'sofia.rodriguez@outlook.com',
      order_number: 'SD-99000',
      order_id: '99000',
      order_status: 'New VIP',
      items_summary: '• GLP-1 Protocol Starter Kit',
      subtotal: '5,000.00',
      shipping_fee: '0.00',
      discount: '750.00',
      promo_code: 'WELCOME15',
      total_price: '4,250.00',
      payment_method: 'Credit Card / GCash',
      shipping_address: 'Alabang Hills Village, Muntinlupa City',
      shipping_provider: 'LBC Express',
      tracking_number: 'PENDING',
      tracking_url: 'https://slimdoseph.com/track-order',
      site_url: 'https://slimdoseph.com',
      catalog_url: 'https://slimdoseph.com/#products',
      support_email: 'support@slimdoseph.com',
      discount_percentage: '15%',
    },
  },
];

/**
 * Replaces both standard {{ key }} and nested {{ event.properties.key }} / {{ person.properties.key }}
 * tags with provided variables.
 */
export function renderEmailTemplate(templateHtml: string, data: Record<string, any>): string {
  if (!templateHtml) return '';

  let rendered = templateHtml;

  // Flatten nested dictionary lookups for event.properties and person.properties
  const lookupMap: Record<string, string> = { ...data };

  // Map common aliases
  if (data.customer_name) {
    lookupMap['name'] = data.customer_name;
    lookupMap['person.properties.name'] = data.customer_name;
    lookupMap['event.properties.customer_name'] = data.customer_name;
  }
  if (data.order_number) {
    lookupMap['event.properties.order_number'] = data.order_number;
    lookupMap['event.properties.order_id'] = data.order_id || data.order_number;
  }
  if (data.items_summary) {
    lookupMap['event.properties.items_summary'] = data.items_summary;
  }
  if (data.subtotal) {
    lookupMap['event.properties.subtotal'] = data.subtotal;
  }
  if (data.shipping_fee) {
    lookupMap['event.properties.shipping_fee'] = data.shipping_fee;
  }
  if (data.discount) {
    lookupMap['event.properties.discount'] = data.discount;
  }
  if (data.promo_code) {
    lookupMap['event.properties.promo_code'] = data.promo_code;
  }
  if (data.total_price) {
    lookupMap['event.properties.total_price'] = data.total_price;
  }
  if (data.tracking_number) {
    lookupMap['event.properties.tracking_number'] = data.tracking_number;
  }
  if (data.shipping_provider) {
    lookupMap['event.properties.shipping_provider'] = data.shipping_provider;
  }

  // Replace all {{ tag }} patterns
  rendered = rendered.replace(/\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g, (match, tagKey) => {
    const trimmed = tagKey.trim();
    if (lookupMap[trimmed] !== undefined && lookupMap[trimmed] !== null) {
      return String(lookupMap[trimmed]);
    }
    // Fallback if tag without prefix is found
    const simpleKey = trimmed.replace(/^(event\.properties\.|person\.properties\.)/, '');
    if (lookupMap[simpleKey] !== undefined && lookupMap[simpleKey] !== null) {
      return String(lookupMap[simpleKey]);
    }
    return match; // Leave unchanged if unmatched
  });

  return rendered;
}

/**
 * Replaces merge tags in email subject line.
 */
export function renderEmailSubject(subject: string, data: Record<string, any>): string {
  if (!subject) return '';
  return renderEmailTemplate(subject, data);
}

/**
 * Download HTML content as a .html file in browser
 */
export function downloadHtmlFile(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.html') ? filename : `${filename}.html`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Copy text to user clipboard with fallback
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    document.body.appendChild(textArea);
    textArea.select();
    const success = document.execCommand('copy');
    document.body.removeChild(textArea);
    return success;
  } catch (err) {
    console.error('Failed to copy text:', err);
    return false;
  }
}

/**
 * Find default factory template by template_key
 */
export function getDefaultTemplateByKey(key: string): EmailTemplateData | undefined {
  return DEFAULT_EMAIL_TEMPLATES.find((t) => t.template_key === key);
}
