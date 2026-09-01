import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import nodemailer from 'nodemailer';
import { IncomingMessage, ServerResponse } from 'http';

function smtpDevServerPlugin(): Plugin {
  // Shared persistent pooled transporter for sub-second delivery
  const transporter = nodemailer.createTransport({
    host: 'smtp.hostinger.com',
    port: 465,
    secure: true,
    pool: true,
    maxConnections: 5,
    maxMessages: 100,
    rateLimit: 14,
    auth: {
      user: process.env.SMTP_USER || 'info@slimdoseph.com',
      pass: process.env.SMTP_PASS || '',
    },
    tls: {
      rejectUnauthorized: false,
    },
  });

  const handler = async (req: IncomingMessage, res: ServerResponse) => {
    // Set CORS headers
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
      res.end(JSON.stringify({ status: 'active', service: 'Hostinger SMTP Relay', host: 'smtp.hostinger.com:465' }));
      return;
    }

    if (req.method !== 'POST') {
      res.statusCode = 405;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ success: false, error: 'Method Not Allowed' }));
      return;
    }

    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });

    req.on('end', async () => {
      try {
        const data = JSON.parse(body || '{}');
        const {
          to,
          subject,
          html,
          fromEmail = 'info@slimdoseph.com',
          fromName = 'SlimDose Peptides',
          smtpHost = 'smtp.hostinger.com',
          smtpPort = 465,
          smtpUser = 'info@slimdoseph.com',
          smtpPass = '',
          secure = true,
        } = data;

        const toRecipient = String(to || '').trim();
        const emailSubject = String(subject || 'SlimDose VIP Notification').trim();
        const emailHtml = String(html || '<p>SlimDose Notification</p>').trim();

        if (!toRecipient || !toRecipient.includes('@')) {
          res.statusCode = 400;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ success: false, error: 'Valid recipient email address (to) is required.' }));
          return;
        }

        // Use active pooled transporter or fallback
        const activeTransporter =
          smtpUser === 'info@slimdoseph.com' && smtpHost === 'smtp.hostinger.com'
            ? transporter
            : nodemailer.createTransport({
                host: smtpHost,
                port: Number(smtpPort) || 465,
                secure: secure === true || Number(smtpPort) === 465,
                auth: { user: smtpUser, pass: smtpPass },
                tls: { rejectUnauthorized: false },
              });

        const info = await activeTransporter.sendMail({
          from: `"${fromName}" <${fromEmail}>`,
          to: toRecipient,
          subject: emailSubject,
          html: emailHtml,
        });

        console.log(`[Vite SMTP Relay] ✅ Delivered to ${toRecipient}! MessageID: ${info.messageId}`);

        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(
          JSON.stringify({
            success: true,
            messageId: info.messageId,
            provider: `Hostinger SMTP (${smtpHost}:${smtpPort})`,
            response: info.response,
          })
        );
      } catch (error: any) {
        console.error('[Vite SMTP Relay Error]:', error);
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(
          JSON.stringify({
            success: false,
            error: error.message || 'SMTP delivery failed',
            code: error.code,
            command: error.command,
            response: error.response,
          })
        );
      }
    });
  };

  return {
    name: 'smtp-dev-server-plugin',
    configureServer(server) {
      server.middlewares.use('/api/send-email', handler);
    },
    configurePreviewServer(server) {
      server.middlewares.use('/api/send-email', handler);
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
