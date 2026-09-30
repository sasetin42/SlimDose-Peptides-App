/**
 * SlimDose Transactional Email & SMTP Relay Service
 * Enterprise multi-provider email dispatcher with guaranteed Hostinger Business Email integration.
 */

import { auth } from '../lib/firebase';
import { sendPasswordResetEmail } from 'firebase/auth';
import { DEFAULT_EMAIL_TEMPLATES, EmailTemplateData } from '../utils/emailDefaults';
import { renderEmailTemplate, renderEmailSubject } from '../utils/emailRenderer';
import { formatOrderId } from '../utils/orderUtils';

export interface SmtpConfig {
  enabled: boolean;
  provider: 'hostinger' | 'smtp' | 'gmail' | 'brevo' | 'resend' | 'sendgrid' | string;
  host: string;
  port: number;
  encryptionType?: 'none' | 'ssl' | 'starttls' | string;
  secure: boolean;
  authRequired: boolean;
  user: string;
  pass: string;
  fromEmail: string;
  fromName: string;
  replyToEmail?: string;
  adminEmail: string;
  sendOrderReceipt: boolean;
  sendAdminAlert: boolean;
  sendStatusUpdate: boolean;
  relayUrl?: string;
}

export interface OrderEmailPayload {
  orderId: string;
  orderNumber?: string | null;
  customerName: string;
  customerEmail: string;
  customerPhone?: string | null;
  shippingAddress?: string | null;
  shippingLocation?: string | null;
  shippingFee?: number | string | null;
  subtotal?: number | string | null;
  discountApplied?: number | string | null;
  promoCode?: string | null;
  totalPrice: number | string;
  paymentMethodName?: string | null;
  contactMethod?: string | null;
  notes?: string | null;
  items?: Array<{
    product_name: string;
    variation_name?: string | null;
    quantity: number;
    price: number | string;
    total: number | string;
  }>;
  itemsSummary?: string | null;
  trackingNumber?: string | null;
  trackingCourier?: string | null;
  status?: string | null;
}

export interface EmailLogEntry {
  id: string;
  recipient: string;
  sender: string;
  subject: string;
  status: 'sending' | 'sent' | 'accepted' | 'delivered' | 'failed';
  messageId?: string;
  smtpHost?: string;
  smtpPort?: number | string;
  provider?: string;
  timestamp: string;
  serverResponse?: string;
  errorMessage?: string;
  renderedHtml?: string;
}

const SETTINGS_STORAGE_KEY = 'slimdose_site_settings_v1';
const TEMPLATES_STORAGE_KEY = 'slimdose_email_templates_v1';
const EMAIL_LOGS_STORAGE_KEY = 'slimdose_email_activity_logs_v1';

/**
 * Clean & Format PHP Currency
 */
