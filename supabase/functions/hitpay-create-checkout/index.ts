import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function ok(body: unknown) {
  return new Response(JSON.stringify({ ok: true, ...(body as object) }), {
    status: 200,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

function fail(error: string, extra: Record<string, unknown> = {}) {
  return new Response(JSON.stringify({ ok: false, error, ...extra }), {
    status: 200,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  try {
    const HITPAY_API_KEY = Deno.env.get('HITPAY_API_KEY') || '';
    const HITPAY_ENV = Deno.env.get('HITPAY_ENV') || 'sandbox'; // 'sandbox' or 'production'
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

    const { order_id, success_url, cancel_url } = await req.json();
    if (!order_id) {
      return fail('order_id required');
    }

    const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: order, error: orderErr } = await sb
      .from('orders')
      .select('*')
      .eq('id', order_id)
      .single();

    if (orderErr || !order) {
      return fail('Order not found', { detail: orderErr?.message });
    }

    const finalTotal = Number(order.total_price || 0) + Number(order.shipping_fee || 0);
    const orderRef = order.order_number || `ORD-${String(order.id).slice(0, 8).toUpperCase()}`;

    const apiDomain = HITPAY_ENV === 'production' 
      ? 'https://api.hitpayapp.com' 
      : 'https://api-sandbox.hitpayapp.com';

    const webhookUrl = `${SUPABASE_URL}/functions/v1/hitpay-webhook`;

    // Construct form data as required by HitPay API (x-www-form-urlencoded)
    const formData = new URLSearchParams();
    formData.append('amount', finalTotal.toFixed(2));
    formData.append('currency', 'PHP');
    formData.append('reference_number', orderRef);
    formData.append('redirect_url', success_url);
    formData.append('webhook', webhookUrl);
    formData.append('email', order.customer_email || '');
    formData.append('name', order.customer_name || '');
    formData.append('phone', order.customer_phone || '');
    
    // Select Philippines available payment options
    const paymentMethods = ['gcash', 'card', 'paymaya', 'billease', 'qrph'];
    paymentMethods.forEach(method => formData.append('payment_methods[]', method));

    let hpRes: Response;
    try {
      hpRes = await fetch(`${apiDomain}/v1/payment-requests`, {
        method: 'POST',
        headers: {
          'X-BUSINESS-API-KEY': HITPAY_API_KEY,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString()
      });
    } catch (e: any) {
      return fail('Network error calling HitPay API', { detail: e?.message });
    }

    const result = await hpRes.json().catch(() => ({}));
    if (!hpRes.ok) {
      const detail = result?.message || `HitPay HTTP ${hpRes.status}`;
      return fail(detail, { hitpay_status: hpRes.status, hitpay_body: result });
    }

    const checkoutUrl = result?.url;
    const paymentRequestId = result?.id;

    if (!checkoutUrl || !paymentRequestId) {
      return fail('HitPay response missing url or id', { hitpay_body: result });
    }

    // Save HitPay payment request ID to order record
    await sb
      .from('orders')
      .update({ 
        hitpay_payment_request_id: paymentRequestId, 
        payment_status: 'pending' 
      })
      .eq('id', order.id);

    return ok({ checkout_url: checkoutUrl, checkout_id: paymentRequestId });
  } catch (err: any) {
    return fail(err.message || 'Server error', { stack: err.stack });
  }
});
