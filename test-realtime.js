// Quick Real-time Test Script
// Run this in your browser console to see if real-time is working

console.log('%c🧪 PEPTIVATE REAL-TIME TEST', 'background: #667eea; color: white; padding: 10px; font-size: 16px; font-weight: bold;');
console.log('');
console.log('%c📋 Pre-Test Checklist:', 'color: #667eea; font-size: 14px; font-weight: bold;');
console.log('1. ✅ Dev server running? (http://localhost:5173)');
console.log('2. ✅ Real-time enabled in Supabase Dashboard → Database → Replication?');
console.log('3. ✅ Tables enabled: products & product_variations?');
console.log('');

// Test 1: Check if Supabase is loaded
console.log('%c🔍 Test 1: Checking Supabase Connection...', 'color: #667eea; font-weight: bold;');
try {
    if (typeof supabase !== 'undefined') {
        console.log('✅ Supabase client is loaded');
    } else {
        console.error('❌ Supabase client NOT found. Make sure you\'re on the peptivate website.');
    }
} catch (e) {
    console.error('❌ Error checking Supabase:', e.message);
}

// Test 2: Fetch current products
console.log('');
console.log('%c🔍 Test 2: Fetching Products from Database...', 'color: #667eea; font-weight: bold;');

async function testFetch() {
    try {
        // Get Supabase from window if available
        const client = window.supabase || (await import('./src/lib/supabase.ts')).supabase;
        
        const { data: products, error } = await client
            .from('products')
            .select('id, name, base_price')
            .limit(5);
        
        if (error) throw error;
        
        console.log(`✅ Found ${products.length} products:`);
        products.forEach((p, i) => {
            console.log(`   ${i + 1}. ${p.name}: ₱${p.base_price.toLocaleString()}`);
        });
        
        // Test variation fetch
        if (products.length > 0) {
            console.log('');
            console.log('%c🔍 Test 3: Fetching Variations...', 'color: #667eea; font-weight: bold;');
            
            const { data: variations } = await client
                .from('product_variations')
                .select('*')
                .eq('product_id', products[0].id);
            
            if (variations && variations.length > 0) {
                console.log(`✅ Found ${variations.length} variations for "${products[0].name}":`);
                variations.forEach((v, i) => {
                    console.log(`   ${i + 1}. ${v.name}: ₱${v.price.toLocaleString()}`);
                });
            } else {
                console.log('ℹ️  No variations found for this product');
            }
        }
        
        console.log('');
        console.log('%c✅ Database Connection Working!', 'color: #28a745; font-weight: bold; font-size: 14px;');
        
    } catch (err) {
        console.error('❌ Error:', err.message);
        console.error('Full error:', err);
    }
}

// Test 3: Setup real-time listener
console.log('');
console.log('%c🔍 Test 4: Setting Up Real-time Listener...', 'color: #667eea; font-weight: bold;');
console.log('This will listen for changes to products and variations.');
console.log('');
console.log('%c📝 ACTION REQUIRED:', 'color: #ff6b6b; font-weight: bold;');
console.log('1. Keep this console open');
console.log('2. Go to your Admin Dashboard');
console.log('3. Edit a product price or variation');
console.log('4. Watch this console for "✅ REALTIME EVENT" messages');
console.log('');

async function testRealtime() {
    try {
        const client = window.supabase || (await import('./src/lib/supabase.ts')).supabase;
        
        let productEvents = 0;
        let variationEvents = 0;
        
        const channel = client
            .channel(`test-${Date.now()}`)
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'products' },
                (payload) => {
                    productEvents++;
                    console.log('%c✅ REALTIME EVENT - PRODUCTS TABLE', 'background: #28a745; color: white; padding: 5px; font-weight: bold;');
                    console.log('Event:', payload.eventType);
                    console.log('Data:', payload.new || payload.old);
                    console.log(`Total product events: ${productEvents}`);
                }
            )
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'product_variations' },
                (payload) => {
                    variationEvents++;
                    console.log('%c✅ REALTIME EVENT - VARIATIONS TABLE', 'background: #28a745; color: white; padding: 5px; font-weight: bold;');
                    console.log('Event:', payload.eventType);
                    console.log('Data:', payload.new || payload.old);
                    console.log(`Total variation events: ${variationEvents}`);
                }
            )
            .subscribe((status) => {
                console.log('');
                console.log(`%c📡 Subscription Status: ${status}`, 'font-weight: bold; font-size: 14px;');
                
                if (status === 'SUBSCRIBED') {
                    console.log('%c✅ REAL-TIME IS WORKING!', 'background: #28a745; color: white; padding: 10px; font-weight: bold; font-size: 14px;');
                    console.log('');
                    console.log('🎉 Success! Now go edit a price in the admin dashboard.');
                    console.log('You should see "✅ REALTIME EVENT" messages appear here.');
                } else if (status === 'CHANNEL_ERROR') {
                    console.log('%c❌ REAL-TIME NOT ENABLED', 'background: #dc3545; color: white; padding: 10px; font-weight: bold; font-size: 14px;');
                    console.log('');
                    console.log('⚠️  You need to enable Real-time in Supabase Dashboard:');
                    console.log('');
                    console.log('1. Go to: https://supabase.com/dashboard');
                    console.log('2. Select your project');
                    console.log('3. Click: Database → Replication');
                    console.log('4. Enable: ✅ products');
                    console.log('5. Enable: ✅ product_variations');
                    console.log('6. Wait 30-60 seconds');
                    console.log('7. Refresh this page and run test again');
                }
            });
        
        window.testChannel = channel;
        console.log('');
        console.log('ℹ️  Listener is now active. Waiting for events...');
        console.log('');
        
    } catch (err) {
        console.error('❌ Error setting up real-time:', err);
    }
}

// Run tests
(async () => {
    await testFetch();
    
    setTimeout(async () => {
        await testRealtime();
    }, 1000);
})();

console.log('');
console.log('%c📊 Test Results Summary:', 'color: #667eea; font-size: 14px; font-weight: bold; text-decoration: underline;');
console.log('Check the messages above. You should see:');
console.log('  ✅ Supabase client loaded');
console.log('  ✅ Products fetched successfully');
console.log('  ✅ Variations fetched successfully');
console.log('  ✅ Real-time subscription: SUBSCRIBED');
console.log('');
console.log('%c💡 TIP:', 'color: #ffc107; font-weight: bold;');
console.log('If you see "CHANNEL_ERROR", you MUST enable Real-time in Supabase Dashboard!');
console.log('');

