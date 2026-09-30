export interface EmailVariableDefinition {
  key: string;
  label: string;
  example: string;
}

export interface EmailTemplateData {
  id: string;
  template_key: string;
  name: string;
  subject: string;
  description: string;
  category: 'orders' | 'marketing' | 'customer' | 'system';
  html_content: string;
  variables: EmailVariableDefinition[];
  is_customized?: boolean;
  is_active?: boolean;
  archived?: boolean;
  sender_name?: string;
  sender_email?: string;
  created_at?: string;
  updated_at?: string;
  updated_by?: string;
}

const FOOTER_HTML = `
<footer style="margin-top:24px;padding-top:16px;border-top:1px solid #E2E8F0;text-align:center">
  <p style="margin:0;font-size:11px;color:#94A3B8">
    © SlimDose Peptides Philippines · <a href="{{ site_url }}" style="color:#64748B;text-decoration:none">{{ site_url }}</a><br>
    <a href="{{ unsubscribe_url }}" style="color:#94A3B8;text-decoration:underline">Unsubscribe from these emails</a>
  </p>
</footer>`;

export const COMMON_VARIABLES: Record<string, EmailVariableDefinition[]> = {
  orders: [
    { key: 'customer_name', label: 'Customer Name', example: 'Maria Santos' },
    { key: 'customer_first_name', label: 'Customer First Name', example: 'Maria' },
    { key: 'customer_email', label: 'Customer Email', example: 'maria.santos@gmail.com' },
    { key: 'order_number', label: 'Order Number', example: 'SDP-008492' },
    { key: 'order_id', label: 'Order ID', example: 'SDP-008492' },
    { key: 'order_status', label: 'Order Status', example: 'Confirmed' },
    { key: 'items_summary', label: 'Items Summary', example: 'Tirzepatide 10mg (1x) - ₱3,500.00\nBPC-157 5mg (2x) - ₱4,000.00' },
    { key: 'items_table_html', label: 'Itemized Products Table (HTML)', example: '<!-- Styled itemized HTML table -->' },
    { key: 'order_date', label: 'Order Date & Time', example: 'September 9, 2026, 2:30 PM PHT' },
    { key: 'customer_phone', label: 'Customer Phone', example: '+63 917 123 4567' },
    { key: 'subtotal', label: 'Subtotal', example: '7,500.00' },
    { key: 'shipping_fee', label: 'Shipping Fee', example: '200.00' },
    { key: 'discount', label: 'Discount Amount', example: '500.00' },
    { key: 'promo_code', label: 'Promo Code', example: 'SLIM10' },
    { key: 'total_price', label: 'Total Price', example: '7,200.00' },
    { key: 'payment_method', label: 'Payment Method', example: 'GCash / Bank Transfer' },
    { key: 'shipping_address', label: 'Delivery Address', example: 'Unit 402, High Street Residences, BGC, Taguig City' },
    { key: 'shipping_provider', label: 'Courier', example: 'LBC Express' },
    { key: 'tracking_number', label: 'Tracking Number', example: 'LBC-PH-992019482' },
    { key: 'tracking_url', label: 'Tracking URL', example: 'https://slimdoseph.com/track-order' },
    { key: 'site_url', label: 'Store URL', example: 'https://slimdoseph.com' },
    { key: 'store_name', label: 'Store Name', example: 'SlimDose Peptides' },
    { key: 'customer_hub_url', label: 'Customer Hub URL', example: 'https://slimdoseph.com/customer-hub' },
    { key: 'support_email', label: 'Support Email', example: 'support@slimdoseph.com' },
    { key: 'unsubscribe_url', label: 'Unsubscribe URL', example: 'https://slimdoseph.com/#/unsubscribe?email=...' },
  ],
  marketing: [
    { key: 'customer_name', label: 'Customer Name', example: 'Alex Rivera' },
    { key: 'customer_first_name', label: 'Customer First Name', example: 'Alex' },
    { key: 'promo_code', label: 'Promo Code', example: 'WELCOME15' },
    { key: 'discount_percentage', label: 'Discount %', example: '15%' },
    { key: 'catalog_url', label: 'Catalog URL', example: 'https://slimdoseph.com' },
    { key: 'site_url', label: 'Store URL', example: 'https://slimdoseph.com' },
    { key: 'store_name', label: 'Store Name', example: 'SlimDose Peptides' },
    { key: 'customer_hub_url', label: 'Customer Hub URL', example: 'https://slimdoseph.com/customer-hub' },
    { key: 'support_email', label: 'Support Email', example: 'support@slimdoseph.com' },
    { key: 'unsubscribe_url', label: 'Unsubscribe URL', example: 'https://slimdoseph.com/#/unsubscribe?email=...' },
  ],
  customer: [
    { key: 'customer_name', label: 'Customer Name', example: 'Maria Santos' },
    { key: 'customer_first_name', label: 'Customer First Name', example: 'Maria' },
    { key: 'otp_code', label: '6-Digit OTP PIN', example: '849201' },
    { key: 'expiry_minutes', label: 'Expiry (Minutes)', example: '15' },
    { key: 'account_url', label: 'Account URL', example: 'https://slimdoseph.com' },
    { key: 'customer_hub_url', label: 'Customer Hub URL', example: 'https://slimdoseph.com/customer-hub' },
    { key: 'support_email', label: 'Support Email', example: 'info@slimdoseph.com' },
    { key: 'site_url', label: 'Store URL', example: 'https://slimdoseph.com' },
    { key: 'store_name', label: 'Store Name', example: 'SlimDose Peptides' },
    { key: 'unsubscribe_url', label: 'Unsubscribe URL', example: 'https://slimdoseph.com/#/unsubscribe?email=...' },
  ],
  system: [
    { key: 'customer_name', label: 'Customer Name', example: 'Maria Santos' },
    { key: 'customer_email', label: 'Customer Email', example: 'maria.santos@gmail.com' },
    { key: 'order_number', label: 'Order Number', example: 'SD-84920' },
    { key: 'total_price', label: 'Total Amount', example: '₱7,200.00' },
    { key: 'payment_method', label: 'Payment Method', example: 'GCash / Bank Transfer' },
    { key: 'admin_dashboard_url', label: 'Admin Dashboard URL', example: 'https://slimdoseph.com/admin' },
    { key: 'support_email', label: 'Support Email', example: 'info@slimdoseph.com' },
    { key: 'site_url', label: 'Site URL', example: 'https://slimdoseph.com' },
  ],
};