export const formatCurrencyPhp = (num: number | string) => {
  const parsed = typeof num === 'string' ? parseFloat(num.replace(/[^0-9.-]+/g, '')) || 0 : num;
  return `₱${Number(parsed || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

/**
 * Retrieve active SMTP configuration from local storage / memory.
 * SECURITY: the SMTP password is NEVER hardcoded here — it must be configured
 * by an administrator in Site Settings (stored server-side in site_settings).
 */
export function getActiveSmtpConfig(): SmtpConfig {
  try {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (stored) {
        const s = JSON.parse(stored);
        const host = s.smtp_host || 'smtp.hostinger.com';
        const isHostinger = host.includes('hostinger') || s.smtp_provider === 'hostinger';
        const portNum = parseInt(s.smtp_port, 10) || 465;
        const encType = s.smtp_encryption_type || (portNum === 465 ? 'ssl' : portNum === 587 ? 'starttls' : 'ssl');
        const relayUrl = s.smtp_relay_url || (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_SMTP_RELAY_URL) || '';

        return {
          enabled: s.smtp_enabled === 'true' || s.smtp_enabled === true,
          provider: isHostinger ? 'hostinger' : (s.smtp_provider || 'hostinger'),
          host: isHostinger || !s.smtp_host ? 'smtp.hostinger.com' : s.smtp_host,
          port: portNum,
          encryptionType: encType,
          secure: encType === 'ssl' || portNum === 465 || s.smtp_secure !== 'false',
          authRequired: s.smtp_auth_required !== 'false',
          user: s.smtp_user || 'noreply@slimdoseph.com',
          pass: s.smtp_pass || '',
          fromEmail: s.smtp_from_email || 'noreply@slimdoseph.com',
          fromName: s.smtp_from_name || 'SlimDose Peptides',
          replyToEmail: s.smtp_reply_to_email || s.smtp_from_email || 'noreply@slimdoseph.com',
          adminEmail: s.smtp_admin_email || 'noreply@slimdoseph.com',
          sendOrderReceipt: s.smtp_send_order_receipt !== 'false',
          sendAdminAlert: s.smtp_send_admin_alert !== 'false',
          sendStatusUpdate: s.smtp_send_status_update !== 'false',
          relayUrl,
        };
      }
    }
  } catch (e) {
    console.warn('[emailService] Could not parse stored SMTP config:', e);
  }

  // Safe defaults — no credentials. Email sends will fail until an admin
  // configures the SMTP password in Site Settings → Email Settings.
  const defaultRelay = (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_SMTP_RELAY_URL) || '';
  return {
    enabled: true,
    provider: 'hostinger',
    host: 'smtp.hostinger.com',
    port: 465,
    encryptionType: 'ssl',
    secure: true,
    authRequired: true,
    user: 'noreply@slimdoseph.com',
    pass: '',
    fromEmail: 'noreply@slimdoseph.com',
    fromName: 'SlimDose Peptides',
    replyToEmail: 'noreply@slimdoseph.com',
    adminEmail: 'noreply@slimdoseph.com',
    sendOrderReceipt: true,
    sendAdminAlert: true,
    sendStatusUpdate: true,
    relayUrl: defaultRelay,
  };
}

/**
 * Retrieve stored transaction logs
 */
export function getEmailActivityLogs(): EmailLogEntry[] {
  try {
    if (typeof window !== 'undefined') {
      const raw = localStorage.getItem(EMAIL_LOGS_STORAGE_KEY);
      if (raw) {
        return JSON.parse(raw);
      }
    }
  } catch (e) {}
  return [];
}

/**
 * Record a transaction log entry locally and dispatch sync event
 */
export function recordEmailLog(entry: EmailLogEntry): void {
  try {
    if (typeof window !== 'undefined') {
      const logs = getEmailActivityLogs();
      const updated = [entry, ...logs.filter((l) => l.id !== entry.id)].slice(0, 100);
      localStorage.setItem(EMAIL_LOGS_STORAGE_KEY, JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent('slimdose_email_logs_updated', { detail: updated }));
    }
  } catch (e) {
    console.warn('[emailService] Could not save email log:', e);
  }
}

/**
 * Clear stored transaction logs
 */
export function clearStoredEmailLogs(): void {
  try {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(EMAIL_LOGS_STORAGE_KEY);
      window.dispatchEvent(new CustomEvent('slimdose_email_logs_updated', { detail: [] }));
    }
  } catch (e) {}
}

/**
 * Helper to resolve relay endpoints for testing and email dispatch.
 * In local dev: defaults to '/api/...', or 'http://localhost:3055/api/...' if standalone.
 * In live deploy: uses configured relayUrl or falls back gracefully.
 */
function getRelayEndpoints(action: 'test' | 'send', customRelayUrl?: string): string[] {
  const isLocal = typeof window !== 'undefined' && (
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname.startsWith('192.168.')
  );

  const path = action === 'test' ? '/api/smtp-test-connection' : '/api/send-email';
  const endpoints: string[] = [];

  if (customRelayUrl && customRelayUrl.trim()) {
    const cleanUrl = customRelayUrl.trim().replace(/\/$/, '');
    endpoints.push(`${cleanUrl}${path}`);
    endpoints.push(`${cleanUrl}/${action === 'test' ? 'smtp-test-connection' : 'send-email'}`);
  }

  // Same-origin relative path (handled by Vite dev server plugin or production proxy)
  endpoints.push(path);

  // Local fallback if running standalone smtp-server.js on port 3055
  if (isLocal) {
    endpoints.push(`http://localhost:3055${path}`);
  }

  return Array.from(new Set(endpoints));
}

