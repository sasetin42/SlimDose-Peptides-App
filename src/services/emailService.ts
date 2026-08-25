/**
 * SlimDose Transactional Email & SMTP Relay Service
 * Enterprise multi-provider email dispatcher with guaranteed Hostinger Business Email integration.
 */

import { supabase } from '../lib/supabase';
import { DEFAULT_EMAIL_TEMPLATES, EmailTemplateData } from '../utils/emailDefaults';
import { renderEmailTemplate, renderEmailSubject } from '../utils/emailRenderer';

export interface SmtpConfig {
  enabled: boolean;
  provider: 'hostinger' | 'smtp' | 'gmail' | 'brevo' | 'resend' | 'sendgrid' | string;
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  fromEmail: string;
  fromName: string;
  adminEmail: string;
  sendOrderReceipt: boolean;
  sendAdminAlert: boolean;
  sendStatusUpdate: boolean;
}

export interface OrderEmailPayload {
  orderId: string;
  orderNumber?: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  shippingAddress?: string;
  shippingLocation?: string;
  shippingFee?: number | string;
  subtotal?: number | string;
  discountApplied?: number | string;
  promoCode?: string;
  totalPrice: number | string;
  paymentMethodName?: string;
  contactMethod?: string;
  notes?: string | null;
  items?: Array<{
    product_name: string;
    variation_name?: string | null;
    quantity: number;
    price: number | string;
    total: number | string;
  }>;
  itemsSummary?: string;
  trackingNumber?: string;
  trackingCourier?: string;
  status?: string;
}

const SETTINGS_STORAGE_KEY = 'slimdose_site_settings_v1';
const TEMPLATES_STORAGE_KEY = 'slimdose_email_templates_v1';

/**
 * Clean & Format PHP Currency
 */
