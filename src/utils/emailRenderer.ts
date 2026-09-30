import { DEFAULT_EMAIL_TEMPLATES, EmailTemplateData } from './emailDefaults';

export interface SampleContext {
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  order_number: string;
  order_id: string;
  order_date?: string;
  order_status: string;
  items_summary: string;
  items_table_html?: string;
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

export const SAMPLE_ORDER_ITEMS_TABLE_HTML = `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse: separate; border-spacing: 0; background-color: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; overflow: hidden; margin-bottom: 8px;">
  <thead>
    <tr style="background-color: #F8FAFC;">
      <th align="left" style="padding: 12px 14px; font-size: 11px; font-weight: 800; color: #64748B; text-transform: uppercase; letter-spacing: 0.08em; border-bottom: 1px solid #E2E8F0;">Product & Specification</th>
      <th align="center" style="padding: 12px 10px; font-size: 11px; font-weight: 800; color: #64748B; text-transform: uppercase; letter-spacing: 0.08em; border-bottom: 1px solid #E2E8F0; width: 60px;">Qty</th>
      <th align="right" style="padding: 12px 14px; font-size: 11px; font-weight: 800; color: #64748B; text-transform: uppercase; letter-spacing: 0.08em; border-bottom: 1px solid #E2E8F0; width: 100px;">Price</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td style="padding: 14px; border-bottom: 1px solid #F1F5F9; font-size: 13px; color: #0F172A; vertical-align: middle;">
        <div style="font-weight: 800; color: #0F172A;">Tirzepatide 10mg Lyophilized</div>
        <div style="margin-top: 4px; display: inline-block; background-color: #EFF6FF; color: #2563EB; font-size: 10.5px; font-weight: 700; padding: 2px 8px; border-radius: 6px;">10mg Single Vial &bull; 99.4% HPLC</div>
      </td>
      <td align="center" style="padding: 14px 10px; border-bottom: 1px solid #F1F5F9; font-size: 13px; font-weight: 700; color: #334155; vertical-align: middle;">
        1x
      </td>
      <td align="right" style="padding: 14px; border-bottom: 1px solid #F1F5F9; font-size: 13.5px; font-weight: 800; color: #0F172A; vertical-align: middle;">
        ₱3,500.00
      </td>
    </tr>
    <tr>
      <td style="padding: 14px; font-size: 13px; color: #0F172A; vertical-align: middle;">
        <div style="font-weight: 800; color: #0F172A;">BAC Water 10ml Reconstitution Solution</div>
        <div style="margin-top: 4px; display: inline-block; background-color: #F0FDF4; color: #16A34A; font-size: 10.5px; font-weight: 700; padding: 2px 8px; border-radius: 6px;">USP Reconstitution Grade (0.9% Benzyl Alcohol)</div>
      </td>
      <td align="center" style="padding: 14px 10px; font-size: 13px; font-weight: 700; color: #334155; vertical-align: middle;">
        2x
      </td>
      <td align="right" style="padding: 14px; font-size: 13.5px; font-weight: 800; color: #0F172A; vertical-align: middle;">
        ₱800.00
      </td>
    </tr>
  </tbody>
</table>
`;

export const PRESET_SAMPLE_DATASETS: { name: string; description: string; data: SampleContext }[] = [
  {
    name: 'Order #SDP-090412 (Tirzepatide)',
    description: 'Paid order with Tirzepatide and Bacteriostatic Water',
    data: {
      customer_name: 'Maria Santos',
      customer_email: 'maria.santos@gmail.com',
      customer_phone: '+63 917 849 2011',
      order_number: 'SDP-090412',
      order_id: 'SDP-090412',
      order_date: 'Sept 9, 2026, 2:30 PM PHT',
      order_status: 'Confirmed',
      items_summary: '• Tirzepatide 10mg Lyophilized (1x) — ₱3,500.00\n• BAC Water 10ml Reconstitution Solution (2x) — ₱800.00',
      items_table_html: SAMPLE_ORDER_ITEMS_TABLE_HTML,
      subtotal: '4,300.00',
      shipping_fee: '200.00',
      discount: '430.00',
      promo_code: 'SLIM10',
      total_price: '4,070.00',
      payment_method: 'GCash (Verified Instant Transfer)',
      shipping_address: 'Unit 1402, Icon Residences, 26th St, BGC, Taguig City, Metro Manila 1634',
      shipping_provider: 'LBC Express Priority Cold-Pack',
      tracking_number: 'LBC-PH-992019482',
      tracking_url: 'https://slimdoseph.com/track-order?id=SDP-090412',
      site_url: 'https://slimdoseph.com',
      catalog_url: 'https://slimdoseph.com/#products',
      support_email: 'support@slimdoseph.com',
      discount_percentage: '10%',
      otp_code: '849201',
      expiry_minutes: '15',
      account_url: 'https://slimdoseph.com',
    },
  },
  {
    name: 'Order #SDP-088190 (Semaglutide + BPC-157)',
    description: 'Multi-item research protocol with Express Delivery',
    data: {
      customer_name: 'Dr. Juan Dela Cruz',
      customer_email: 'juan.delacruz@medclinic.ph',
      customer_phone: '+63 920 551 8892',
      order_number: 'SDP-088190',
      order_id: 'SDP-088190',
      order_date: 'Sept 9, 2026, 11:15 AM PHT',
      order_status: 'Shipped',
      items_summary: '• Semaglutide 5mg (2x) — ₱5,600.00\n• BPC-157 5mg Pure Grade (1x) — ₱2,100.00\n• Insulin Syringes 31G Pack of 10 (1x) — ₱350.00',
      items_table_html: `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse: separate; border-spacing: 0; background-color: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; overflow: hidden; margin-bottom: 8px;">
  <thead>
    <tr style="background-color: #F8FAFC;">
      <th align="left" style="padding: 12px 14px; font-size: 11px; font-weight: 800; color: #64748B; text-transform: uppercase; border-bottom: 1px solid #E2E8F0;">Product & Specification</th>
      <th align="center" style="padding: 12px 10px; font-size: 11px; font-weight: 800; color: #64748B; text-transform: uppercase; border-bottom: 1px solid #E2E8F0; width: 60px;">Qty</th>
      <th align="right" style="padding: 12px 14px; font-size: 11px; font-weight: 800; color: #64748B; text-transform: uppercase; border-bottom: 1px solid #E2E8F0; width: 100px;">Price</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td style="padding: 14px; border-bottom: 1px solid #F1F5F9; font-size: 13px; color: #0F172A;">
        <div style="font-weight: 800;">Semaglutide 5mg Pure Grade</div>
        <div style="margin-top: 4px; display: inline-block; background-color: #EFF6FF; color: #2563EB; font-size: 10.5px; font-weight: 700; padding: 2px 8px; border-radius: 6px;">5mg &bull; Dual Vial Protocol</div>
      </td>
      <td align="center" style="padding: 14px 10px; border-bottom: 1px solid #F1F5F9; font-size: 13px; font-weight: 700;">2x</td>
      <td align="right" style="padding: 14px; border-bottom: 1px solid #F1F5F9; font-size: 13.5px; font-weight: 800;">₱5,600.00</td>
    </tr>
    <tr>
      <td style="padding: 14px; border-bottom: 1px solid #F1F5F9; font-size: 13px; color: #0F172A;">
        <div style="font-weight: 800;">BPC-157 5mg Pure Grade</div>
        <div style="margin-top: 4px; display: inline-block; background-color: #F5F3FF; color: #7C3AED; font-size: 10.5px; font-weight: 700; padding: 2px 8px; border-radius: 6px;">Cellular Repair Research Form</div>
      </td>
      <td align="center" style="padding: 14px 10px; border-bottom: 1px solid #F1F5F9; font-size: 13px; font-weight: 700;">1x</td>
      <td align="right" style="padding: 14px; border-bottom: 1px solid #F1F5F9; font-size: 13.5px; font-weight: 800;">₱2,100.00</td>
    </tr>
    <tr>
      <td style="padding: 14px; font-size: 13px; color: #0F172A;">
        <div style="font-weight: 800;">Insulin Syringes 31G Pack of 10</div>
      </td>
      <td align="center" style="padding: 14px 10px; font-size: 13px; font-weight: 700;">1x</td>
      <td align="right" style="padding: 14px; font-size: 13.5px; font-weight: 800;">₱350.00</td>
    </tr>
  </tbody>
</table>`,
      subtotal: '8,050.00',
      shipping_fee: '250.00',
      discount: '800.00',
      promo_code: 'DOCTORCARE',
      total_price: '7,500.00',
      payment_method: 'Bank Transfer (BDO Unibank)',
      shipping_address: 'Medical Plaza Suite 801, Ortigas Center, Pasig City 1605',
      shipping_provider: 'J&T Express Cold-Pack',
      tracking_number: 'JT-982103991-PH',
      tracking_url: 'https://slimdoseph.com/track-order?id=SDP-088190',
      site_url: 'https://slimdoseph.com',
      catalog_url: 'https://slimdoseph.com/#products',
      support_email: 'support@slimdoseph.com',
      discount_percentage: '15%',
      otp_code: '392019',
      expiry_minutes: '15',
      account_url: 'https://slimdoseph.com',
    },
  },
  {
    name: 'Customer Account / OTP (Sofia)',
    description: 'Account verification, OTP, and customer engagement',
    data: {
      customer_name: 'Sofia Rodriguez',
      customer_email: 'sofia.rodriguez@outlook.com',
      customer_phone: '+63 918 223 9918',
      order_number: 'SDP-099000',
      order_id: 'SDP-099000',
      order_date: 'Sept 9, 2026',
      order_status: 'Active',
      items_summary: '• GLP-1 Protocol Starter Kit',
      items_table_html: SAMPLE_ORDER_ITEMS_TABLE_HTML,
      subtotal: '5,000.00',
      shipping_fee: '0.00',
      discount: '750.00',
      promo_code: 'WELCOME15',
      total_price: '4,250.00',
      payment_method: 'Credit Card / GCash',
      shipping_address: 'Alabang Hills Village, Muntinlupa City',
      shipping_provider: 'LBC Express',
      tracking_number: 'PENDING',
      tracking_url: 'https://slimdoseph.com/track-order?id=SDP-099000',
      site_url: 'https://slimdoseph.com',
      catalog_url: 'https://slimdoseph.com/#products',
      support_email: 'support@slimdoseph.com',
      discount_percentage: '15%',
      otp_code: '718294',
      expiry_minutes: '15',
      account_url: 'https://slimdoseph.com',
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
  if (data.customer_phone) {
    lookupMap['event.properties.customer_phone'] = data.customer_phone;
    lookupMap['phone'] = data.customer_phone;
  }
  if (data.order_date) {
    lookupMap['event.properties.order_date'] = data.order_date;
    lookupMap['date'] = data.order_date;
  }
  if (data.items_table_html) {
    lookupMap['event.properties.items_table_html'] = data.items_table_html;
    lookupMap['items_table'] = data.items_table_html;
  } else if (data.items_summary) {
    // Fallback: If template calls items_table_html but only items_summary is provided
    lookupMap['items_table_html'] = `<div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 14px 16px; font-size: 13.5px; color: #1E293B; line-height: 1.8; white-space: pre-line;">${data.items_summary}</div>`;
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
