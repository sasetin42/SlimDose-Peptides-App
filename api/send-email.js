import nodemailer from 'nodemailer';

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method === 'GET') {
    return res.status(200).json({ status: 'active', server: 'SlimDose Hostinger SMTP Relay' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  try {
    const payload = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
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

    const portNum = Number(smtpPort) || 465;
    const isSecure = secure === true || portNum === 465;

    const transportOpts = {
      host: (smtpHost || 'smtp.hostinger.com').trim(),
      port: portNum,
      secure: isSecure,
      tls: {
        rejectUnauthorized: false,
      },
      connectionTimeout: 15000,
      greetingTimeout: 15000,
      socketTimeout: 20000,
    };

    if (authRequired !== false && smtpUser) {
      transportOpts.auth = {
        user: smtpUser.trim(),
        pass: smtpPass || '',
      };
    }

    const transporter = nodemailer.createTransport(transportOpts);

    const mailOptions = {
      from: `"${fromName}" <${fromEmail}>`,
      to: toRecipient,
      subject: emailSubject,
      html: emailHtml,
    };

    if (replyTo && replyTo.trim()) {
      mailOptions.replyTo = replyTo.trim();
    }

    const info = await transporter.sendMail(mailOptions);

    return res.status(200).json({
      success: true,
      messageId: info.messageId,
      provider: `${smtpHost}:${portNum}`,
      response: info.response || '250 OK: Message accepted for delivery',
      accepted: info.accepted,
      rejected: info.rejected,
    });
  } catch (error) {
    console.error('[API Send Email Error]:', error);
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
}