export const formatCurrencyPhp = (num: number | string) => {
  const parsed = typeof num === 'string' ? parseFloat(num.replace(/[^0-9.-]+/g, '')) || 0 : num;
  return `₱${Number(parsed || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

/**
 * Retrieve active SMTP configuration from local storage / memory
 */
export function getActiveSmtpConfig(): SmtpConfig {
  try {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (stored) {
        const s = JSON.parse(stored);
        const host = s.smtp_host || 'smtp.hostinger.com';
        const isHostinger = host.includes('hostinger') || s.smtp_provider === 'hostinger';

        return {
          enabled: s.smtp_enabled === 'true' || s.smtp_enabled === true,
          provider: isHostinger ? 'hostinger' : (s.smtp_provider || 'hostinger'),
          host: s.smtp_host || 'smtp.hostinger.com',
          port: parseInt(s.smtp_port, 10) || 465,
          secure: s.smtp_secure !== 'false',
          user: s.smtp_user || 'info@slimdoseph.com',
          pass: s.smtp_pass || '',
          fromEmail: s.smtp_from_email || 'info@slimdoseph.com',
          fromName: s.smtp_from_name || 'SlimDose Peptides',
          adminEmail: s.smtp_admin_email || 'info@slimdoseph.com',
          sendOrderReceipt: s.smtp_send_order_receipt !== 'false',
          sendAdminAlert: s.smtp_send_admin_alert !== 'false',
          sendStatusUpdate: s.smtp_send_status_update !== 'false',
        };
      }
    }
  } catch (e) {
    console.warn('[emailService] Could not parse stored SMTP config:', e);
  }

  // Fallback defaults — live Hostinger Business Email configuration
  return {
    enabled: true,
    provider: 'hostinger',
    host: 'smtp.hostinger.com',
    port: 465,
    secure: true,
    user: 'info@slimdoseph.com',
    pass: '+f9NVWT>g',
    fromEmail: 'info@slimdoseph.com',
    fromName: 'SlimDose Peptides',
    adminEmail: 'info@slimdoseph.com',
    sendOrderReceipt: true,
    sendAdminAlert: true,
    sendStatusUpdate: true,
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
        const match = list.find((t) => t.template_key === key);
        if (match) return match;
      }
    }
  } catch (e) {}

  const defaultMatch = DEFAULT_EMAIL_TEMPLATES.find((t) => t.template_key === key);
  return defaultMatch || DEFAULT_EMAIL_TEMPLATES[0];
}

/**
 * Generate SMTP Diagnostic Verification HTML with rich Hostinger test data details
 */
export const generateSmtpTestEmailHtml = (config: SmtpConfig, recipientEmail?: string): string => {
  const verificationCode = `HD-VERIF-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  const timestampManila = new Date().toLocaleString('en-PH', { timeZone: 'Asia/Manila' });

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Hostinger SMTP Relay Verification — SlimDose</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F8FAFC; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" style="padding: 32px 16px;">
        <table role="presentation" width="580" cellpadding="0" cellspacing="0" style="background-color: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05);">
          <!-- Header Banner -->
          <tr>
            <td style="padding: 32px 32px 24px; background: linear-gradient(135deg, #0F172A 0%, #1E3A8A 50%, #0F172A 100%);">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <p style="margin: 0; font-size: 24px; font-weight: 900; color: #FFFFFF; letter-spacing: -0.02em;">
                      SlimDose <span style="color: #60A5FA; font-weight: 700;">Peptides</span>
                    </p>
                    <p style="margin: 6px 0 0; font-size: 11px; color: #93C5FD; text-transform: uppercase; letter-spacing: 0.18em; font-weight: 800;">
                      Hostinger Business Email Relay Active
                    </p>
                  </td>
                  <td align="right" valign="top">
                    <span style="display: inline-block; padding: 6px 12px; background-color: rgba(16, 185, 129, 0.2); border: 1px solid rgba(16, 185, 129, 0.4); border-radius: 9999px; color: #34D399; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em;">
                      ● Live Verified
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 32px 32px 16px;">
              <h1 style="margin: 0; font-size: 22px; font-weight: 900; color: #0F172A; line-height: 1.3;">
                Hostinger Email Relay Verified 🎉
              </h1>
              <p style="margin: 12px 0 0; font-size: 14px; color: #475569; line-height: 1.7;">
                This message confirms that your outbound Hostinger email service (<strong>${config.fromEmail || 'info@slimdoseph.com'}</strong>) is communicating with the SlimDose transactional email subsystem.
              </p>
            </td>
          </tr>

          <!-- Verification Details Card -->
          <tr>
            <td style="padding: 0 32px 24px;">
              <div style="background-color: #F8FAFC; border: 1px solid #CBD5E1; border-radius: 16px; padding: 20px;">
                <p style="margin: 0 0 14px; font-size: 12px; color: #1E3A8A; text-transform: uppercase; font-weight: 900; letter-spacing: 0.08em; border-bottom: 1px solid #E2E8F0; padding-bottom: 8px;">
                  📋 Hostinger SMTP Connection Parameters
                </p>
                <table role="presentation" width="100%" style="font-size: 13px; color: #1E293B; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 6px 0; color: #64748B; width: 40%;">Recipient Target:</td>
                    <td style="padding: 6px 0; font-weight: 800; color: #0F172A; font-family: monospace;">${recipientEmail || config.adminEmail || 'info@slimdoseph.com'}</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; color: #64748B;">Sender Identity:</td>
                    <td style="padding: 6px 0; font-weight: 700;">${config.fromName} &lt;${config.fromEmail}&gt;</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; color: #64748B;">Mail Server:</td>
                    <td style="padding: 6px 0; font-weight: 800; font-family: monospace; color: #2563EB;">${config.host}</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; color: #64748B;">Port & Security:</td>
                    <td style="padding: 6px 0; font-weight: 700;">Port ${config.port} (${config.secure ? 'SSL / TLS' : 'STARTTLS'})</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; color: #64748B;">Authenticated User:</td>
                    <td style="padding: 6px 0; font-weight: 700; font-family: monospace;">${config.user}</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; color: #64748B;">Verification Ref:</td>
                    <td style="padding: 6px 0; font-weight: 800; font-family: monospace; color: #059669;">${verificationCode}</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; color: #64748B;">Timestamp (PHT):</td>
                    <td style="padding: 6px 0; font-weight: 600; color: #334155;">${timestampManila}</td>
                  </tr>
                </table>
              </div>
            </td>
          </tr>

          <!-- Automated Triggers Summary -->
          <tr>
            <td style="padding: 0 32px 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 14px; padding: 14px;">
                <tr>
                  <td>
                    <p style="margin: 0 0 6px; font-size: 11px; font-weight: 800; color: #166534; text-transform: uppercase; letter-spacing: 0.05em;">
                      ⚡ Automated Transactional Triggers
                    </p>
                    <p style="margin: 0; font-size: 12px; color: #15803D; line-height: 1.5;">
                      • Customer Receipts: <strong>${config.sendOrderReceipt ? 'Active' : 'Disabled'}</strong> &nbsp;|&nbsp;
                      • Admin Alerts: <strong>${config.sendAdminAlert ? 'Active' : 'Disabled'}</strong> &nbsp;|&nbsp;
                      • Tracking Updates: <strong>${config.sendStatusUpdate ? 'Active' : 'Disabled'}</strong>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; background-color: #F8FAFC; border-top: 1px solid #E2E8F0; text-align: center;">
              <p style="margin: 0; font-size: 11px; color: #94A3B8; font-weight: 500;">
                © SlimDose Peptides Philippines &middot; Hostinger Email Relay &middot; Transactional Mail Subsystem
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
 * Universal Transactional Email Dispatcher with Hostinger Integration
 * PRIMARY: Convex HTTP Action → real server-side SMTP via smtp.hostinger.com:465
 * FALLBACK: Direct HTTP relay (formsubmit)
 */
export const sendTransactionalEmail = async (params: {
  to: string;
  subject: string;
  html: string;
  fromEmail?: string;
  fromName?: string;
  smtpConfig?: Partial<SmtpConfig>;
  isTest?: boolean;
}): Promise<{ success: boolean; messageId?: string; error?: string; providerUsed?: string }> => {
  const config = { ...getActiveSmtpConfig(), ...(params.smtpConfig || {}) };

  // If not a test send and master switch is disabled, skip silently
  if (!config.enabled && !params.isTest) {
    return {
      success: true,
      messageId: `skipped_disabled_${Date.now()}`,
      providerUsed: 'disabled',
    };
  }

  const senderEmail = params.fromEmail || config.fromEmail || 'info@slimdoseph.com';
  const senderName  = params.fromName  || config.fromName  || 'SlimDose Peptides';
  let lastError = '';

  // ── 0. Local Vite / Server-side Nodemailer Relay (Direct Hostinger SMTP:465) ──
  // This connects directly to smtp.hostinger.com via true server-side TCP/TLS socket
  try {
    const localRes = await fetch('/api/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: params.to,
        subject: params.subject,
        html: params.html,
        fromEmail: senderEmail,
        fromName: senderName,
        smtpHost: config.host || 'smtp.hostinger.com',
        smtpPort: config.port || 465,
        smtpUser: config.user || 'info@slimdoseph.com',
        smtpPass: config.pass || '+f9NVWT>g',
        secure: config.secure !== false,
      }),
    });

    if (localRes.ok) {
      const data = await localRes.json();
      if (data?.success) {
        console.info(`[SlimDose SMTP] ✅ Direct Hostinger SMTP delivery successful → ${params.to} (ID: ${data.messageId})`);
        return {
          success: true,
          messageId: data.messageId,
          providerUsed: `Hostinger SMTP (${config.host || 'smtp.hostinger.com'}:${config.port || 465})`,
        };
      }
    } else {
      const errData = await localRes.json().catch(() => null);
      if (errData && errData.error) {
        console.error('[SlimDose SMTP] Local relay reported error:', errData.error);
        lastError = `Hostinger SMTP Error: ${errData.error}`;
      }
    }
  } catch (localErr: any) {
    console.debug('[SlimDose SMTP] Local /api/send-email endpoint not reachable or offline, checking cloud relays...');
  }

  // ── 1. Convex HTTP Action → Real SMTP via smtp.hostinger.com:465 ────────────
  try {
    const convexUrl = (typeof window !== 'undefined' && (window as any).__CONVEX_URL__)
      || (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_CONVEX_URL)
      || '';

    if (convexUrl) {
      const httpBase = convexUrl.replace('.convex.cloud', '.convex.site');

      const res = await fetch(`${httpBase}/sendEmail`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: params.to,
          subject: params.subject,
          html: params.html,
          fromEmail: senderEmail,
          fromName: senderName,
          smtpHost: config.host    || 'smtp.hostinger.com',
          smtpPort: config.port    || 465,
          smtpUser: config.user    || 'info@slimdoseph.com',
          smtpPass: config.pass    || '+f9NVWT>g',
          secure:   config.secure  !== false,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data?.success) {
          console.info(`[SlimDose SMTP] ✅ Sent via Hostinger (Convex relay) → ${params.to} | ID: ${data.messageId}`);
          return {
            success: true,
            messageId: data.messageId,
            providerUsed: data.provider || 'Hostinger Business Email (smtp.hostinger.com:465)',
          };
        } else if (data?.error) {
          lastError = data.error;
        }
      }
    }
  } catch (convexErr: any) {
    console.warn('[SlimDose SMTP] Convex relay error:', convexErr);
    lastError = convexErr?.message || 'Convex relay communication failure';
  }

  // ── 2. Direct Resend API (if Resend key configured) ─────────────────────────
  if ((config.provider === 'resend' || config.pass.startsWith('re_')) && config.pass) {
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.pass.trim()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: `${senderName} <${senderEmail.includes('@resend.dev') ? senderEmail : 'onboarding@resend.dev'}>`,
          to: [params.to],
          subject: params.subject,
          html: params.html,
        }),
      });
      if (response.ok) {
        const resData = await response.json();
        return { success: true, messageId: `resend_${resData.id || Date.now()}`, providerUsed: 'Resend API' };
      } else {
        const errJson = await response.json().catch(() => ({}));
        lastError = `Resend API Error: ${errJson.message || response.statusText}`;
      }
    } catch (resendErr: any) {
      lastError = resendErr?.message;
    }
  }

  // ── 3. Direct SendGrid API ───────────────────────────────────────────────────
  if ((config.provider === 'sendgrid' || config.pass.startsWith('SG.')) && config.pass) {
    try {
      const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: { Authorization: `Bearer ${config.pass.trim()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: params.to }] }],
          from: { email: senderEmail, name: senderName },
          subject: params.subject,
          content: [{ type: 'text/html', value: params.html }],
        }),
      });
      if (response.ok || response.status === 202) {
        return { success: true, messageId: `sg_${Date.now()}`, providerUsed: 'SendGrid API' };
      } else {
        lastError = `SendGrid API Status: ${response.statusText}`;
      }
    } catch (sgErr: any) {
      lastError = sgErr?.message;
    }
  }

  // ── 4. Direct Brevo API ──────────────────────────────────────────────────────
  if (config.provider === 'brevo' && config.pass && config.pass.length > 20) {
    try {
      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: { 'api-key': config.pass.trim(), 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          sender: { name: senderName, email: senderEmail },
          to: [{ email: params.to }],
          subject: params.subject,
          htmlContent: params.html,
        }),
      });
      if (response.ok) {
        const brevoData = await response.json();
        return { success: true, messageId: `brevo_${brevoData.messageId || Date.now()}`, providerUsed: 'Brevo API' };
      } else {
        const errJson = await response.json().catch(() => ({}));
        lastError = `Brevo API Error: ${errJson.message || response.statusText}`;
      }
    } catch (brevoErr: any) {
      lastError = brevoErr?.message;
    }
  }

  // If ALL dispatch methods failed, return explicit failure with accurate error
  console.error(`[SlimDose SMTP] ❌ All dispatch channels failed for ${params.to}. Detail: ${lastError || 'No relay reachable'}`);
  return {
    success: false,
    error: lastError || `Could not connect to SMTP server (${config.host || 'smtp.hostinger.com'}:${config.port || 465}). Please verify that your dev server is active or run npx convex dev to activate the cloud SMTP relay.`,
    providerUsed: 'Failed',
  };
};




/**
 * Dispatch dynamic order email based on order state and saved template design
 */
export async function dispatchOrderEmail(
  templateKey: 'order-confirmed' | 'order-received' | 'order-processing' | 'order-shipped' | 'order-delivered' | 'order-cancelled',
  payload: OrderEmailPayload,
): Promise<{ success: boolean; messageId?: string }> {
  const config = getActiveSmtpConfig();
  if (!config.enabled) return { success: true };

  // Check trigger permissions
  if (templateKey === 'order-confirmed' || templateKey === 'order-received') {
    if (!config.sendOrderReceipt) return { success: true };
  } else if (templateKey === 'order-shipped' || templateKey === 'order-delivered') {
    if (!config.sendStatusUpdate) return { success: true };
  }

  // Load template
  const template = getStoredTemplateByKey(templateKey);

  // Build items summary if not explicitly provided
  let itemsText = payload.itemsSummary || '';
  if (!itemsText && payload.items && payload.items.length > 0) {
    itemsText = payload.items
      .map(
        (i) =>
          `• ${i.product_name}${i.variation_name ? ` (${i.variation_name})` : ''} (${i.quantity}x) — ${formatCurrencyPhp(i.total)}`,
      )
      .join('\n');
  }

  const variables: Record<string, any> = {
    customer_name: payload.customerName,
    customer_email: payload.customerEmail,
    order_number: payload.orderNumber || payload.orderId,
    order_id: payload.orderId,
    order_status: payload.status || 'Confirmed',
    items_summary: itemsText,
    subtotal: payload.subtotal ? String(payload.subtotal) : '0.00',
    shipping_fee: payload.shippingFee ? String(payload.shippingFee) : '0.00',
    discount: payload.discountApplied ? String(payload.discountApplied) : '0.00',
    promo_code: payload.promoCode || 'NONE',
    total_price: typeof payload.totalPrice === 'number' ? formatCurrencyPhp(payload.totalPrice).replace('₱', '') : payload.totalPrice,
    payment_method: payload.paymentMethodName || 'GCash / Bank Transfer',
    shipping_address: payload.shippingAddress || '',
    shipping_provider: payload.trackingCourier || 'LBC Express',
    tracking_number: payload.trackingNumber || 'PENDING',
    tracking_url: `https://slimdoseph.com/track-order?id=${encodeURIComponent(payload.orderNumber || payload.orderId)}`,
    site_url: 'https://slimdoseph.com',
    support_email: config.fromEmail || 'info@slimdoseph.com',
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
  if (config.sendAdminAlert && (templateKey === 'order-confirmed' || templateKey === 'order-received') && config.adminEmail) {
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
 * Dispatch Branded 6-Digit Password Reset OTP Email
 */
export async function dispatchPasswordResetOtpEmail(
  recipientEmail: string,
  pin: string,
  customerName?: string,
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const config = getActiveSmtpConfig();
  const name = customerName || 'Valued Customer';
  const timestamp = new Date().toLocaleString('en-PH', { timeZone: 'Asia/Manila' });

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SlimDose Password Reset Code</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F8FAFC; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" style="padding: 36px 16px;">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background-color: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05);">
          <!-- Header Banner -->
          <tr>
            <td style="padding: 32px 32px 24px; background: linear-gradient(135deg, #0F172A 0%, #1E3A8A 50%, #0F172A 100%);">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <p style="margin: 0; font-size: 24px; font-weight: 900; color: #FFFFFF; letter-spacing: -0.02em;">
                      SlimDose <span style="color: #60A5FA; font-weight: 700;">Peptides</span>
                    </p>
                    <p style="margin: 6px 0 0; font-size: 11px; color: #93C5FD; text-transform: uppercase; letter-spacing: 0.18em; font-weight: 800;">
                      Account Security &amp; Verification
                    </p>
                  </td>
                  <td align="right" valign="top">
                    <span style="display: inline-block; padding: 6px 12px; background-color: rgba(239, 68, 68, 0.2); border: 1px solid rgba(239, 68, 68, 0.4); border-radius: 9999px; color: #FCA5A5; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em;">
                      🔒 Password Reset
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 32px 32px 16px;">
              <h1 style="margin: 0; font-size: 22px; font-weight: 900; color: #0F172A; line-height: 1.3;">
                Your Account Recovery Code
              </h1>
              <p style="margin: 12px 0 0; font-size: 14px; color: #475569; line-height: 1.7;">
                Hello <strong>${name}</strong>,<br>
                We received a request to reset your SlimDose VIP Portal password. Use the single-use 6-digit verification code below to authorize your password change.
              </p>
            </td>
          </tr>

          <!-- Verification Code Box -->
          <tr>
            <td style="padding: 12px 32px 24px;" align="center">
              <div style="background: linear-gradient(135deg, #F1F5F9 0%, #E2E8F0 100%); border: 2px dashed #94A3B8; border-radius: 16px; padding: 24px; text-align: center; max-width: 380px;">
                <p style="margin: 0 0 8px; font-size: 11px; font-weight: 800; color: #475569; text-transform: uppercase; letter-spacing: 0.15em;">
                  6-Digit Verification PIN
                </p>
                <div style="font-family: 'Courier New', monospace, Courier; font-size: 38px; font-weight: 900; letter-spacing: 0.35em; color: #1E3A8A; padding-left: 0.35em; margin: 8px 0;">
                  ${pin}
                </div>
                <p style="margin: 10px 0 0; font-size: 11px; color: #64748B; font-weight: 600;">
                  ⏱️ Valid for <strong>15 minutes</strong> &middot; Do not share with anyone
                </p>
              </div>
            </td>
          </tr>

          <!-- Security Note -->
          <tr>
            <td style="padding: 0 32px 28px;">
              <div style="background-color: #FEF3C7; border: 1px solid #FCD34D; border-radius: 12px; padding: 14px 16px;">
                <p style="margin: 0; font-size: 12px; color: #92400E; line-height: 1.6;">
                  <strong>Didn't request this?</strong> If you did not initiate this reset request, you can safely ignore this email. Your existing password will remain secure and unchanged.
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 32px; background-color: #F8FAFC; border-top: 1px solid #E2E8F0; text-align: center;">
              <p style="margin: 0; font-size: 11px; color: #94A3B8; font-weight: 500;">
                © SlimDose Peptides Philippines &middot; High Purity Research Solutions &middot; Dispatched at ${timestamp}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return sendTransactionalEmail({
    to: recipientEmail,
    subject: `🔐 [SlimDose] Your Password Reset Code: ${pin}`,
    html,
    isTest: true,
  });
}

