import nodemailer from 'nodemailer';

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  try {
    const payload = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
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

    const portNum = Number(smtpPort) || 465;
    const isSecure = secure === true || portNum === 465;

    const transportOpts = {
      host: smtpHost.trim(),
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

    await transporter.verify();

    return res.status(200).json({
      success: true,
      message: `Connected & authenticated successfully to ${smtpHost}:${portNum}`,
      server: smtpHost,
      port: portNum,
      verifiedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[API SMTP Test Error]:', error);
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
}
