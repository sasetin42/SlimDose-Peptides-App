import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import nodemailer from 'nodemailer';
import { IncomingMessage, ServerResponse } from 'http';

function smtpDevServerPlugin(): Plugin {
  return {
    name: 'smtp-dev-server-plugin',
    configureServer(server) {
      server.middlewares.use('/api/send-email', async (req: IncomingMessage, res: ServerResponse) => {
        // Set CORS headers
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
              smtpPass = '+f9NVWT>g',
              secure = true,
            } = data;

            if (!to || !subject || !html) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: false, error: 'Missing required parameters (to, subject, html)' }));
              return;
            }

            console.log(`[Vite SMTP Relay] Sending email to ${to} via ${smtpHost}:${smtpPort}...`);

            // Create real Nodemailer transport to Hostinger SMTP
            const transporter = nodemailer.createTransport({
              host: smtpHost,
              port: Number(smtpPort) || 465,
              secure: secure === true || Number(smtpPort) === 465,
              auth: {
                user: smtpUser,
                pass: smtpPass,
              },
              tls: {
                rejectUnauthorized: false,
              },
            });

            // Verify connection
            await transporter.verify();
            console.log(`[Vite SMTP Relay] Authenticated successfully with ${smtpHost}:${smtpPort} as ${smtpUser}`);

            // Send actual mail
            const info = await transporter.sendMail({
              from: `"${fromName}" <${fromEmail}>`,
              to,
              subject,
              html,
            });

            console.log(`[Vite SMTP Relay] Message delivered successfully! MessageID: ${info.messageId}`);

            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({
              success: true,
              messageId: info.messageId,
              provider: `Hostinger SMTP (${smtpHost}:${smtpPort})`,
              response: info.response,
            }));
          } catch (error: any) {
            console.error('[Vite SMTP Relay Error]:', error);
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({
              success: false,
              error: error.message || 'SMTP delivery failed',
              code: error.code,
              command: error.command,
              response: error.response,
            }));
          }
        });
      });
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
          'vendor-firebase': ['firebase/app', 'firebase/firestore', 'firebase/auth', 'firebase/storage'],
        },
      },
    },
  },
});
