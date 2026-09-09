import http from 'http';
import nodemailer from 'nodemailer';

const PORT = 3055;

// Direct Hostinger SMTP Transporter
const transporter = nodemailer.createTransport({
  host: 'smtp.hostinger.com',
  port: 465,
  secure: true,
  auth: {
    user: process.env.SMTP_USER || 'noreply@slimdoseph.com',
    pass: process.env.SMTP_PASS || 'PWqa@7kQ',
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

  if (req.method === 'GET' && (req.url === '/' || req.url === '/api/send-email' || req.url === '/health' || req.url === '/api/smtp-test-connection')) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'active', server: 'SlimDose Live Hostinger SMTP Relay', port: PORT, hostinger: 'smtp.hostinger.com:465' }));
    return;
  }

  // SMTP Test Connection Endpoint
  if (req.method === 'POST' && (req.url === '/api/smtp-test-connection' || req.url === '/smtp-test-connection')) {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', async () => {
      try {
        const payload = JSON.parse(body || '{}');
        const host = (payload.smtpHost || 'smtp.hostinger.com').trim();
        const port = Number(payload.smtpPort) || 465;
        const user = payload.smtpUser || process.env.SMTP_USER || '';
        const pass = payload.smtpPass || process.env.SMTP_PASS || '';
        const isSecure = payload.secure === true || port === 465;

        if (!host) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: '❌ SMTP Host is required.' }));
          return;
        }

        const transportOpts = {
          host,
          port,
          secure: isSecure,
          tls: { rejectUnauthorized: false },
          connectionTimeout: 15000,
          greetingTimeout: 15000,
          socketTimeout: 20000,
        };

        if (payload.authRequired !== false && user) {
          transportOpts.auth = { user: user.trim(), pass };
        }

        const customTransporter = nodemailer.createTransport(transportOpts);

        await customTransporter.verify();

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            success: true,
            message: `Connected & authenticated successfully to ${host}:${port}`,
            server: host,
            port,
            verifiedAt: new Date().toISOString(),
          })
        );
      } catch (err) {
        console.error('[SMTP Verify Error]:', err);
        let friendlyMessage = err.message || 'Cannot connect to the SMTP server.';
        if (err.code === 'EAUTH') {
          friendlyMessage = '❌ SMTP authentication failed: Invalid SMTP Username or Password.';
        } else if (err.code === 'ECONNREFUSED') {
          friendlyMessage = '❌ Cannot connect to SMTP server: Port is blocked, unavailable, or incorrect host.';
        } else if (err.code === 'ESOCKET') {
          friendlyMessage = '❌ Encryption settings do not match the SMTP server (SSL/TLS vs STARTTLS).';
        } else if (err.code === 'ETIMEDOUT') {
          friendlyMessage = '❌ Connection timed out: SMTP server is unreachable or port is blocked by firewall.';
        } else if (err.code === 'ENOTFOUND') {
          friendlyMessage = '❌ SMTP Host is incorrect or unreachable (DNS lookup failed).';
        }

        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            success: false,
            error: friendlyMessage,
            code: err.code || 'SMTP_ERROR',
            response: err.response || err.message,
          })
        );
      }
    });
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
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: '❌ Invalid recipient email address format.' }));
          return;
        }

        if (!emailSubject) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: '❌ Email subject is required.' }));
          return;
        }

        if (!emailHtml) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: '❌ Email content (html) is required.' }));
          return;
        }

        const portNum = Number(smtpPort) || 465;
        const isSecure = secure === true || portNum === 465;

        console.log(`[SMTP Relay] Dispatching to ${toRecipient} (${emailSubject})...`);

        const transportOpts = {
          host: (smtpHost || 'smtp.hostinger.com').trim(),
          port: portNum,
          secure: isSecure,
          tls: { rejectUnauthorized: false },
          connectionTimeout: 15000,
          greetingTimeout: 15000,
          socketTimeout: 20000,
        };

        if (authRequired !== false && smtpUser) {
          transportOpts.auth = {
            user: smtpUser.trim(),
            pass: smtpPass || process.env.SMTP_PASS || '',
          };
        }

        const activeTransporter = nodemailer.createTransport(transportOpts);

        const mailOpts = {
          from: `"${fromName}" <${fromEmail}>`,
          to: toRecipient,
          subject: emailSubject,
          html: emailHtml,
        };
        if (replyTo && replyTo.trim()) {
          mailOpts.replyTo = replyTo.trim();
        }

        const info = await activeTransporter.sendMail(mailOpts);

        console.log(`[SMTP Relay] ✅ Accepted for delivery: ${toRecipient} -> ${info.messageId}`);

        res.writeHead(200, { 'Content-Type': 'application/json' });
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
      } catch (err) {
        console.error('[SMTP Relay Error]:', err);
        let friendlyMessage = err.message || 'Email could not be submitted to the SMTP server.';
        if (err.code === 'EAUTH') {
          friendlyMessage = '❌ SMTP authentication failed: Invalid SMTP Username or Password.';
        } else if (err.code === 'ECONNREFUSED') {
          friendlyMessage = '❌ Cannot connect to the SMTP server: Port is blocked, unavailable, or incorrect host.';
        } else if (err.code === 'EENVELOPE') {
          friendlyMessage = '❌ Sender email is not authorized by the SMTP server.';
        } else if (err.code === 'ESOCKET') {
          friendlyMessage = '❌ Encryption settings do not match the SMTP server (SSL/TLS vs STARTTLS).';
        } else if (err.code === 'ETIMEDOUT') {
          friendlyMessage = '❌ Connection timed out while submitting email to the SMTP server.';
        }

        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            success: false,
            error: friendlyMessage,
            code: err.code || 'SMTP_SEND_ERROR',
            command: err.command,
            response: err.response || err.message,
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