/**
 * Test SMTP Connection (Real Handshake & Auth Verification)
 */
export async function testSmtpConnection(
  config?: Partial<SmtpConfig>
): Promise<{ success: boolean; message: string; code?: string; details?: any }> {
  const active = { ...getActiveSmtpConfig(), ...(config || {}) };

  if (!active.host) {
    return { success: false, message: 'Cannot connect: SMTP Host is missing or invalid.' };
  }

  const payload = {
    smtpHost: active.host.trim(),
    smtpPort: active.port || 465,
    secure: active.encryptionType === 'ssl' || active.secure === true || Number(active.port) === 465,
    authRequired: active.authRequired !== false,
    smtpUser: (active.user || '').trim(),
    smtpPass: active.pass || '',
  };

  const endpoints = getRelayEndpoints('test', active.relayUrl);
  let lastError: any = null;
  let receivedStaticHtml = false;

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(payload),
      });

      const contentType = response.headers.get('content-type') || '';
      let data: any = {};

      if (contentType.includes('application/json')) {
        data = await response.json().catch(() => ({}));
      } else {
        const text = await response.text().catch(() => '');
        // Check if static hosting SPA rewrite intercepted the call with index.html
        if (text.includes('<!DOCTYPE') || text.includes('<html') || text.includes('<!doctype')) {
          receivedStaticHtml = true;
          continue; // Try next candidate endpoint if any
        }
        try {
          data = JSON.parse(text);
        } catch {
          data = {};
        }
      }

      if (response.ok && data?.success) {
        return {
          success: true,
          message: data.message || `Connected & authenticated to ${payload.smtpHost}:${payload.smtpPort}`,
          details: data,
        };
      } else if (data?.error || data?.message) {
        return {
          success: false,
          message: data.error || data.message,
          code: data.code,
          details: data,
        };
      }
    } catch (err: any) {
      lastError = err;
    }
  }

  // Real Server Verification Rule:
  // NEVER synthesize or fake a successful connection. All results must stem from the actual backend response.
  let finalMessage = '❌ Cannot connect to the SMTP server. Please ensure the SMTP relay server is reachable.';
  if (lastError?.message) {
    finalMessage = `❌ ${lastError.message}`;
  } else if (receivedStaticHtml) {
    finalMessage = '❌ Cannot reach SMTP backend relay: Received static HTML from host instead of API response. Please verify backend API endpoint.';
  }

  return {
    success: false,
    message: finalMessage,
    code: 'SMTP_UNREACHABLE',
  };
}

/**
 * Load dynamic template by template_key from storage / fallback
 */
export function getStoredTemplateByKey(key: string): EmailTemplateData {
  try {
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem(TEMPLATES_STORAGE_KEY);
      if (cached) {
        const list: EmailTemplateData[] = JSON.parse(cached);
        const match = list.find((t) => t.template_key === key && t.is_active !== false);
        if (match) return match;
      }
    }
  } catch (e) {}

  const defaultMatch = DEFAULT_EMAIL_TEMPLATES.find((t) => t.template_key === key);
  return defaultMatch || DEFAULT_EMAIL_TEMPLATES[0];
}

/**
 * Generate SMTP Diagnostic Verification HTML
 */
export interface SmtpTestEmailParams {
  host: string;
  port: number;
  user?: string;
  fromEmail?: string;
  fromName?: string;
  adminEmail?: string;
  customMessage?: string;
}

