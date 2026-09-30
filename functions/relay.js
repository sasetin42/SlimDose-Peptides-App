import { onRequest } from 'firebase-functions/v2/https';
import nodemailer from 'nodemailer';
import corsPkg from 'cors';

const corsHandler = corsPkg({ origin: true });

/**
 * Helper to build configured nodemailer transporter
 */
function createTransporter(options) {
  const host = (options.smtpHost || 'smtp.hostinger.com').trim();
  const port = Number(options.smtpPort) || 465;
  const isSecure = options.secure === true || port === 465;
  const authRequired = options.authRequired !== false;

  const transportOpts = {
    host,
    port,
    secure: isSecure,
    tls: {
      rejectUnauthorized: false,
    },
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 20000,
  };

  if (authRequired && options.smtpUser) {
    transportOpts.auth = {
      user: options.smtpUser.trim(),
      pass: options.smtpPass || '',
    };
  }

  return {
    transporter: nodemailer.createTransport(transportOpts),
    host,
    port,
    isSecure,
  };
}

/**
 * Cloud Function: Real SMTP Connection Verification
 * URL: /api/smtp-test-connection
 */
export const apiSmtpTestConnection = onRequest(
  {
    cors: true,
    timeoutSeconds: 30,
    memory: '256MiB',
  },
  async (req, res) => {
    return corsHandler(req, res, async () => {
      if (req.method === 'OPTIONS') {
        return res.status(204).end();
      }

      if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Method Not Allowed' });
      }

      try {
        const payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
        const {
          smtpHost = 'smtp.hostinger.com',
          smtpPort = 465,
          smtpUser = 'noreply@slimdoseph.com',
          smtpPass = '',
          secure = true,
          authRequired = true,
        } = payload;

        if (!smtpHost || !smtpHost.trim()) {
          return res.status(400).json({ success: false, error: '❌ SMTP Host is required.' });
        }

        const { transporter, host, port } = createTransporter({
          smtpHost,
          smtpPort,
          smtpUser,
          smtpPass,
          secure,
          authRequired,
        });

        // Real socket verification with the remote mail server
        await transporter.verify();

        return res.status(200).json({
          success: true,
          message: `Connected & authenticated successfully to ${host}:${port}`,
          server: host,
          port,
          verifiedAt: new Date().toISOString(),
        });
      } catch (error) {
        console.error('[Firebase Function SMTP Test Error]:', error);
        let friendlyMessage = error.message || 'Cannot connect to the SMTP server.';
        if (error.code === 'EAUTH') {
          friendlyMessage = '❌ SMTP authentication failed: Invalid SMTP Username or Password.';
        } else if (error.code === 'ECONNREFUSED') {
          friendlyMessage = '❌ Cannot connect to SMTP server: Port is blocked, unavailable, or incorrect host.';
        } else if (error.code === 'ESOCKET') {
          friendlyMessage = '❌ Encryption settings do not match the SMTP server (SSL/TLS vs STARTTLS).';
        } else if (error.code === 'ETIMEDOUT') {
          friendlyMessage = '❌ Connection timed out: SMTP server is unreachable or port is blocked by firewall.';
        } else if (error.code === 'ENOTFOUND') {
          friendlyMessage = '❌ SMTP Host is incorrect or unreachable (DNS lookup failed).';
        }

        return res.status(400).json({
          success: false,
          error: friendlyMessage,
          code: error.code || 'SMTP_HANDSHAKE_ERROR',
          response: error.response || error.message,
        });
      }
    });
  }
);

/**
 * Cloud Function: Real Transactional Email Dispatcher
 * URL: /api/send-email
 */
export const apiSendEmail = onRequest(
  {
    cors: true,
    timeoutSeconds: 30,
    memory: '256MiB',
  },
  async (req, res) => {
    return corsHandler(req, res, async () => {
      if (req.method === 'OPTIONS') {
        return res.status(204).end();
      }

      if (req.method === 'GET') {
        return res.status(200).json({ status: 'active', server: 'SlimDose Firebase SMTP Relay' });
      }

      if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Method Not Allowed' });
      }

      try {
        const payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
        const {
          to,
          subject,
          html,
          fromEmail = 'noreply@slimdoseph.com',
          fromName = 'SlimDose Peptides',
          replyTo,
          smtpHost = 'smtp.hostinger.com',
          smtpPort = 465,
          smtpUser = 'noreply@slimdoseph.com',
          smtpPass = '',
          secure = true,
          authRequired = true,
        } = payload;

        const toRecipient = String(to || '').trim();
        const emailSubject = String(subject || '').trim();
        const emailHtml = String(html || '').trim();

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!toRecipient || !emailRegex.test(toRecipient)) {
          return res.status(400).json({ success: false, error: '❌ Invalid recipient email address format.' });
        }

        if (!emailSubject) {
          return res.status(400).json({ success: false, error: '❌ Email subject is required.' });
        }

        if (!emailHtml) {
          return res.status(400).json({ success: false, error: '❌ Email content (html) is required.' });
        }

        const { transporter, host, port } = createTransporter({
          smtpHost,
          smtpPort,
          smtpUser,
          smtpPass,
          secure,
          authRequired,
        });

        const mailOptions = {
          from: `"${fromName}" <${fromEmail}>`,
          to: toRecipient,
          subject: emailSubject,
          html: emailHtml,
        };

        if (replyTo && replyTo.trim()) {
          mailOptions.replyTo = replyTo.trim();
        }

        // Real delivery through the mail server
        const info = await transporter.sendMail(mailOptions);

        return res.status(200).json({
          success: true,
          messageId: info.messageId,
          provider: `${host}:${port}`,
          response: info.response || '250 OK: Message accepted for delivery',
          accepted: info.accepted,
          rejected: info.rejected,
        });
      } catch (error) {
        console.error('[Firebase Function Send Email Error]:', error);
        let friendlyMessage = error.message || 'Email could not be submitted to the SMTP server.';
        if (error.code === 'EAUTH') {
          friendlyMessage = '❌ SMTP authentication failed: Invalid SMTP Username or Password.';
        } else if (error.code === 'ECONNREFUSED') {
          friendlyMessage = '❌ Cannot connect to the SMTP server: Port is blocked, unavailable, or incorrect host.';
        } else if (error.code === 'EENVELOPE') {
          friendlyMessage = '❌ Sender email is not authorized by the SMTP server.';
        } else if (error.code === 'ESOCKET') {
          friendlyMessage = '❌ Encryption settings do not match the SMTP server (SSL/TLS vs STARTTLS).';
        } else if (error.code === 'ETIMEDOUT') {
          friendlyMessage = '❌ Connection timed out while submitting email to the SMTP server.';
        }

        return res.status(500).json({
          success: false,
          error: friendlyMessage,
          code: error.code || 'SMTP_SEND_ERROR',
          command: error.command,
          response: error.response || error.message,
        });
      }
    });
  }
);

// Re-export the scheduled email automation function so it deploys with the
// default codebase (package.json main entrypoint is index.js).
export { processEmailAutomations } from './scheduledEmails.js';
