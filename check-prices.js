// Quick script to check product prices in Supabase
// Run with: node check-prices.js

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://gtnlhawdrmsfaqlitcci.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd0bmxoYXdkcm1zZmFxbGl0Y2NpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwMDM2NTAsImV4cCI6MjA5NjU3OTY1MH0.iu4J_7qMW4ibDY3YXE3jH8owUO2e5ZwtWsnL0gzsMDA';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkPrices() {
    console.log('🔍 Checking Tirzepatide prices in database...\n');

    try {
        const { data: products, error } = await supabase
            .from('products')
            .select('*')
            .ilike('name', '%tirzepatide%');

        if (error) throw error;

        if (products.length === 0) {
            console.log('❌ No Tirzepatide products found!');
            return;
        }

        console.log(`✅ Found ${products.length} Tirzepatide product(s):\n`);

        products.forEach(product => {
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log(`📦 Product: ${product.name}`);
            console.log(`💰 Base Price: ₱${product.base_price?.toLocaleString('en-PH')}`);
            if (product.discount_active && product.discount_price) {
                console.log(`🏷️  Discount Price: ₱${product.discount_price.toLocaleString('en-PH')} (ACTIVE)`);
            }
            console.log(`📊 Stock: ${product.stock_quantity}`);
            console.log(`✅ Available: ${product.available ? 'Yes' : 'No'}`);
            console.log(`⭐ Featured: ${product.featured ? 'Yes' : 'No'}`);
            console.log(`🔬 Purity: ${product.purity_percentage}%`);
            console.log(`🆔 ID: ${product.id}`);
            console.log('');
        });

        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        console.log('💡 If these prices don\'t match what you see on the website,');
        console.log('   try refreshing the browser or checking the console for errors.');

    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

checkPrices();


