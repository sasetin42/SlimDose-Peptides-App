import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '../src/data');

const LIVE_SUPABASE_URL = 'https://qqsvwakoergetbhkafnm.supabase.co';
const LIVE_SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFxc3Z3YWtvZXJnZXRiaGthZm5tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc1OTY5MTAsImV4cCI6MjA5MzE3MjkxMH0.2V4bG7EPwV5cXEtqmNVpp-g81UXcyPBDsl3xkgnV_nw';

const supabase = createClient(LIVE_SUPABASE_URL, LIVE_SUPABASE_KEY);

const TABLES = [
  'products',
  'product_variations',
  'categories',
  'orders',
  'order_items',
  'customers',
  'subscribers',
  'guide_topics',
  'payment_methods',
  'promo_codes',
  'global_discounts',
  'coas',
  'faqs',
  'peptalk_videos',
  'site_settings',
  'banner_slides',
  'invoice_verifications'
];

async function fetchTable(table) {
  try {
    const { data, error } = await supabase.from(table).select('*');
    if (error) {
      console.warn(`⚠️ Warning fetching ${table}:`, error.message);
      return [];
    }
    console.log(`✅ Fetched ${data ? data.length : 0} rows from '${table}'`);
    return data || [];
  } catch (err) {
    console.error(`❌ Error fetching ${table}:`, err.message);
    return [];
  }
}

async function runLiveFetch() {
  console.log('🚀 Fetching ALL Live Data from slimdoseph.com Supabase backend...');
  
  const results = {};

  for (const table of TABLES) {
    results[table] = await fetchTable(table);
  }

  // 1. Process Products & attach variations
  const products = results.products.map(p => {
    const vars = results.product_variations.filter(v => v.product_id === p.id);
    return {
      ...p,
      variations: vars
    };
  });

  // 2. Process Orders & attach order items
  const orders = results.orders.map(o => {
    const items = results.order_items.filter(item => item.order_id === o.id);
    return {
      ...o,
      items: items.length > 0 ? items : (o.order_items || [])
    };
  });

  // 3. Process Customers from customers table + unique order buyers
  const customersMap = new Map();
  
  (results.customers || []).forEach(c => {
    if (c.email) customersMap.set(c.email.toLowerCase().trim(), c);
  });

  orders.forEach(o => {
    const email = o.customer_email ? o.customer_email.toLowerCase().trim() : '';
    if (email && !customersMap.has(email)) {
      customersMap.set(email, {
        id: `cust_${o.id}`,
        full_name: o.customer_name || 'Customer',
        email: o.customer_email,
        phone: o.customer_phone || '',
        shipping_address: o.shipping_address || '',
        created_at: o.created_at || new Date().toISOString()
      });
    }
  });

  const customersList = Array.from(customersMap.values());

  console.log('\n📊 Summary of Live Captured Data:');
  console.log(`- Products: ${products.length}`);
  console.log(`- Orders: ${orders.length}`);
  console.log(`- Customers: ${customersList.length}`);
  console.log(`- Categories: ${results.categories.length}`);
  console.log(`- Guide Topics (Articles): ${results.guide_topics.length}`);
  console.log(`- Payment Methods: ${results.payment_methods.length}`);
  console.log(`- Promo Codes: ${results.promo_codes.length}`);

  // Write TypeScript dataset files
  console.log('\n💾 Updating local dataset TS files in src/data/...');

  // liveScrapedProducts.ts
  const productsTs = `// Live Scraped Products from slimdoseph.com (${new Date().toISOString()})
export const liveScrapedProducts = ${JSON.stringify(products, null, 2)};
`;
  fs.writeFileSync(path.join(DATA_DIR, 'liveScrapedProducts.ts'), productsTs);

  // liveScrapedOrders.ts
  const ordersTs = `// Live Scraped Orders from slimdoseph.com (${new Date().toISOString()})
export const liveScrapedOrders = ${JSON.stringify(orders, null, 2)};
`;
  fs.writeFileSync(path.join(DATA_DIR, 'liveScrapedOrders.ts'), ordersTs);

  // liveScrapedCustomers.ts
  const customersTs = `// Live Scraped Customers from slimdoseph.com (${new Date().toISOString()})
export const liveScrapedCustomers = ${JSON.stringify(customersList, null, 2)};
`;
  fs.writeFileSync(path.join(DATA_DIR, 'liveScrapedCustomers.ts'), customersTs);

  // liveScrapedGuideTopics.ts
  const guidesTs = `// Live Scraped Articles & Guide Topics from slimdoseph.com (${new Date().toISOString()})
export const liveScrapedGuideTopics = ${JSON.stringify(results.guide_topics, null, 2)};
`;
  fs.writeFileSync(path.join(DATA_DIR, 'liveScrapedGuideTopics.ts'), guidesTs);

  // liveScrapedCategories.ts
  const categoriesTs = `// Live Scraped Categories from slimdoseph.com (${new Date().toISOString()})
export const liveScrapedCategories = ${JSON.stringify(results.categories, null, 2)};
`;
  fs.writeFileSync(path.join(DATA_DIR, 'liveScrapedCategories.ts'), categoriesTs);

  // liveScrapedPaymentMethods.ts
  const paymentsTs = `// Live Scraped Payment Methods from slimdoseph.com (${new Date().toISOString()})
export const liveScrapedPaymentMethods = ${JSON.stringify(results.payment_methods, null, 2)};
`;
  fs.writeFileSync(path.join(DATA_DIR, 'liveScrapedPaymentMethods.ts'), paymentsTs);

  // liveScrapedPromoCodes.ts
  const promosTs = `// Live Scraped Promo Codes from slimdoseph.com (${new Date().toISOString()})
export const liveScrapedPromoCodes = ${JSON.stringify(results.promo_codes, null, 2)};
`;
  fs.writeFileSync(path.join(DATA_DIR, 'liveScrapedPromoCodes.ts'), promosTs);

  console.log('✨ ALL Live Data successfully fetched and saved to src/data/*.ts!');
}

runLiveFetch();
