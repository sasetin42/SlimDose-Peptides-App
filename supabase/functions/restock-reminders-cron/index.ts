import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

    const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Calculate the cut-off date: 30 days ago
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const cutOffString = thirtyDaysAgo.toISOString();

    console.log(`🔍 Scanning for orders placed before: ${cutOffString}`);

    // 1. Fetch confirmed orders older than 30 days
    const { data: eligibleOrders, error: orderErr } = await sb
      .from('orders')
      .select('id, order_number, customer_name, customer_email, created_at')
      .in('order_status', ['confirmed', 'processing', 'shipped', 'delivered'])
      .lt('created_at', cutOffString);

    if (orderErr) throw orderErr;

    if (!eligibleOrders || eligibleOrders.length === 0) {
      console.log('✅ No eligible orders found for restock reminder.');
      return new Response(JSON.stringify({ success: true, sent: 0, message: 'No orders met criteria.' }), {
        status: 200,
        headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    // 2. Fetch already reminded order IDs to prevent duplicate emails
    const { data: sentReminders, error: remindErr } = await sb
      .from('restock_reminders')
      .select('order_id');

    if (remindErr) throw remindErr;

    const alreadyRemindedIds = new Set(sentReminders?.map(r => r.order_id) || []);
    const ordersToRemind = eligibleOrders.filter(order => !alreadyRemindedIds.has(order.id));

    if (ordersToRemind.length === 0) {
      console.log('✅ All eligible orders already received reminders.');
      return new Response(JSON.stringify({ success: true, sent: 0, message: 'All orders already reminded.' }), {
        status: 200,
        headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    console.log(`📬 Found ${ordersToRemind.length} orders requiring restock email reminder.`);

    const results = [];
    for (const order of ordersToRemind) {
      console.log(`✉️ Sending restock reminder to ${order.customer_email} for order #${order.order_number}`);

      // Log the reminder in the database
      const { error: logError } = await sb
        .from('restock_reminders')
        .insert([{
          order_id: order.id,
          customer_email: order.customer_email,
          reminded_at: new Date().toISOString()
        }]);

      if (logError) {
        console.error(`Failed to log reminder for order ${order.id}:`, logError);
        results.push({ order_id: order.id, success: false, error: logError.message });
      } else {
        results.push({ order_id: order.id, success: true });
      }
    }

    const successCount = results.filter(r => r.success).length;

    return new Response(JSON.stringify({ success: true, sent: successCount, details: results }), {
      status: 200,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('Cron error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }
});