const baseTemplate = (
  id: string,
  templateKey: string,
  name: string,
  subject: string,
  description: string,
  category: EmailTemplateData['category'],
  bodyHtml: string,
  extraVars: EmailVariableDefinition[] = []
): EmailTemplateData => ({
  id,
  template_key: templateKey,
  name,
  subject,
  description,
  category,
  variables: [...(COMMON_VARIABLES[category] || []), ...extraVars],
  is_customized: false,
  is_active: true,
  html_content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${name} — SlimDose Peptides</title>
  <style>
    @media only screen and (max-width: 600px) {
      .container { width: 100% !important; padding: 16px !important; }
      .mobile-block { display: block !important; width: 100% !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #F8FAFC; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1E293B;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" style="padding: 28px 12px;">
        <table role="presentation" class="container" width="560" cellpadding="0" cellspacing="0" style="background-color: #FFFFFF; border: 1px solid #EFEFEF; border-radius: 16px; overflow: hidden;">
          <tr>
            <td style="padding: 28px 28px 8px;">
              <p style="margin: 0; font-size: 20px; font-weight: 700; color: #3C6CA8;">SlimDose <span style="color: #1A1A1A;">Peptides</span></p>
              <p style="margin: 4px 0 0; font-size: 11px; color: #8A8A8A; text-transform: uppercase; letter-spacing: 0.16em; font-weight: 600;">${name}</p>
            </td>
          </tr>
          ${bodyHtml}
          <tr>
            <td style="padding: 16px 28px 28px;">
              ${FOOTER_HTML}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
});

export const DEFAULT_EMAIL_TEMPLATES: EmailTemplateData[] = [
  baseTemplate(
    'tmpl-order-confirmed',
    'order-confirmed',
    'Order Confirmed',
    'Order Confirmed — #{{ order_number }} | SlimDose Peptides',
    'Sent immediately when an order is verified and confirmed for preparation.',
    'orders',
    `
    <tr><td style="padding: 18px 28px 8px;">
      <h1 style="margin: 0; font-size: 22px; font-weight: 800; color: #0F172A;">Thank you for your order, {{ customer_first_name }}!</h1>
      <p style="margin: 10px 0 0; font-size: 14px; color: #475569; line-height: 1.7;">We have received and confirmed your order. Your research peptides are being scheduled for inspection and temperature-controlled packaging.</p>
    </td></tr>
    <tr><td style="padding: 14px 28px;">
      <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 16px;">
        <p style="margin: 0; font-size: 11px; color: #3C6CA8; text-transform: uppercase; font-weight: 700;">Order Reference</p>
        <p style="margin: 4px 0 0; font-size: 20px; font-weight: 900; color: #0F172A; font-family: monospace;">#{{ order_number }}</p>
        <p style="margin: 10px 0 0; font-size: 13px; color: #475569;"><strong>Total:</strong> ₱{{ total_price }} · <strong>Payment:</strong> {{ payment_method }}</p>
      </div>
    </td></tr>
    <tr><td style="padding: 14px 28px;">
      <p style="margin: 0 0 8px; font-size: 13px; font-weight: 700; color: #1A1A1A; text-transform: uppercase;">Items Ordered</p>
      <p style="margin: 0; font-size: 14px; color: #3D3D3D; line-height: 1.8; white-space: pre-line;">{{ items_summary }}</p>
    </td></tr>
    <tr><td align="center" style="padding: 8px 28px 8px;">
      <a href="{{ tracking_url }}" class="mobile-block" style="display: inline-block; background-color: #3C6CA8; color: #FFFFFF; text-decoration: none; padding: 12px 28px; border-radius: 10px; font-size: 14px; font-weight: 700;">Track Your Order →</a>
    </td></tr>`
  ),
  baseTemplate(
    'tmpl-order-received',
    'order-received',
    'Order Received',
    'We received your order #{{ order_number }} — SlimDose',
    'Sent immediately when customer places checkout order before payment verification.',
    'orders',
    `
    <tr><td style="padding: 18px 28px 8px;">
      <h1 style="margin: 0; font-size: 22px; font-weight: 800; color: #0F172A;">We've received your order, {{ customer_first_name }}!</h1>
      <p style="margin: 10px 0 0; font-size: 14px; color: #475569; line-height: 1.7;">Your order <strong>#{{ order_number }}</strong> is registered in our fulfillment system. Once payment verification completes, your items move to dispatch.</p>
    </td></tr>
    <tr><td style="padding: 14px 28px;">
      <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 16px;">
        <p style="margin: 0 0 6px; font-size: 13px; color: #475569;"><strong>Shipping Address:</strong> {{ shipping_address }}</p>
        <p style="margin: 0 0 6px; font-size: 13px; color: #475569;"><strong>Payment Channel:</strong> {{ payment_method }}</p>
        <p style="margin: 0; font-size: 13px; color: #475569;"><strong>Total:</strong> ₱{{ total_price }}</p>
      </div>
    </td></tr>`
  ),
  baseTemplate(
    'tmpl-order-processing',
    'order-processing',
    'Order Processing',
    'Processing your peptide order #{{ order_number }} — SlimDose',
    'Sent when payment is verified and peptides are being packaged in lab condition.',
    'orders',
    `
    <tr><td style="padding: 18px 28px 8px;">
      <p style="margin: 0; font-size: 15px; color: #1A1A1A; line-height: 1.7;">Hi <strong>{{ customer_first_name }}</strong>,</p>
      <p style="margin: 12px 0 0; font-size: 15px; color: #3D3D3D; line-height: 1.7;">Quick update — your payment has been verified and your order #{{ order_number }} is being packed with protective temperature insulation.</p>
    </td></tr>
    <tr><td style="padding: 14px 28px;">
      <p style="margin: 0 0 8px; font-size: 13px; font-weight: 700; color: #1A1A1A; text-transform: uppercase;">Items Being Packed</p>
      <p style="margin: 0; font-size: 14px; color: #3D3D3D; line-height: 1.8; white-space: pre-line;">{{ items_summary }}</p>
    </td></tr>`
  ),
  baseTemplate(
    'tmpl-order-shipped',
    'order-shipped',
    'Order Shipped',
    'Your order #{{ order_number }} has shipped! Tracking: {{ tracking_number }}',
    'Sent when order package is handed over to courier with tracking code.',
    'orders',
    `
    <tr><td style="padding: 18px 28px 8px;">
      <p style="margin: 0; font-size: 15px; color: #1A1A1A; line-height: 1.7;">Hi <strong>{{ customer_first_name }}</strong>,</p>
      <p style="margin: 12px 0 0; font-size: 15px; color: #3D3D3D; line-height: 1.7;">Great news — your order is on its way!</p>
    </td></tr>
    <tr><td style="padding: 14px 28px;">
      <div style="background-color: #FFFCF6; border: 1px solid #C2D4EA; border-radius: 12px; padding: 16px;">
        <p style="margin: 0; font-size: 14px; color: #3D3D3D; line-height: 1.9;">
          <strong style="color: #1A1A1A;">Order Number:</strong> {{ order_number }}<br>
          <strong style="color: #1A1A1A;">Courier:</strong> {{ shipping_provider }}<br>
          <strong style="color: #1A1A1A;">Tracking #:</strong> <span style="color: #3C6CA8; font-weight: 800; font-size: 15px;">{{ tracking_number }}</span>
        </p>
      </div>
    </td></tr>
    <tr><td style="padding: 10px 28px 18px;">
      <a href="{{ tracking_url }}" style="display: inline-block; background-color: #3C6CA8; color: #FFFFFF; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-size: 14px; font-weight: 700;">Track Your Package</a>
    </td></tr>`
  ),
  baseTemplate(
    'tmpl-order-delivered',
    'order-delivered',
    'Order Delivered',
    'Delivered: Your SlimDose order #{{ order_number }} has arrived',
    'Sent once the courier confirms package drop-off to the customer.',
    'orders',
    `
    <tr><td style="padding: 18px 28px 8px;">
      <p style="margin: 0; font-size: 15px; color: #1A1A1A; line-height: 1.7;">Hi <strong>{{ customer_first_name }}</strong>,</p>
      <p style="margin: 12px 0 0; font-size: 15px; color: #3D3D3D; line-height: 1.7;">Your order #{{ order_number }} has arrived. Please remember to store your peptides according to the provided temperature guidelines.</p>
    </td></tr>
    <tr><td style="padding: 14px 28px;">
      <div style="background-color: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 12px; padding: 14px 16px;">
        <p style="margin: 0; font-size: 11px; color: #16A34A; text-transform: uppercase; font-weight: 700;">Storage Reminder</p>
        <p style="margin: 4px 0 0; font-size: 13px; color: #15803D; line-height: 1.5;">Keep unconstituted vials in a cool, dry place or standard refrigerator (2°C - 8°C) protected from direct sunlight.</p>
      </div>
    </td></tr>`
  ),
  baseTemplate(
    'tmpl-order-cancelled',
    'order-cancelled',
    'Order Cancelled',
    'Order Cancelled — #{{ order_number }} | SlimDose',
    'Sent when an order is cancelled with refund details if applicable.',
    'orders',
    `
    <tr><td style="padding: 18px 28px 8px;">
      <p style="margin: 0; font-size: 15px; color: #1A1A1A; line-height: 1.7;">Hi <strong>{{ customer_first_name }}</strong>,</p>
      <p style="margin: 12px 0 0; font-size: 15px; color: #3D3D3D; line-height: 1.7;">Your order #{{ order_number }} has been cancelled. If payment was made, any applicable refund is processed back to your original payment channel within 3–5 business days.</p>
    </td></tr>`
  ),
  baseTemplate(
    'tmpl-order-confirmation',
    'order-confirmation',
    'Order Confirmation',
    'Order Confirmed: {{ order_number }} — SlimDose Peptides',
    'Sent immediately when an order is created by the customer.',
    'orders',
    `
    <tr><td style="padding: 18px 28px 8px;">
      <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #1A1A1A;">Thank you, {{ customer_first_name }}.</h1>
      <p style="margin: 14px 0 0; font-size: 15px; color: #3D3D3D; line-height: 1.7;">We have successfully received your order <strong style="color: #3C6CA8;">{{ order_number }}</strong>. Our team is preparing your research package with cold-chain protection.</p>
    </td></tr>
    <tr><td style="padding: 16px 28px;">
      <div style="background-color: #FAF8F5; border-radius: 12px; padding: 18px 20px;">
        <p style="margin: 0 0 10px; font-size: 12px; font-weight: 700; color: #666; text-transform: uppercase; letter-spacing: 0.1em;">Order Summary</p>
        <pre style="margin: 0; font-family: inherit; font-size: 14px; color: #222; white-space: pre-wrap; line-height: 1.6;">{{ items_summary }}</pre>
      </div>
    </td></tr>`
  ),
  baseTemplate(
    'tmpl-payment-confirmed',
    'payment-confirmed',
    'Payment Confirmed',
    'Payment Verified for Order {{ order_number }}',
    'Sent when admin confirms and approves payment proof for an order.',
    'orders',
    `
    <tr><td style="padding: 18px 28px 8px;">
      <div style="display: inline-block; background-color: #ECFDF5; color: #047857; font-size: 12px; font-weight: 700; padding: 4px 12px; border-radius: 9999px; margin-bottom: 12px;">✓ Payment Received</div>
      <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #1A1A1A;">Payment verified for order {{ order_number }}</h1>
      <p style="margin: 14px 0 0; font-size: 15px; color: #3D3D3D; line-height: 1.7;">Your payment of <strong>₱{{ total_price }}</strong> via {{ payment_method }} has been verified. Your order is now queued for immediate fulfillment and dispatch.</p>
    </td></tr>`
  ),
  baseTemplate(
    'tmpl-order-dispatched',
    'order-dispatched',
    'Order Dispatched (Tracking)',
    'Your SlimDose Order {{ order_number }} Has Been Dispatched!',
    'Sent when the order is fulfilled and assigned a shipping tracking number.',
    'orders',
    `
    <tr><td style="padding: 18px 28px 8px;">
      <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #1A1A1A;">Your package is on its way, {{ customer_first_name }}.</h1>
      <p style="margin: 14px 0 0; font-size: 15px; color: #3D3D3D; line-height: 1.7;">Order <strong style="color: #3C6CA8;">{{ order_number }}</strong> has been handed over to <strong>{{ shipping_provider }}</strong>.</p>
    </td></tr>
    <tr><td style="padding: 16px 28px;">
      <div style="background-color: #EFF6FF; border: 1px solid #BFDBFE; border-radius: 12px; padding: 18px 20px; text-align: center;">
        <p style="margin: 0; font-size: 12px; color: #1E40AF; text-transform: uppercase; letter-spacing: 0.14em; font-weight: 700;">Tracking Number</p>
        <p style="margin: 8px 0 0; font-size: 20px; font-weight: 900; color: #1E3A8A; letter-spacing: 0.08em; font-family: monospace;">{{ tracking_number }}</p>
        <a href="{{ tracking_url }}" style="display: inline-block; margin-top: 14px; background-color: #3C6CA8; color: #FFFFFF; text-decoration: none; font-weight: 700; font-size: 13px; padding: 10px 22px; border-radius: 8px;">Track Real-Time Status →</a>
      </div>
    </td></tr>`
  ),
  baseTemplate(
    'tmpl-customer-follow-up',
    'customer-follow-up',
    'Customer Follow-Up (1 Month)',
    'How are you doing, {{ customer_first_name }}? — SlimDose Peptides',
    'Automated follow-up sent after the configured interval following a qualifying order (default: 1 month).',
    'marketing',
    `
    <tr><td style="padding: 18px 28px 8px;">
      <h1 style="margin: 0; font-size: 22px; font-weight: 700; color: #1A1A1A;">Hi {{ customer_first_name }},</h1>
      <p style="margin: 12px 0 0; font-size: 15px; color: #3D3D3D; line-height: 1.7;">About a month ago you placed order <strong style="color: #3C6CA8;">{{ order_id }}</strong> with us. We'd love to hear how everything went.</p>
    </td></tr>
    <tr><td style="padding: 14px 28px;">
      <p style="margin: 0 0 16px; font-size: 15px; color: #3D3D3D; line-height: 1.7;">If you're ready to restock, your next order is just a few clicks away. And if you have any questions about storage or handling, our team is happy to help.</p>
      <a href="{{ store_url }}" class="mobile-block" style="display: inline-block; background-color: #3C6CA8; color: #FFFFFF; text-decoration: none; padding: 12px 28px; border-radius: 10px; font-size: 14px; font-weight: 700;">Reorder at SlimDose</a>
    </td></tr>`
  ),
  baseTemplate(
    'tmpl-promo-welcome',
    'promo-welcome',
    'Member Welcome & Promo',
    'Welcome to SlimDose — Enjoy {{ discount_percentage }} off your first order!',
    'Sent to new newsletter or account subscribers with an exclusive discount.',
    'marketing',
    `
    <tr><td style="padding: 18px 28px 8px;">
      <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #1A1A1A;">Welcome, {{ customer_first_name }}!</h1>
      <p style="margin: 14px 0 0; font-size: 15px; color: #3D3D3D; line-height: 1.7;">You're in. Use code <strong style="color: #3C6CA8; font-size: 17px;">{{ promo_code }}</strong> for <strong>{{ discount_percentage }}</strong> off your first order.</p>
    </td></tr>
    <tr><td align="center" style="padding: 16px 28px;">
      <a href="{{ catalog_url }}" class="mobile-block" style="display: inline-block; background-color: #3C6CA8; color: #FFFFFF; text-decoration: none; padding: 12px 28px; border-radius: 10px; font-size: 14px; font-weight: 700;">Shop the Catalog</a>
    </td></tr>`
  ),
  baseTemplate(
    'tmpl-thank-you-order',
    'thank-you-order',
    'Loyalty Thank You',
    'Thank you for your order, {{ customer_first_name }} — SlimDose Peptides',
    'Loyalty appreciation email dispatched after order delivery.',
    'marketing',
    `
    <tr><td style="padding: 18px 28px 8px;">
      <h1 style="margin: 0; font-size: 22px; font-weight: 700; color: #1A1A1A;">Thank you, {{ customer_first_name }}.</h1>
      <p style="margin: 12px 0 0; font-size: 15px; color: #3D3D3D; line-height: 1.7;">Your order has been delivered and we're grateful for your trust in SlimDose Peptides.</p>
    </td></tr>`
  ),
  baseTemplate(
    'tmpl-we-miss-you',
    'we-miss-you',
    'We Miss You (Re-Engagement)',
    'It\'s been a while, {{ customer_first_name }} — SlimDose Peptides',
    'Re-engagement email for customers who have not purchased recently.',
    'marketing',
    `
    <tr><td style="padding: 18px 28px 8px;">
      <h1 style="margin: 0; font-size: 22px; font-weight: 700; color: #1A1A1A;">It's been a while, {{ customer_first_name }}.</h1>
      <p style="margin: 12px 0 0; font-size: 15px; color: #3D3D3D; line-height: 1.7;">We noticed you haven't ordered recently. Your favorites are waiting — and we're here if you need anything at all.</p>
    </td></tr>
    <tr><td align="center" style="padding: 16px 28px;">
      <a href="{{ catalog_url }}" class="mobile-block" style="display: inline-block; background-color: #3C6CA8; color: #FFFFFF; text-decoration: none; padding: 12px 28px; border-radius: 10px; font-size: 14px; font-weight: 700;">Browse the Catalog</a>
    </td></tr>`
  ),
  baseTemplate(
    'tmpl-customer-welcome-registration',
    'customer-welcome-registration',
    'Customer Welcome (New Account)',
    'Your SlimDose account is ready, {{ customer_first_name }}!',
    'Sent when a new customer account is provisioned with their OTP PIN.',
    'customer',
    `
    <tr><td style="padding: 18px 28px 8px;">
      <h1 style="margin: 0; font-size: 22px; font-weight: 700; color: #1A1A1A;">Welcome, {{ customer_first_name }}!</h1>
      <p style="margin: 12px 0 0; font-size: 15px; color: #3D3D3D; line-height: 1.7;">Your SlimDose customer account has been created. Use the PIN below to sign in to your customer hub.</p>
    </td></tr>
    <tr><td style="padding: 14px 28px;">
      <div style="background-color: #EFF6FF; border: 1px solid #BFDBFE; border-radius: 12px; padding: 18px; text-align: center;">
        <p style="margin: 0; font-size: 12px; color: #1E40AF; text-transform: uppercase; font-weight: 700;">Access PIN</p>
        <p style="margin: 6px 0 0; font-size: 26px; font-weight: 900; color: #1E3A8A; font-family: monospace; letter-spacing: 0.2em;">{{ otp_code }}</p>
        <p style="margin: 8px 0 0; font-size: 11px; color: #64748B;">Valid for {{ expiry_minutes }} minutes</p>
      </div>
    </td></tr>`
  ),
  baseTemplate(
    'tmpl-customer-otp-login',
    'customer-otp-login',
    'Customer OTP Login',
    'Your SlimDose login code: {{ otp_code }}',
    'Passwordless login PIN email for the customer hub.',
    'customer',
    `
    <tr><td style="padding: 18px 28px 8px;">
      <p style="margin: 0; font-size: 15px; color: #1A1A1A; line-height: 1.7;">Hi <strong>{{ customer_first_name }}</strong>,</p>
      <p style="margin: 12px 0 0; font-size: 15px; color: #3D3D3D; line-height: 1.7;">Use this PIN to sign in to your SlimDose customer hub.</p>
    </td></tr>
    <tr><td style="padding: 14px 28px;">
      <div style="background-color: #EFF6FF; border: 1px solid #BFDBFE; border-radius: 12px; padding: 18px; text-align: center;">
        <p style="margin: 6px 0 0; font-size: 26px; font-weight: 900; color: #1E3A8A; font-family: monospace; letter-spacing: 0.2em;">{{ otp_code }}</p>
        <p style="margin: 8px 0 0; font-size: 11px; color: #64748B;">Valid for {{ expiry_minutes }} minutes</p>
      </div>
    </td></tr>`
  ),
  baseTemplate(
    'tmpl-password-reset-otp',
    'password-reset-otp',
    'Password Reset OTP',
    'Reset your SlimDose password — PIN: {{ otp_code }}',
    'Branded 6-digit PIN dispatched for password resets.',
    'system',
    `
    <tr><td style="padding: 18px 28px 8px;">
      <p style="margin: 0; font-size: 15px; color: #1A1A1A; line-height: 1.7;">Hi <strong>{{ customer_first_name }}</strong>,</p>
      <p style="margin: 12px 0 0; font-size: 15px; color: #3D3D3D; line-height: 1.7;">We received a request to reset the password for your account. Use this PIN to continue.</p>
    </td></tr>
    <tr><td style="padding: 14px 28px;">
      <div style="background-color: #FEF2F2; border: 1px solid #FECACA; border-radius: 12px; padding: 18px; text-align: center;">
        <p style="margin: 6px 0 0; font-size: 26px; font-weight: 900; color: #B91C1C; font-family: monospace; letter-spacing: 0.2em;">{{ otp_code }}</p>
        <p style="margin: 8px 0 0; font-size: 11px; color: #64748B;">Valid for {{ expiry_minutes }} minutes</p>
      </div>
    </td></tr>
    <tr><td style="padding: 14px 28px;">
      <p style="margin: 0; font-size: 12px; color: #737373;">If you didn't request this reset, you can safely ignore this email.</p>
    </td></tr>`
  ),
  baseTemplate(
    'tmpl-custom-admin-email',
    'custom-admin-email',
    'Custom Admin Email',
    'A message from SlimDose Peptides',
    'Blank branded canvas for ad-hoc campaigns and admin sends.',
    'system',
    `
    <tr><td style="padding: 18px 28px 8px;">
      <p style="margin: 0; font-size: 15px; color: #3D3D3D; line-height: 1.8;">Hi <strong>{{ customer_first_name }}</strong>,</p>
      <p style="margin: 12px 0 0; font-size: 15px; color: #3D3D3D; line-height: 1.8;">[Write your message here. You can use variables like {{ customer_name }} or {{ promo_code }} from the variable picker.]</p>
    </td></tr>`
  ),
];