export const generateSmtpTestEmailHtml = (config: SmtpTestEmailParams, recipientEmail?: string): string => {
  const verificationCode = `SD-VERIF-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  const timestampManila = new Date().toLocaleString('en-PH', { timeZone: 'Asia/Manila' });

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SMTP Verification — SlimDose</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F8FAFC; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" style="padding: 32px 16px;">
        <table role="presentation" width="580" cellpadding="0" cellspacing="0" style="background-color: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05);">
          <tr>
            <td style="padding: 32px 32px 24px; background: linear-gradient(135deg, #0F172A 0%, #1E3A8A 50%, #0F172A 100%);">
              <p style="margin: 0; font-size: 24px; font-weight: 900; color: #FFFFFF;">
                SlimDose <span style="color: #60A5FA; font-weight: 700;">Peptides</span>
              </p>
              <p style="margin: 6px 0 0; font-size: 11px; color: #93C5FD; text-transform: uppercase; letter-spacing: 0.18em; font-weight: 800;">
                Production SMTP Test
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px 32px 16px;">
              <h1 style="margin: 0; font-size: 22px; font-weight: 900; color: #0F172A;">
                Live SMTP Test Successful 🎉
              </h1>
              <p style="margin: 12px 0 0; font-size: 14px; color: #475569; line-height: 1.7;">
                This confirms that your SMTP server (<strong>${config.host}</strong>) accepted and dispatched this email from <strong>${config.fromEmail || config.user || 'the configured sender'}</strong>.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 32px 24px;">
              <div style="background-color: #F8FAFC; border: 1px solid #CBD5E1; border-radius: 16px; padding: 20px;">
                <p style="margin: 0 0 14px; font-size: 12px; color: #1E3A8A; text-transform: uppercase; font-weight: 900; letter-spacing: 0.08em; border-bottom: 1px solid #E2E8F0; padding-bottom: 8px;">
                  📋 Connection Parameters
                </p>
                <table role="presentation" width="100%" style="font-size: 13px; color: #1E293B;">
                  <tr><td style="padding: 4px 0; color: #64748B;">Recipient:</td><td style="font-weight: 800; font-family: monospace;">${recipientEmail || config.adminEmail || 'n/a'}</td></tr>
                  <tr><td style="padding: 4px 0; color: #64748B;">Host:</td><td style="font-weight: 800; font-family: monospace;">${config.host}:${config.port}</td></tr>
                  <tr><td style="padding: 4px 0; color: #64748B;">Sender:</td><td style="font-weight: 700;">${config.fromName || 'SlimDose Peptides'} &lt;${config.fromEmail || config.user || 'noreply@slimdoseph.com'}&gt;</td></tr>
                  <tr><td style="padding: 4px 0; color: #64748B;">Ref ID:</td><td style="font-weight: 800; font-family: monospace; color: #059669;">${verificationCode}</td></tr>
                  <tr><td style="padding: 4px 0; color: #64748B;">Time (PHT):</td><td>${timestampManila}</td></tr>
                </table>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding: 24px 32px; background-color: #F8FAFC; border-top: 1px solid #E2E8F0; text-align: center;">
              <p style="margin: 0; font-size: 11px; color: #94A3B8;">
                © SlimDose Peptides Philippines · Transactional Mail Subsystem
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
};

/**
 * Universal Real-Time Transactional Email Dispatcher
 * Sends genuine emails via backend SMTP relay without mock or simulated fallbacks.
 */
export const sendTransactionalEmail = async (params: {
  to: string;
  subject: string;
  html: string;
  fromEmail?: string;
  fromName?: string;
  replyTo?: string;
  smtpConfig?: Partial<SmtpConfig>;
  isTest?: boolean;
}): Promise<{
  success: boolean;
  messageId?: string;
  error?: string;
  providerUsed?: string;
  response?: string;
}> => {
  const config = { ...getActiveSmtpConfig(), ...(params.smtpConfig || {}) };

  // If not a test send and master switch is disabled, skip silently
  if (!config.enabled && !params.isTest) {
    return {
      success: true,
      messageId: `skipped_disabled_${Date.now()}`,
      providerUsed: 'disabled',
    };
  }

  // Validate recipient email upfront
  const toClean = (params.to || '').trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!toClean || !emailRegex.test(toClean)) {
    return {
      success: false,
      error: 'Invalid recipient email address format (e.g. name@example.com)',
      providerUsed: 'validation_guard',
    };
  }

  const senderEmail = params.fromEmail || config.fromEmail || 'noreply@slimdoseph.com';
  const senderName = params.fromName || config.fromName || 'SlimDose Peptides';
  const replyTo = params.replyTo || config.replyToEmail || senderEmail;
  const logId = `LOG-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  const timestamp = new Date().toLocaleString('en-PH', { timeZone: 'Asia/Manila' });

  // Initial log entry: sending state
  recordEmailLog({
    id: logId,
    recipient: toClean,
    sender: `${senderName} <${senderEmail}>`,
    subject: params.subject,
    status: 'sending',
    smtpHost: config.host,
    smtpPort: config.port,
    provider: `${config.host}:${config.port}`,
    timestamp,
  });

  const payload = {
    to: toClean,
    subject: params.subject,
    html: params.html,
    fromEmail: senderEmail,
    fromName: senderName,
    replyTo,
    smtpHost: config.host || 'smtp.hostinger.com',
    smtpPort: config.port || 465,
    smtpUser: config.user || 'noreply@slimdoseph.com',
    smtpPass: config.pass || '',
    secure: config.encryptionType === 'ssl' || config.secure === true || Number(config.port) === 465,
    authRequired: config.authRequired !== false,
  };

  const endpoints = getRelayEndpoints('send', config.relayUrl);
  let lastErrorMsg = '';

  for (const endpoint of endpoints) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000);

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
        keepalive: true,
      });
      clearTimeout(timeoutId);

      const contentType = res.headers.get('content-type') || '';
      let data: any = {};

      if (contentType.includes('application/json')) {
        data = await res.json().catch(() => ({}));
      } else {
        const text = await res.text().catch(() => '');
        if (text.includes('<!DOCTYPE') || text.includes('<html')) {
          // Static hosting SPA rewrite intercepted the request
          continue;
        }
        try {
          data = JSON.parse(text);
        } catch {
          data = {};
        }
      }

      if (res.ok && data?.success) {
        const successResult = {
          success: true,
          messageId: data.messageId || `msg_${Date.now()}`,
          providerUsed: data.provider || `${config.host}:${config.port}`,
          response: data.response || '250 OK - Message accepted for delivery',
        };

        recordEmailLog({
          id: logId,
          recipient: toClean,
          sender: `${senderName} <${senderEmail}>`,
          subject: params.subject,
          status: 'accepted',
          messageId: successResult.messageId,
          smtpHost: config.host,
          smtpPort: config.port,
          provider: successResult.providerUsed,
          timestamp,
          serverResponse: successResult.response,
          renderedHtml: params.html,
        });

        return successResult;
      } else {
        lastErrorMsg = data?.error || (res.ok ? 'Invalid response from SMTP server' : `SMTP server error: status ${res.status}`);
      }
    } catch (err: any) {
      lastErrorMsg = err.name === 'AbortError'
        ? 'Connection timed out: SMTP server did not respond within 20 seconds.'
        : err.message || 'Cannot reach SMTP backend server.';
    }
  }

  // Real Delivery Rule:
  // NEVER fake or simulate a successful email send. All results must stem directly from the actual SMTP server response.
  let finalErrorMsg = lastErrorMsg;
  if (!finalErrorMsg) {
    finalErrorMsg = '❌ Cannot connect to the SMTP server or backend relay is unreachable.';
  }

  recordEmailLog({
    id: logId,
    recipient: toClean,
    sender: `${senderName} <${senderEmail}>`,
    subject: params.subject,
    status: 'failed',
    smtpHost: config.host,
    smtpPort: config.port,
    provider: `${config.host}:${config.port}`,
    timestamp,
    errorMessage: finalErrorMsg,
  });

  return {
    success: false,
    error: finalErrorMsg,
    providerUsed: `${config.host}:${config.port}`,
  };
};




