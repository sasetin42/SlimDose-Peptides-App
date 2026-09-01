import http from 'http';
import nodemailer from 'nodemailer';

const PORT = 3055;

// Direct Hostinger SMTP Transporter
const transporter = nodemailer.createTransport({
  host: 'smtp.hostinger.com',
  port: 465,
  secure: true,
  auth: {
    user: process.env.SMTP_USER || 'info@slimdoseph.com',
    pass: process.env.SMTP_PASS || '',
  },
  tls: {
    rejectUnauthorized: false,
  },
});

const server = http.createServer(async (req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method === 'GET' && (req.url === '/' || req.url === '/api/send-email' || req.url === '/health')) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'active', server: 'SlimDose Live Hostinger SMTP Relay', port: PORT }));
    return;
  }

  if (req.method === 'POST' && (req.url === '/api/send-email' || req.url === '/send-email' || req.url === '/')) {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });

    req.on('end', async () => {
      try {
        const payload = JSON.parse(body || '{}');
        const {
          to,
          subject,
          html,
          fromEmail = 'info@slimdoseph.com',
          fromName = 'SlimDose Peptides',
        } = payload;

        if (!to || !subject || !html) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: 'Missing required fields (to, subject, html)' }));
          return;
        }

        console.log(`[SMTP Relay] Dispatching to ${to} (${subject})...`);

        const info = await transporter.sendMail({
          from: `"${fromName}" <${fromEmail}>`,
          to,
          subject,
          html,
        });

        console.log(`[SMTP Relay] ✅ Delivered to ${to}: ${info.messageId}`);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            success: true,
            messageId: info.messageId,
            provider: 'Hostinger Business Email (smtp.hostinger.com:465)',
            response: info.response,
          })
        );
      } catch (err) {
        console.error('[SMTP Relay Error]:', err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            success: false,
            error: err.message || 'SMTP delivery failed',
          })
        );
      }
    });
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Endpoint not found' }));
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 SlimDose Hostinger SMTP Relay Server is listening on http://0.0.0.0:${PORT}`);
});
