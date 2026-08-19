import puppeteer from 'puppeteer';

async function getLiveCredentials() {
  console.log('🔍 Intercepting live Supabase credentials from slimdoseph.com...');
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  let liveSupabaseUrl = '';
  let liveSupabaseKey = '';

  page.on('request', request => {
    const url = request.url();
    if (url.includes('supabase.co')) {
      const urlObj = new URL(url);
      liveSupabaseUrl = `${urlObj.protocol}//${urlObj.host}`;
      const headers = request.headers();
      if (headers['apikey']) {
        liveSupabaseKey = headers['apikey'];
      } else if (headers['authorization']) {
        liveSupabaseKey = headers['authorization'].replace('Bearer ', '');
      }
    }
  });

  await page.goto('https://slimdoseph.com/admin', { waitUntil: 'networkidle2' });

  // Type login credentials to ensure all authenticated headers are captured
  const emailInput = await page.$('input[type="email"]');
  if (emailInput) {
    await page.type('input[type="email"]', 'superadmin@slimdose.ph');
    await page.type('input[type="password"]', 'SDPep2026*');
    const submitBtn = await page.$('button[type="submit"]');
    if (submitBtn) await submitBtn.click();
    await new Promise(r => setTimeout(r, 4000));
  }

  await browser.close();

  console.log('✅ Captured Live Credentials:');
  console.log('URL:', liveSupabaseUrl);
  console.log('KEY:', liveSupabaseKey);
}

getLiveCredentials();
