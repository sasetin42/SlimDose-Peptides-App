/**
 * Unified email helpers used by the admin marketing modules.
 * Wraps the existing transactional email service with template resolution,
 * suppression checks, and Firestore delivery logging.
 */

import { DEFAULT_EMAIL_TEMPLATES, type EmailTemplateData } from './emailDefaults';
import { renderEmailTemplate, renderEmailSubject } from './emailRenderer';
import { sendTransactionalEmail, getActiveSmtpConfig, type SmtpConfig } from '../services/emailService';
import { isSuppressed } from '../lib/marketing';
import { recordMarketingEmailLog } from '../lib/marketing';

export { DEFAULT_EMAIL_TEMPLATES, renderEmailTemplate, renderEmailSubject, sendTransactionalEmail, getActiveSmtpConfig };
export type { EmailTemplateData, SmtpConfig };

export const getStoredTemplateByKey = (key: string): EmailTemplateData => {
  try {
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem('slimdose_email_templates_v2');
      if (cached) {
        const list: EmailTemplateData[] = JSON.parse(cached);
        const match = list.find((t) => t.template_key === key && t.is_active !== false);
        if (match) return match;
      }
      // Legacy key
      const legacy = localStorage.getItem('slimdose_email_templates_v1');
      if (legacy) {
        const list: EmailTemplateData[] = JSON.parse(legacy);
        const match = list.find((t) => t.template_key === key);
        if (match) return match;
      }
    }
  } catch {}
  return DEFAULT_EMAIL_TEMPLATES.find((t) => t.template_key === key) || DEFAULT_EMAIL_TEMPLATES[0];
};

export interface DispatchTemplatedEmailParams {
  to: string;
  templateKey: string;
  variables: Record<string, string>;
  subjectOverride?: string;
  campaignId?: string;
  followUpId?: string;
  smtpConfig?: Partial<SmtpConfig>;
}

export interface DispatchTemplatedEmailResult {
  success: boolean;
  skipped?: 'suppressed' | 'duplicate';
  messageId?: string;
  error?: string;
}

/** Dispatch a templated email with suppression + dedupe + logging. */
export const dispatchTemplatedEmail = async (params: DispatchTemplatedEmailParams): Promise<DispatchTemplatedEmailResult> => {
  const to = params.to.toLowerCase().trim();

  if (isSuppressed(to)) {
    await recordMarketingEmailLog({
      recipient: to,
      subject: params.subjectOverride || params.templateKey,
      template_key: params.templateKey,
      campaign_id: params.campaignId || null,
      follow_up_id: params.followUpId || null,
      status: 'failed',
      error: 'recipient_suppressed',
      message_id: null,
      opened_at: null,
      clicked_at: null,
    });
    return { success: false, skipped: 'suppressed' };
  }

  const template = getStoredTemplateByKey(params.templateKey);
  const html = renderEmailTemplate(template.html_content, params.variables);
  const subject = params.subjectOverride || renderEmailSubject(template.subject, params.variables);

  const res = await sendTransactionalEmail({
    to,
    subject,
    html,
    fromEmail: template.sender_email || undefined,
    fromName: template.sender_name || undefined,
    smtpConfig: params.smtpConfig,
  });

  await recordMarketingEmailLog({
    recipient: to,
    subject,
    template_key: params.templateKey,
    campaign_id: params.campaignId || null,
    follow_up_id: params.followUpId || null,
    status: res.success ? 'sent' : 'failed',
    error: res.error || null,
    message_id: res.messageId || null,
    opened_at: null,
    clicked_at: null,
  });

  return {
    success: res.success,
    messageId: res.messageId,
    error: res.error,
  };
};
