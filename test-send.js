import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: 'smtp.hostinger.com',
  port: 465,
  secure: true,
  auth: {
    user: 'info@slimdoseph.com',
    pass: process.env.SMTP_PASS || '',
  },
  tls: {
    rejectUnauthorized: false,
  },
});

async function main() {
  try {
    const info = await transporter.sendMail({
      from: {
        name: 'SlimDose Peptides',
        address: 'info@slimdoseph.com',
      },
      to: 'cecconsulting22@gmail.com',
      subject: 'SlimDose VIP - Security Verification Code',
      text: 'Your verification code is 849201. This code expires in 15 minutes.',
      html: '<div style="font-family: sans-serif; padding: 20px;"><h2>SlimDose VIP</h2><p>Your OTP is: <b>849201</b></p></div>',
      headers: {
        'X-Priority': '1',
        'X-MSMail-Priority': 'High',
        'Importance': 'high',
      },
    });
    console.log('SENT RESULT:', info);
  } catch (e) {
    console.error('ERROR:', e);
  }
}

main();
