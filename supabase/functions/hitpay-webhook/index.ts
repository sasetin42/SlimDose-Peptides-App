import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

    // HitPay webhooks can be x-www-form-urlencoded or json
    let body: any = {};
    const contentType = req.headers.get('content-type') || '';
    if (contentType.includes('application/x-www-form-urlencoded')) {
      const text = await req.text();
      const params = new URLSearchParams(text);
      body = Object.fromEntries(params.entries());
    } else {
      body = await req.json().catch(() => ({}));
    }

    console.log('📬 HitPay Webhook Received:', body);

    const paymentRequestId = body.payment_request_id;
    const status = body.status; // 'completed', 'failed', etc.

    if (!paymentRequestId) {
      return new Response(JSON.stringify({ error: 'payment_request_id missing' }), { status: 400, headers: CORS });
    }

    const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Find the corresponding order
    const { data: order, error: orderErr } = await sb
      .from('orders')
      .select('*')
      .eq('hitpay_payment_request_id', paymentRequestId)
      .maybeSingle();

    if (orderErr) {
      console.error('Error finding order for webhook:', orderErr);
      return new Response(JSON.stringify({ error: 'DB search failed' }), { status: 500, headers: CORS });
    }

    if (!order) {
      console.warn('⚠️ Order not found for HitPay request ID:', paymentRequestId);
      return new Response(JSON.stringify({ message: 'Order not found' }), { status: 200, headers: CORS });
    }

    if (status === 'completed') {
      console.log(`✅ Payment completed for order #${order.order_number || order.id}. Confirming order...`);

      // Update order status
      const { error: updateError } = await sb
        .from('orders')
        .update({
          payment_status: 'paid',
          order_status: 'confirmed',
          payment_method_name: 'HitPay',
          updated_at: new Date().toISOString()
        })
        .eq('id', order.id);

      if (updateError) {
        console.error('Failed to update order payment status:', updateError);
        return new Response(JSON.stringify({ error: 'Update failed' }), { status: 500, headers: CORS });
      }

      // Trigger Telegram notification Edge Function
      await fetch(`${SUPABASE_URL}/functions/v1/telegram-notify-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: order.id }),
      }).catch((err) => console.error('Telegram notification error:', err));
    }

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: CORS });
  } catch (err: any) {
    console.error('Webhook error:', err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: CORS });
  }
});