export type OrderTemplateKey =
  | 'order-confirmed'
  | 'order-received'
  | 'order-confirmation'
  | 'order-processing'
  | 'order-shipped'
  | 'order-delivered'
  | 'order-cancelled'
  | 'payment-confirmed'
  | 'order-dispatched';

export type MarketingTemplateKey =
  | 'promo-welcome'
  | 'thank-you-order'
  | 'we-miss-you';

/**
 * Dispatch dynamic order email based on order state and saved template design
 */
export async function dispatchOrderEmail(
  templateKey: OrderTemplateKey,
  payload: OrderEmailPayload,
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const config = getActiveSmtpConfig();
  if (!config.enabled) return { success: true };

  // Check trigger permissions
  if (templateKey === 'order-confirmed' || templateKey === 'order-received' || templateKey === 'order-confirmation') {
    if (!config.sendOrderReceipt) return { success: true };
  } else if (templateKey === 'order-shipped' || templateKey === 'order-delivered' || templateKey === 'order-dispatched') {
    if (!config.sendStatusUpdate) return { success: true };
  }

  // Load template
  const template = getStoredTemplateByKey(templateKey);

  // Build items summary and rich HTML table
  let itemsText = payload.itemsSummary || '';
  if (!itemsText && payload.items && payload.items.length > 0) {
    itemsText = payload.items
      .map(
        (i) =>
          `• ${i.product_name}${i.variation_name ? ` (${i.variation_name})` : ''} (${i.quantity}x) — ${formatCurrencyPhp(i.total)}`,
      )
      .join('\n');
  }

  let itemsTableHtml = '';
  if (payload.items && payload.items.length > 0) {
    const rows = payload.items
      .map((item, idx) => {
        const isLast = idx === (payload.items?.length || 0) - 1;
        const borderStyle = isLast ? '' : 'border-bottom: 1px solid #F1F5F9;';
        const formattedTotal = formatCurrencyPhp(item.total);
        const variationBadge = item.variation_name
          ? `<div style="margin-top: 4px; display: inline-block; background-color: #EFF6FF; color: #2563EB; font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 6px;">${item.variation_name}</div>`
          : '';

        return `
    <tr>
      <td style="padding: 14px; ${borderStyle} font-size: 13px; color: #0F172A; vertical-align: middle;">
        <div style="font-weight: 800; color: #0F172A; font-size: 13.5px;">${item.product_name}</div>
        ${variationBadge}
      </td>
      <td align="center" style="padding: 14px 10px; ${borderStyle} font-size: 13px; font-weight: 700; color: #334155; vertical-align: middle;">
        ${item.quantity}x
      </td>
      <td align="right" style="padding: 14px; ${borderStyle} font-size: 13.5px; font-weight: 800; color: #0F172A; vertical-align: middle;">
        ${formattedTotal}
      </td>
    </tr>`;
      })
      .join('');

    itemsTableHtml = `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse: separate; border-spacing: 0; background-color: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; overflow: hidden; margin-bottom: 8px;">
  <thead>
    <tr style="background-color: #F8FAFC;">
      <th align="left" style="padding: 12px 14px; font-size: 11px; font-weight: 800; color: #64748B; text-transform: uppercase; letter-spacing: 0.08em; border-bottom: 1px solid #E2E8F0;">Product &amp; Dosage</th>
      <th align="center" style="padding: 12px 10px; font-size: 11px; font-weight: 800; color: #64748B; text-transform: uppercase; letter-spacing: 0.08em; border-bottom: 1px solid #E2E8F0; width: 60px;">Qty</th>
      <th align="right" style="padding: 12px 14px; font-size: 11px; font-weight: 800; color: #64748B; text-transform: uppercase; letter-spacing: 0.08em; border-bottom: 1px solid #E2E8F0; width: 100px;">Price</th>
    </tr>
  </thead>
  <tbody>
    ${rows}
  </tbody>
</table>`;
  } else if (itemsText) {
    itemsTableHtml = `<div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 14px 16px; font-size: 13.5px; color: #1E293B; line-height: 1.8; white-space: pre-line;">${itemsText}</div>`;
  }

  const orderDateString = new Date().toLocaleString('en-PH', {
    timeZone: 'Asia/Manila',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  const formattedRef = formatOrderId({ id: payload.orderId, order_number: payload.orderNumber }, { prefix: false });

  const variables: Record<string, any> = {
    customer_name: payload.customerName,
    customer_first_name: (payload.customerName || '').split(' ')[0],
    customer_email: payload.customerEmail,
    customer_phone: payload.customerPhone || 'N/A',
    order_number: formattedRef,
    order_id: formattedRef,
    order_date: orderDateString,
    order_status: payload.status || 'Confirmed',
    items_summary: itemsText,
    items_table_html: itemsTableHtml,
    subtotal: payload.subtotal ? (typeof payload.subtotal === 'number' ? formatCurrencyPhp(payload.subtotal).replace('₱', '') : String(payload.subtotal)) : '0.00',
    shipping_fee: payload.shippingFee ? (typeof payload.shippingFee === 'number' ? formatCurrencyPhp(payload.shippingFee).replace('₱', '') : String(payload.shippingFee)) : '0.00',
    discount: payload.discountApplied ? (typeof payload.discountApplied === 'number' ? formatCurrencyPhp(payload.discountApplied).replace('₱', '') : String(payload.discountApplied)) : '0.00',
    promo_code: payload.promoCode || 'NONE',
    discount_percentage: payload.promoCode ? '10%' : '0%',
    total_price: typeof payload.totalPrice === 'number' ? formatCurrencyPhp(payload.totalPrice).replace('₱', '') : payload.totalPrice,
    payment_method: payload.paymentMethodName || 'GCash / Bank Transfer',
    shipping_address: payload.shippingAddress || '',
    shipping_provider: payload.trackingCourier || 'LBC Express',
    tracking_number: payload.trackingNumber || 'PENDING',
    tracking_url: `https://slimdoseph.com/track-order?id=${encodeURIComponent(payload.orderNumber || payload.orderId)}`,
    site_url: 'https://slimdoseph.com',
    catalog_url: 'https://slimdoseph.com/#products',
    customer_hub_url: `https://slimdoseph.com/customer-hub?email=${encodeURIComponent(payload.customerEmail)}`,
    support_email: config.fromEmail || 'noreply@slimdoseph.com',
    unsubscribe_url: `https://slimdoseph.com/#/unsubscribe?email=${encodeURIComponent(payload.customerEmail)}`,
  };

  const renderedHtml = renderEmailTemplate(template.html_content, variables);
  const renderedSubject = renderEmailSubject(template.subject, variables);

  const res = await sendTransactionalEmail({
    to: payload.customerEmail,
    subject: renderedSubject,
    html: renderedHtml,
    smtpConfig: config,
  });

  // Also dispatch Admin New Order Alert if enabled
  if (config.sendAdminAlert && (templateKey === 'order-confirmed' || templateKey === 'order-received' || templateKey === 'order-confirmation') && config.adminEmail) {
    sendTransactionalEmail({
      to: config.adminEmail,
      subject: `🚨 [Admin Alert] New Order #${payload.orderNumber || payload.orderId} from ${payload.customerName}`,
      html: renderedHtml,
      smtpConfig: config,
    }).catch(() => {});
  }

  return res;
}

/**
 * Dispatch dynamic marketing, loyalty, or re-engagement email based on saved template design
 */
export async function dispatchMarketingEmail(
  templateKey: MarketingTemplateKey,
  payload: {
    recipientEmail: string;
    customerName?: string;
    promoCode?: string;
    discountPercentage?: string;
    catalogUrl?: string;
    siteUrl?: string;
  }
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const config = getActiveSmtpConfig();
  if (!config.enabled) return { success: true };

  const template = getStoredTemplateByKey(templateKey);
  const baseUrl = payload.siteUrl || 'https://slimdoseph.com';
  const customerHubUrl = `${baseUrl.replace(/\/$/, '')}/customer-hub?email=${encodeURIComponent(payload.recipientEmail)}`;

  const variables: Record<string, any> = {
    customer_name: payload.customerName || 'Valued Customer',
    customer_first_name: (payload.customerName || 'Valued Customer').split(' ')[0],
    customer_email: payload.recipientEmail,
    promo_code: payload.promoCode || 'SLIM10',
    discount_percentage: payload.discountPercentage || '10%',
    catalog_url: payload.catalogUrl || `${baseUrl}/#products`,
    site_url: baseUrl,
    customer_hub_url: customerHubUrl,
    support_email: config.fromEmail || 'noreply@slimdoseph.com',
    unsubscribe_url: `https://slimdoseph.com/#/unsubscribe?email=${encodeURIComponent(payload.recipientEmail)}`,
    order_number: '',
    order_id: '',
    items_summary: '',
    total_price: '',
    tracking_number: '',
  };

  const renderedHtml = renderEmailTemplate(template.html_content, variables);
  const renderedSubject = renderEmailSubject(template.subject, variables);

  return sendTransactionalEmail({
    to: payload.recipientEmail,
    subject: renderedSubject,
    html: renderedHtml,
    smtpConfig: config,
  });
}

/**
 * Dispatch Branded 6-Digit Password Reset OTP Email
 */
export async function dispatchPasswordResetOtpEmail(
  recipientEmail: string,
  pin: string,
  customerName?: string,
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const config = getActiveSmtpConfig();
  const name = customerName || 'Valued Customer';
  const template = getStoredTemplateByKey('password-reset-otp');

  const variables: Record<string, any> = {
    customer_name: name,
    customer_first_name: name.split(' ')[0],
    customer_email: recipientEmail,
    otp_code: pin,
    expiry_minutes: '15',
    support_email: config.fromEmail || 'info@slimdoseph.com',
    site_url: 'https://slimdoseph.com',
    account_url: 'https://slimdoseph.com',
    order_number: '',
    order_id: '',
  };

  const renderedHtml = renderEmailTemplate(template.html_content, variables);
  const renderedSubject = renderEmailSubject(template.subject, variables);

  return sendTransactionalEmail({
    to: recipientEmail,
    subject: renderedSubject,
    html: renderedHtml,
    smtpConfig: config,
    isTest: true,
  });
}

/**
 * 2. Dispatch Direct Customer Login / Registration OTP PIN Email
 * Used for instant, passwordless Customer portal access.
 */
export async function dispatchCustomerLoginOtpEmail(
  recipientEmail: string,
  pin: string,
  customerName?: string,
  isNewAccount: boolean = false
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const config = getActiveSmtpConfig();
  const name = customerName || (recipientEmail.split('@')[0] || 'Valued Customer');
  const templateKey = isNewAccount ? 'customer-welcome-registration' : 'customer-otp-login';
  const template = getStoredTemplateByKey(templateKey);

  const variables: Record<string, any> = {
    customer_name: name,
    customer_first_name: name.split(' ')[0],
    customer_email: recipientEmail,
    otp_code: pin,
    expiry_minutes: '15',
    support_email: config.fromEmail || 'info@slimdoseph.com',
    site_url: 'https://slimdoseph.com',
    account_url: 'https://slimdoseph.com',
    order_number: '',
    order_id: '',
  };

  const renderedHtml = renderEmailTemplate(template.html_content, variables);
  const renderedSubject = renderEmailSubject(template.subject, variables);

  // Also trigger Google Firebase Auth native email notification in parallel (100% deliverability from Google)
  try {
    sendPasswordResetEmail(auth, recipientEmail.trim().toLowerCase()).catch(() => {});
  } catch (e) {}

  return sendTransactionalEmail({
    to: recipientEmail,
    subject: renderedSubject,
    html: renderedHtml,
    smtpConfig: config,
    isTest: true,
  });
}
