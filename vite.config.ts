import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import nodemailer from 'nodemailer';
import { IncomingMessage, ServerResponse } from 'http';

function smtpDevServerPlugin(): Plugin {
  // Helper to build nodemailer transporter from config
  const createConfiguredTransporter = (options: {
    host?: string;
    port?: number | string;
    secure?: boolean;
    authRequired?: boolean;
    user?: string;
    pass?: string;
  }) => {
    const host = (options.host || 'smtp.hostinger.com').trim();
    const port = Number(options.port) || 465;
    const isExplicitSecure = options.secure === true || port === 465;
    const authRequired = options.authRequired !== false;

    const transportOpts: any = {
      host,
      port,
      secure: isExplicitSecure, // true for 465 (SSL/TLS), false for 587 (STARTTLS) or 25
      tls: {
        rejectUnauthorized: false,
      },
      connectionTimeout: 15000,
      greetingTimeout: 15000,
      socketTimeout: 20000,
    };

    if (authRequired && options.user) {
      transportOpts.auth = {
        user: options.user.trim(),
        pass: options.pass || '',
      };
    }

    return nodemailer.createTransport(transportOpts);
  };

  const handleTestConnection = async (req: IncomingMessage, res: ServerResponse) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      res.statusCode = 204;
      res.end();
      return;
    }

    if (req.method !== 'POST') {
      res.statusCode = 405;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ success: false, error: 'Method Not Allowed' }));
      return;
    }

    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', async () => {
      try {
        const data = JSON.parse(body || '{}');
        const {
          smtpHost = 'smtp.hostinger.com',
          smtpPort = 465,
          secure = true,
          authRequired = true,
          smtpUser = '',
          smtpPass = '',
        } = data;

        if (!smtpHost || !smtpHost.trim()) {
          res.statusCode = 400;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ success: false, error: '❌ SMTP Host is required.' }));
          return;
        }

        const portNum = Number(smtpPort) || 465;
        const isSecure = secure === true || portNum === 465;

        const transporter = createConfiguredTransporter({
          host: smtpHost,
          port: portNum,
          secure: isSecure,
          authRequired: authRequired !== false,
          user: smtpUser,
          pass: smtpPass,
        });

        // Genuine verification against the mail server socket & credentials
        await transporter.verify();

        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(
          JSON.stringify({
            success: true,
            message: `Connected & authenticated successfully to ${smtpHost}:${portNum}`,
            server: smtpHost,
            port: portNum,
            verifiedAt: new Date().toISOString(),
          })
        );
      } catch (error: any) {
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

        res.statusCode = 400;
        res.setHeader('Content-Type', 'application/json');
        res.end(
          JSON.stringify({
            success: false,
            error: friendlyMessage,
            code: error.code || 'SMTP_CONNECTION_ERROR',
            response: error.response || error.message,
          })
        );
      }
    });
  };

  const handleSendEmail = async (req: IncomingMessage, res: ServerResponse) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      res.statusCode = 204;
      res.end();
      return;
    }

    if (req.method === 'GET') {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ status: 'active', service: 'SlimDose SMTP Relay', version: '2.0.0' }));
      return;
    }

    if (req.method !== 'POST') {
      res.statusCode = 405;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ success: false, error: 'Method Not Allowed' }));
      return;
    }

    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', async () => {
      try {
        const data = JSON.parse(body || '{}');
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
          smtpPass = 'PWqa@7kQ',
          secure = true,
          authRequired = true,
        } = data;

        const toRecipient = String(to || '').trim();
        const emailSubject = String(subject || 'SlimDose Notification').trim();
        const emailHtml = String(html || '<p>SlimDose Notification</p>').trim();

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!toRecipient || !emailRegex.test(toRecipient)) {
          res.statusCode = 400;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ success: false, error: '❌ Invalid recipient email address format.' }));
          return;
        }

        const portNum = Number(smtpPort) || 465;
        const isSecure = secure === true || portNum === 465;

        const transporter = createConfiguredTransporter({
          host: smtpHost,
          port: portNum,
          secure: isSecure,
          authRequired: authRequired !== false,
          user: smtpUser,
          pass: smtpPass,
        });

        const mailOptions: any = {
          from: `"${fromName}" <${fromEmail}>`,
          to: toRecipient,
          subject: emailSubject,
          html: emailHtml,
        };

        if (replyTo && replyTo.trim()) {
          mailOptions.replyTo = replyTo.trim();
        }

        const info = await transporter.sendMail(mailOptions);

        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(
          JSON.stringify({
            success: true,
            messageId: info.messageId,
            provider: `${smtpHost}:${portNum}`,
            response: info.response || '250 OK: Message accepted for delivery',
            accepted: info.accepted,
            rejected: info.rejected,
          })
        );
      } catch (error: any) {
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

        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(
          JSON.stringify({
            success: false,
            error: friendlyMessage,
            code: error.code || 'SMTP_SEND_ERROR',
            command: error.command,
            response: error.response || error.message,
          })
        );
      }
    });
  };

  return {
    name: 'smtp-dev-server-plugin',
    configureServer(server) {
      server.middlewares.use('/api/smtp-test-connection', handleTestConnection);
      server.middlewares.use('/api/send-email', handleSendEmail);
    },
    configurePreviewServer(server) {
      server.middlewares.use('/api/smtp-test-connection', handleTestConnection);
      server.middlewares.use('/api/send-email', handleSendEmail);
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), smtpDevServerPlugin()],
  build: {
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-motion': ['framer-motion'],
          'vendor-firebase': ['firebase/app', 'firebase/firestore', 'firebase/auth'],
        },
      },
    },
  },
});
