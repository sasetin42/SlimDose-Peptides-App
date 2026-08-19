import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '../src/data');

const TARGET_URL = 'https://slimdoseph.com/admin';
const LOGIN_EMAIL = 'superadmin@slimdose.ph';
const LOGIN_PASS = 'SDPep2026*';

async function runScraper() {
  console.log('🚀 Starting SlimDosePH Live Scraper...');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1600,1000']
  });

  const capturedNetworkData = {
    orders: [],
    products: [],
    customers: [],
    categories: [],
    guide_topics: [],
    payment_methods: [],
    promo_codes: []
  };

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1600, height: 1000 });

    // Enable network response interception to capture any raw Firestore / API payloads
    page.on('response', async (response) => {
      const url = response.url();
      if (url.includes('firestore.googleapis.com') || url.includes('supabase.co') || url.includes('/api/')) {
        try {
          const json = await response.json();
          if (json) {
            // Log captured API endpoint
            console.log(`📡 Intercepted API data from: ${url.slice(0, 80)}`);
          }
        } catch (e) {
          // Response was not JSON
        }
      }
    });

    console.log(`🌐 Navigating to ${TARGET_URL}...`);
    await page.goto(TARGET_URL, { waitUntil: 'networkidle2', timeout: 60000 });

    // Check if login form or modal is present
    const emailInput = await page.$('input[type="email"]');
    if (emailInput) {
      console.log('🔑 Submitting admin login credentials...');
      await page.type('input[type="email"]', LOGIN_EMAIL);
      await page.type('input[type="password"]', LOGIN_PASS);
      
      const submitBtn = await page.$('button[type="submit"]');
      if (submitBtn) {
        await submitBtn.click();
      } else {
        const buttons = await page.$$('button');
        for (const btn of buttons) {
          const text = await page.evaluate(el => el.textContent, btn);
          if (text.includes('Access') || text.includes('Login') || text.includes('Dashboard')) {
            await btn.click();
            break;
          }
        }
      }

      await new Promise(r => setTimeout(r, 4000));
    }

    console.log('📊 Admin Dashboard loaded!');

    // Function to click button by visible text
    const clickButtonWithText = async (textMatch) => {
      return page.evaluate((text) => {
        const buttons = Array.from(document.querySelectorAll('button, a, div[role="button"]'));
        const match = buttons.find(b => b.textContent && b.textContent.includes(text));
        if (match) {
          match.click();
          return true;
        }
        return false;
      }, textMatch);
    };

    // 1. Scrape Sales Analytics
    console.log('📈 Accessing Sales Analytics...');
    const clickedAnalytics = await clickButtonWithText('Sales Analytics');
    if (clickedAnalytics) {
      await new Promise(r => setTimeout(r, 3000));
    }

    const analyticsOverview = await page.evaluate(() => {
      const getText = (str) => {
        const elements = Array.from(document.querySelectorAll('div, h1, h2, h3, p, span'));
        const found = elements.find(e => e.textContent && e.textContent.includes(str));
        return found ? found.parentElement?.innerText || found.innerText : '';
      };

      return {
        grossSales: getText('Gross Sales'),
        rawCost: getText('Raw Cost'),
        netProfit: getText('Net Profit'),
        profitMargin: getText('Profit Margin'),
        totalOrders: getText('Total Orders'),
        unitsSold: getText('Units Sold'),
        avgOrderValue: getText('Avg. Order Value')
      };
    });

    console.log('📊 Analytics Overview captured:', analyticsOverview.grossSales ? 'Success' : 'Partial');

    // 2. Scrape Orders Management & Customer Accounts
    console.log('📦 Accessing Orders Management...');
    const clickedOrders = await clickButtonWithText('Orders Management');
    if (clickedOrders) {
      await new Promise(r => setTimeout(r, 3000));
    }

    // Scroll down to load all order cards
    await page.evaluate(async () => {
      await new Promise((resolve) => {
        let totalHeight = 0;
        const distance = 300;
        const timer = setInterval(() => {
          const scrollHeight = document.body.scrollHeight;
          window.scrollBy(0, distance);
          totalHeight += distance;

          if (totalHeight >= scrollHeight || totalHeight > 10000) {
            clearInterval(timer);
            resolve();
          }
        }, 150);
      });
    });

    const parsedOrders = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('div')).filter(el => {
        return el.textContent && el.textContent.includes('Order #SLD-');
      });

      const ordersList = [];
      const seenOrderIds = new Set();

      cards.forEach(card => {
        const text = card.innerText;
        const match = text.match(/Order #(SLD-\d+)/);
        if (match && !seenOrderIds.has(match[1])) {
          seenOrderIds.add(match[1]);

          // Extract fields from order card
          const customerMatch = text.match(/Customer\s*\n([^\n]+)\n([^\n@]+@[^\n]+)/) || text.match(/Customer\s*([^\n]+)/);
          const totalMatch = text.match(/Total\s*₱([0-9,]+\.?[0-9]*)/);
          const dateMatch = text.match(/Date\s*([0-9/:\sAPM]+)/);
          const statusMatch = text.match(/(New|Confirmed|Processing|Shipped|Delivered|Cancelled|Pending)/i);
          const paymentMatch = text.match(/(Paid via GCash|Paid via BDO|Paid via CIMB|Paid via Cash on Delivery|GCash|BDO|CIMB|COD)/i);

          ordersList.push({
            id: match[1],
            order_number: match[1],
            customer_name: customerMatch ? customerMatch[1].trim() : 'Customer',
            customer_email: customerMatch && customerMatch[2] ? customerMatch[2].trim() : '',
            total_price: totalMatch ? parseFloat(totalMatch[1].replace(/,/g, '')) : 0,
            order_status: statusMatch ? statusMatch[1].toLowerCase() : 'confirmed',
            payment_method: paymentMatch ? paymentMatch[1] : 'GCash',
            created_at: dateMatch ? dateMatch[1].trim() : new Date().toISOString(),
            raw_text: text
          });
        }
      });

      return ordersList;
    });

    console.log(`✅ Extracted ${parsedOrders.length} order records.`);

    // 3. Scrape Peptalk / Articles & Guides
    console.log('📚 Accessing Peptalk & Guide Management...');
    await clickButtonWithText('Back to Dashboard').catch(() => {});
    await new Promise(r => setTimeout(r, 1000));
    await clickButtonWithText('Peptalk').catch(() => {});
    await new Promise(r => setTimeout(r, 2000));

    const scrapedArticles = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('div')).filter(el => {
        return el.textContent && (el.textContent.includes('Guide') || el.textContent.includes('Dosage') || el.textContent.includes('Protocol'));
      });
      return cards.map(c => c.innerText).slice(0, 30);
    });

    console.log(`✅ Extracted ${scrapedArticles.length} article/guide cards.`);

    // Save outputs
    const resultObj = {
      scraped_at: new Date().toISOString(),
      analytics: analyticsOverview,
      orders_count: parsedOrders.length,
      orders: parsedOrders,
      articles_count: scrapedArticles.length
    };

    fs.writeFileSync(path.join(DATA_DIR, 'live_scraped_master.json'), JSON.stringify(resultObj, null, 2));
    console.log('💾 Saved live_scraped_master.json successfully.');

  } catch (err) {
    console.error('❌ Error in live scraper execution:', err);
  } finally {
    await browser.close();
    console.log('🏁 Scraper session finished.');
  }
}

runScraper();
