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
  created_at?: string;
  updated_at?: string;
  updated_by?: string;
}

export const COMMON_VARIABLES: Record<string, EmailVariableDefinition[]> = {
  orders: [
    { key: 'customer_name', label: 'Customer Name', example: 'Maria Santos' },
    { key: 'customer_email', label: 'Customer Email', example: 'maria.santos@gmail.com' },
    { key: 'order_number', label: 'Order Number', example: 'SD-84920' },
    { key: 'order_id', label: 'Order ID', example: '84920' },
    { key: 'order_status', label: 'Order Status', example: 'Confirmed' },
    { key: 'items_summary', label: 'Items Summary', example: 'Tirzepatide 10mg (1x) - ₱3,500.00\nBPC-157 5mg (2x) - ₱4,000.00' },
    { key: 'subtotal', label: 'Subtotal', example: '7,500.00' },
    { key: 'shipping_fee', label: 'Shipping Fee', example: '200.00' },
    { key: 'discount', label: 'Discount Amount', example: '500.00' },
    { key: 'promo_code', label: 'Promo Code', example: 'SLIMVIP10' },
    { key: 'total_price', label: 'Total Price', example: '7,200.00' },
    { key: 'payment_method', label: 'Payment Method', example: 'GCash / Bank Transfer' },
    { key: 'shipping_address', label: 'Delivery Address', example: 'Unit 402, High Street Residences, BGC, Taguig City' },
    { key: 'shipping_provider', label: 'Courier', example: 'LBC Express' },
    { key: 'tracking_number', label: 'Tracking Number', example: 'LBC-PH-992019482' },
    { key: 'tracking_url', label: 'Tracking URL', example: 'https://slimdoseph.com/track-order' },
    { key: 'site_url', label: 'Store URL', example: 'https://slimdoseph.com' },
    { key: 'support_email', label: 'Support Email', example: 'support@slimdoseph.com' },
  ],
  marketing: [
    { key: 'customer_name', label: 'Customer Name', example: 'Alex Rivera' },
    { key: 'promo_code', label: 'Promo Code', example: 'WELCOME15' },
    { key: 'discount_percentage', label: 'Discount %', example: '15%' },
    { key: 'catalog_url', label: 'Catalog URL', example: 'https://slimdoseph.com' },
    { key: 'site_url', label: 'Store URL', example: 'https://slimdoseph.com' },
    { key: 'support_email', label: 'Support Email', example: 'support@slimdoseph.com' },
  ],
  customer: [
    { key: 'customer_name', label: 'Customer Name', example: 'Dr. Michael Chen' },
    { key: 'account_url', label: 'Account URL', example: 'https://slimdoseph.com' },
    { key: 'support_email', label: 'Support Email', example: 'support@slimdoseph.com' },
    { key: 'site_url', label: 'Store URL', example: 'https://slimdoseph.com' },
  ],
};

export const DEFAULT_EMAIL_TEMPLATES: EmailTemplateData[] = [
  {
    id: 'tmpl-order-confirmed',
    template_key: 'order-confirmed',
    name: 'Order Confirmed',
    subject: 'Order Confirmed — #{{ order_number }} | SlimDose Peptides',
    description: 'Sent immediately when an order is verified and confirmed for preparation.',
    category: 'orders',
    variables: COMMON_VARIABLES.orders,
    is_customized: false,
    is_active: true,
    html_content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Order Confirmed</title>
  <style>
    @media only screen and (max-width: 480px) {
      .container { width: 100% !important; padding: 16px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #FFFCF6; font-family: 'Helvetica Neue', Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" style="padding: 28px 12px;">
        <table role="presentation" class="container" width="560" cellpadding="0" cellspacing="0" style="background-color: #FFFFFF; border: 1px solid #EFEFEF; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.03);">

          <tr>
            <td style="padding: 28px 28px 12px; background: linear-gradient(180deg, #F5F9FF 0%, #FFFFFF 100%);">
              <p style="margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -0.02em; color: #3C6CA8;">SlimDose <span style="color: #1A1A1A; font-weight: 600;">Peptides</span></p>
              <p style="margin: 6px 0 0; font-size: 11px; color: #3C6CA8; text-transform: uppercase; letter-spacing: 0.16em; font-weight: 700;">Order Confirmation</p>
            </td>
          </tr>

          <tr>
            <td style="padding: 18px 28px 8px;">
              <p style="margin: 0; font-size: 16px; color: #1A1A1A; line-height: 1.6;">Hi <strong>{{ customer_name }}</strong>,</p>
              <p style="margin: 12px 0 0; font-size: 15px; color: #3D3D3D; line-height: 1.7;">Thank you for your order! We've received your request and our team is preparing your peptides for shipment. You'll receive a tracking link as soon as your package ships.</p>
            </td>
          </tr>

          <tr>
            <td style="padding: 14px 28px;">
              <div style="background-color: #F8FAFD; border: 1px solid #C2D4EA; border-radius: 12px; padding: 16px 18px;">
                <p style="margin: 0; font-size: 11px; color: #3C6CA8; text-transform: uppercase; letter-spacing: 0.14em; font-weight: 700;">Order Reference</p>
                <p style="margin: 6px 0 0; font-size: 18px; font-weight: 800; color: #1A1A1A; letter-spacing: 0.02em;">#{{ order_number }}</p>
                <p style="margin: 6px 0 0; font-size: 13px; color: #64748B;">Payment Method: <strong>{{ payment_method }}</strong></p>
              </div>
            </td>
          </tr>

          <tr>
            <td style="padding: 14px 28px;">
              <p style="margin: 0 0 10px; font-size: 12px; font-weight: 800; color: #1A1A1A; text-transform: uppercase; letter-spacing: 0.08em;">Ordered Items</p>
              <div style="background-color: #FAFAFA; border: 1px solid #F0F0F0; border-radius: 10px; padding: 14px 16px;">
                <p style="margin: 0; font-size: 14px; color: #2D3748; line-height: 1.8; white-space: pre-line; font-family: monospace;">{{ items_summary }}</p>
              </div>
            </td>
          </tr>

          <tr>
            <td style="padding: 6px 28px;"><div style="height: 1px; background-color: #EFEFEF;"></div></td>
          </tr>

          <tr>
            <td style="padding: 14px 28px;">
              <p style="margin: 0 0 10px; font-size: 12px; font-weight: 800; color: #1A1A1A; text-transform: uppercase; letter-spacing: 0.08em;">Payment Breakdown</p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size: 14px; color: #3D3D3D;">
                <tr><td style="padding: 5px 0;">Subtotal</td><td align="right" style="padding: 5px 0;">₱{{ subtotal }}</td></tr>
                <tr><td style="padding: 5px 0;">Shipping Fee</td><td align="right" style="padding: 5px 0;">₱{{ shipping_fee }}</td></tr>
                <tr><td style="padding: 5px 0; color: #16A34A;">Discount ({{ promo_code }})</td><td align="right" style="padding: 5px 0; color: #16A34A;">-₱{{ discount }}</td></tr>
                <tr>
                  <td style="padding: 12px 0 0; font-weight: 800; font-size: 16px; color: #1A1A1A; border-top: 2px solid #EFEFEF;">Total Paid</td>
                  <td align="right" style="padding: 12px 0 0; font-weight: 800; font-size: 16px; color: #3C6CA8; border-top: 2px solid #EFEFEF;">₱{{ total_price }}</td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding: 16px 28px 24px;">
              <a href="{{ site_url }}" style="display: inline-block; background-color: #3C6CA8; color: #FFFFFF; text-decoration: none; padding: 12px 26px; border-radius: 8px; font-size: 14px; font-weight: 700; letter-spacing: 0.02em;">Visit SlimDose Store</a>
            </td>
          </tr>

          <tr>
            <td style="padding: 20px 28px; background-color: #F8FAFD; border-top: 1px solid #EAEAEA; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #718096; line-height: 1.6;">
                Have questions or need batch testing info? Reply directly to this email or reach us at <a href="mailto:{{ support_email }}" style="color: #3C6CA8; text-decoration: underline;">{{ support_email }}</a>.
              </p>
              <p style="margin: 8px 0 0; font-size: 11px; color: #A0AEC0;">© SlimDose Peptides Philippines. All rights reserved.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
  },
  {
    id: 'tmpl-order-received',
    template_key: 'order-received',
    name: 'Order Received',
    subject: 'We received your order #{{ order_number }} — SlimDose',
    description: 'Sent immediately when customer places checkout order before payment verification.',
    category: 'orders',
    variables: COMMON_VARIABLES.orders,
    is_customized: false,
    is_active: true,
    html_content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Order Received</title>
  <style>
    @media only screen and (max-width: 480px) {
      .container { width: 100% !important; padding: 16px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #FFFCF6; font-family: 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" style="padding: 28px 12px;">
        <table role="presentation" class="container" width="560" cellpadding="0" cellspacing="0" style="background-color: #FFFFFF; border: 1px solid #EFEFEF; border-radius: 16px; overflow: hidden;">
          <tr>
            <td style="padding: 28px 28px 8px;">
              <p style="margin: 0; font-size: 20px; font-weight: 700; letter-spacing: -0.01em; color: #3C6CA8;">SlimDose <span style="color: #1A1A1A; font-weight: 600;">Peptides</span></p>
              <p style="margin: 4px 0 0; font-size: 11px; color: #8A8A8A; text-transform: uppercase; letter-spacing: 0.16em; font-weight: 600;">Order Received</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 22px 28px 8px;">
              <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #1A1A1A; letter-spacing: -0.02em;">We've got your order.</h1>
              <p style="margin: 14px 0 0; font-size: 15px; color: #3D3D3D; line-height: 1.7;">Thanks for ordering with SlimDose, <strong>{{ customer_name }}</strong>. Your order has been received and is now being queued for verification.</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 14px 28px;">
              <div style="background-color: #FFFCF6; border: 1px solid #EFEFEF; border-radius: 12px; padding: 18px 20px;">
                <p style="margin: 0; font-size: 11px; color: #3C6CA8; text-transform: uppercase; letter-spacing: 0.18em; font-weight: 700;">Order Reference</p>
                <p style="margin: 8px 0 0; font-size: 18px; font-weight: 700; color: #1A1A1A; letter-spacing: 0.02em;">#{{ order_number }}</p>
                <p style="margin: 6px 0 0; font-size: 13px; color: #5C5C5C;">Total Amount: <strong>₱{{ total_price }}</strong></p>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding: 14px 28px;">
              <p style="margin: 0 0 8px; font-size: 13px; font-weight: 700; color: #1A1A1A; text-transform: uppercase;">Items Ordered</p>
              <p style="margin: 0; font-size: 14px; color: #3D3D3D; line-height: 1.8; white-space: pre-line;">{{ items_summary }}</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 28px; background-color: #F8FAFD; border-top: 1px solid #EFEFEF; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #8A8A8A;">© SlimDose Peptides &middot; {{ site_url }}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
  },
  {
    id: 'tmpl-order-processing',
    template_key: 'order-processing',
    name: 'Order Processing',
    subject: 'Processing your peptide order #{{ order_number }} — SlimDose',
    description: 'Sent when payment is verified and peptides are being packaged in lab condition.',
    category: 'orders',
    variables: COMMON_VARIABLES.orders,
    is_customized: false,
    is_active: true,
    html_content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Order Processing</title>
  <style>
    @media only screen and (max-width: 480px) {
      .container { width: 100% !important; padding: 16px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #FFFCF6; font-family: 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" style="padding: 28px 12px;">
        <table role="presentation" class="container" width="560" cellpadding="0" cellspacing="0" style="background-color: #FFFFFF; border: 1px solid #EFEFEF; border-radius: 16px; overflow: hidden;">
          <tr>
            <td style="padding: 28px 28px 8px;">
              <p style="margin: 0; font-size: 20px; font-weight: 700; color: #3C6CA8;">SlimDose <span style="color: #1A1A1A;">Peptides</span></p>
              <p style="margin: 4px 0 0; font-size: 11px; color: #8A8A8A; text-transform: uppercase; letter-spacing: 0.16em; font-weight: 600;">Order In Preparation</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 18px 28px 8px;">
              <p style="margin: 0; font-size: 15px; color: #1A1A1A; line-height: 1.7;">Hi <strong>{{ customer_name }}</strong>,</p>
              <p style="margin: 12px 0 0; font-size: 15px; color: #3D3D3D; line-height: 1.7;">Quick update — your payment has been verified and your order #{{ order_number }} is currently being carefully packed with protective temperature insulation.</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 14px 28px;">
              <div style="background-color: #FFFCF6; border: 1px solid #C2D4EA; border-radius: 12px; padding: 14px 16px;">
                <p style="margin: 0; font-size: 11px; color: #3C6CA8; text-transform: uppercase; font-weight: 700;">Status</p>
                <p style="margin: 4px 0 0; font-size: 16px; font-weight: 700; color: #1A1A1A;">🧪 Quality Check & Packaging</p>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding: 14px 28px;">
              <p style="margin: 0 0 8px; font-size: 13px; font-weight: 700; color: #1A1A1A; text-transform: uppercase;">Being Packed</p>
              <p style="margin: 0; font-size: 14px; color: #3D3D3D; line-height: 1.8; white-space: pre-line;">{{ items_summary }}</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 18px 28px 24px; text-align: center; border-top: 1px solid #EFEFEF;">
              <p style="margin: 0; font-size: 12px; color: #8A8A8A;">SlimDose Peptides &middot; <a href="{{ site_url }}" style="color: #3C6CA8;">{{ site_url }}</a></p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
  },
  {
    id: 'tmpl-order-shipped',
    template_key: 'order-shipped',
    name: 'Order Shipped',
    subject: 'Your order #{{ order_number }} has shipped! Tracking: {{ tracking_number }}',
    description: 'Sent when order package is handed over to courier with tracking code.',
    category: 'orders',
    variables: COMMON_VARIABLES.orders,
    is_customized: false,
    is_active: true,
    html_content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Order Shipped</title>
  <style>
    @media only screen and (max-width: 480px) {
      .container { width: 100% !important; padding: 16px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #FFFCF6; font-family: 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" style="padding: 28px 12px;">
        <table role="presentation" class="container" width="560" cellpadding="0" cellspacing="0" style="background-color: #FFFFFF; border: 1px solid #EFEFEF; border-radius: 16px; overflow: hidden;">
          <tr>
            <td style="padding: 28px 28px 8px;">
              <p style="margin: 0; font-size: 20px; font-weight: 700; color: #3C6CA8;">SlimDose <span style="color: #1A1A1A; font-weight: 600;">Peptides</span></p>
              <p style="margin: 4px 0 0; font-size: 11px; color: #8A8A8A; text-transform: uppercase; letter-spacing: 0.16em; font-weight: 600;">Package In Transit</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 18px 28px 8px;">
              <p style="margin: 0; font-size: 15px; color: #1A1A1A; line-height: 1.7;">Hi <strong>{{ customer_name }}</strong>,</p>
              <p style="margin: 12px 0 0; font-size: 15px; color: #3D3D3D; line-height: 1.7;">Great news — your order is on its way! Use the tracking details below to follow your package in real time.</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 14px 28px;">
              <div style="background-color: #FFFCF6; border: 1px solid #C2D4EA; border-radius: 12px; padding: 16px;">
                <p style="margin: 0 0 10px; font-size: 11px; color: #3C6CA8; text-transform: uppercase; letter-spacing: 0.14em; font-weight: 700;">Tracking Information</p>
                <p style="margin: 0; font-size: 14px; color: #3D3D3D; line-height: 1.9;">
                  <strong style="color: #1A1A1A;">Order Number:</strong> {{ order_number }}<br>
                  <strong style="color: #1A1A1A;">Courier:</strong> {{ shipping_provider }}<br>
                  <strong style="color: #1A1A1A;">Tracking #:</strong> <span style="color: #3C6CA8; font-weight: 800; font-size: 15px;">{{ tracking_number }}</span>
                </p>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding: 10px 28px 18px;">
              <a href="{{ tracking_url }}" style="display: inline-block; background-color: #3C6CA8; color: #FFFFFF; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-size: 14px; font-weight: 700;">Track Your Package</a>
            </td>
          </tr>
          <tr>
            <td style="padding: 14px 28px;">
              <p style="margin: 0 0 8px; font-size: 13px; font-weight: 700; color: #1A1A1A; text-transform: uppercase;">In This Shipment</p>
              <p style="margin: 0; font-size: 14px; color: #3D3D3D; line-height: 1.8; white-space: pre-line;">{{ items_summary }}</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 28px; background-color: #F8FAFD; border-top: 1px solid #EFEFEF; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #8A8A8A;">SlimDose Peptides &middot; Support: <a href="mailto:{{ support_email }}" style="color: #3C6CA8;">{{ support_email }}</a></p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
  },
  {
    id: 'tmpl-order-delivered',
    template_key: 'order-delivered',
    name: 'Order Delivered',
    subject: 'Delivered: Your SlimDose order #{{ order_number }} has arrived',
    description: 'Sent once the courier confirms package drop-off to the customer.',
    category: 'orders',
    variables: COMMON_VARIABLES.orders,
    is_customized: false,
    is_active: true,
    html_content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Order Delivered</title>
  <style>
    @media only screen and (max-width: 480px) {
      .container { width: 100% !important; padding: 16px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #FFFCF6; font-family: 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" style="padding: 28px 12px;">
        <table role="presentation" class="container" width="560" cellpadding="0" cellspacing="0" style="background-color: #FFFFFF; border: 1px solid #EFEFEF; border-radius: 16px; overflow: hidden;">
          <tr>
            <td style="padding: 28px 28px 8px;">
              <p style="margin: 0; font-size: 20px; font-weight: 700; color: #3C6CA8;">SlimDose <span style="color: #1A1A1A;">Peptides</span></p>
              <p style="margin: 4px 0 0; font-size: 11px; color: #16A34A; text-transform: uppercase; letter-spacing: 0.16em; font-weight: 700;">Delivered Successfully</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 18px 28px 8px;">
              <p style="margin: 0; font-size: 15px; color: #1A1A1A; line-height: 1.7;">Hi <strong>{{ customer_name }}</strong>,</p>
              <p style="margin: 12px 0 0; font-size: 15px; color: #3D3D3D; line-height: 1.7;">Your order #{{ order_number }} has arrived. Please remember to inspect the package and refrigerate or store your peptides according to the provided temperature guidelines.</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 14px 28px;">
              <div style="background-color: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 12px; padding: 14px 16px;">
                <p style="margin: 0; font-size: 11px; color: #16A34A; text-transform: uppercase; font-weight: 700;">Storage Reminder</p>
                <p style="margin: 4px 0 0; font-size: 13px; color: #15803D; line-height: 1.5;">Keep unconstituted vials in a cool, dry place or standard refrigerator (2°C - 8°C) protected from direct sunlight.</p>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding: 14px 28px;">
              <p style="margin: 0 0 8px; font-size: 13px; font-weight: 700; color: #1A1A1A; text-transform: uppercase;">Delivered Items</p>
              <p style="margin: 0; font-size: 14px; color: #3D3D3D; line-height: 1.8; white-space: pre-line;">{{ items_summary }}</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 28px; background-color: #F8FAFD; border-top: 1px solid #EFEFEF; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #8A8A8A;">Thank you for trusting SlimDose Peptides &middot; <a href="{{ site_url }}" style="color: #3C6CA8;">{{ site_url }}</a></p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
  },
  {
    id: 'tmpl-order-cancelled',
    template_key: 'order-cancelled',
    name: 'Order Cancelled',
    subject: 'Order Cancelled — #{{ order_number }} | SlimDose',
    description: 'Sent when an order is cancelled with refund details if applicable.',
    category: 'orders',
    variables: COMMON_VARIABLES.orders,
    is_customized: false,
    is_active: true,
    html_content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Order Cancelled</title>
  <style>
    @media only screen and (max-width: 480px) {
      .container { width: 100% !important; padding: 16px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #FFFCF6; font-family: 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" style="padding: 28px 12px;">
        <table role="presentation" class="container" width="560" cellpadding="0" cellspacing="0" style="background-color: #FFFFFF; border: 1px solid #EFEFEF; border-radius: 16px; overflow: hidden;">
          <tr>
            <td style="padding: 28px 28px 8px;">
              <p style="margin: 0; font-size: 20px; font-weight: 700; color: #DC2626;">SlimDose <span style="color: #1A1A1A;">Peptides</span></p>
              <p style="margin: 4px 0 0; font-size: 11px; color: #DC2626; text-transform: uppercase; letter-spacing: 0.16em; font-weight: 700;">Order Cancelled</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 18px 28px 8px;">
              <p style="margin: 0; font-size: 15px; color: #1A1A1A; line-height: 1.7;">Hi <strong>{{ customer_name }}</strong>,</p>
              <p style="margin: 12px 0 0; font-size: 15px; color: #3D3D3D; line-height: 1.7;">Your order #{{ order_number }} has been cancelled. If payment was made, any applicable refund is processed back to your original payment channel within 3–5 business days.</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 14px 28px;">
              <div style="background-color: #FEF2F2; border: 1px solid #FECACA; border-radius: 12px; padding: 14px 16px;">
                <p style="margin: 0; font-size: 11px; color: #DC2626; text-transform: uppercase; font-weight: 700;">Order Reference</p>
                <p style="margin: 4px 0 0; font-size: 16px; font-weight: 700; color: #1A1A1A;">#{{ order_number }} (Cancelled)</p>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 28px; background-color: #F8FAFD; border-top: 1px solid #EFEFEF; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #8A8A8A;">If this cancellation was in error, please reach out to <a href="mailto:{{ support_email }}" style="color: #3C6CA8;">{{ support_email }}</a>.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
  },
  {
    id: 'tmpl-promo-welcome',
    template_key: 'promo-welcome',
    name: 'VIP Welcome & Promo',
    subject: 'Welcome to SlimDose VIP — Enjoy {{ discount_percentage }} off your first order!',
    description: 'Sent to new newsletter or account subscribers with an exclusive discount.',
    category: 'marketing',
    variables: COMMON_VARIABLES.marketing,
    is_customized: false,
    is_active: true,
    html_content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to SlimDose</title>
  <style>
    @media only screen and (max-width: 480px) {
      .container { width: 100% !important; padding: 16px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #FFFCF6; font-family: 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" style="padding: 28px 12px;">
        <table role="presentation" class="container" width="560" cellpadding="0" cellspacing="0" style="background-color: #FFFFFF; border: 1px solid #EFEFEF; border-radius: 16px; overflow: hidden;">
          <tr>
            <td style="padding: 28px 28px 8px;">
              <p style="margin: 0; font-size: 20px; font-weight: 700; color: #3C6CA8;">SlimDose <span style="color: #1A1A1A; font-weight: 600;">Peptides</span></p>
              <p style="margin: 4px 0 0; font-size: 11px; color: #8A8A8A; text-transform: uppercase; letter-spacing: 0.16em; font-weight: 600;">Welcome Aboard</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 22px 28px 8px;">
              <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #1A1A1A; letter-spacing: -0.02em;">Glad to have you with us, {{ customer_name }}.</h1>
              <p style="margin: 14px 0 0; font-size: 15px; color: #3D3D3D; line-height: 1.7;">SlimDose is built around 99%+ lab-certified research peptides, transparent COAs, and express climate-safe courier shipping in the Philippines.</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 18px 28px;">
              <div style="background-color: #F0FDF4; border: 2px dashed #86EFAC; border-radius: 12px; padding: 18px 20px; text-align: center;">
                <p style="margin: 0; font-size: 12px; color: #15803D; text-transform: uppercase; letter-spacing: 0.18em; font-weight: 800;">Your VIP Welcome Code</p>
                <p style="margin: 8px 0 0; font-size: 24px; font-weight: 900; color: #166534; letter-spacing: 0.1em;">{{ promo_code }}</p>
                <p style="margin: 6px 0 0; font-size: 13px; color: #16A34A;">Use this at checkout to save {{ discount_percentage }}</p>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding: 8px 28px 18px; text-align: center;">
              <a href="{{ catalog_url }}" style="display: inline-block; background-color: #3C6CA8; color: #FFFFFF; text-decoration: none; padding: 14px 30px; border-radius: 8px; font-size: 14px; font-weight: 700;">Explore Peptide Catalog</a>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 28px; background-color: #F8FAFD; border-top: 1px solid #EFEFEF; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #8A8A8A;">© SlimDose Peptides &middot; <a href="{{ site_url }}" style="color: #3C6CA8;">{{ site_url }}</a></p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
  },
  {
    id: 'tmpl-thank-you-order',
    template_key: 'thank-you-order',
    name: 'Customer Loyalty Thank You',
    subject: 'Thank you for choosing SlimDose Peptides, {{ customer_name }}!',
    description: 'Post-purchase loyalty appreciation note sent after completed delivery.',
    category: 'marketing',
    variables: COMMON_VARIABLES.marketing,
    is_customized: false,
    is_active: true,
    html_content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Thank You</title>
  <style>
    @media only screen and (max-width: 480px) {
      .container { width: 100% !important; padding: 16px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #FFFCF6; font-family: 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" style="padding: 28px 12px;">
        <table role="presentation" class="container" width="560" cellpadding="0" cellspacing="0" style="background-color: #FFFFFF; border: 1px solid #EFEFEF; border-radius: 16px; overflow: hidden;">
          <tr>
            <td style="padding: 28px 28px 8px;">
              <p style="margin: 0; font-size: 20px; font-weight: 700; color: #3C6CA8;">SlimDose <span style="color: #1A1A1A;">Peptides</span></p>
              <p style="margin: 4px 0 0; font-size: 11px; color: #8A8A8A; text-transform: uppercase; letter-spacing: 0.16em; font-weight: 600;">Customer Appreciation</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 18px 28px 8px;">
              <p style="margin: 0; font-size: 15px; color: #1A1A1A; line-height: 1.7;">Hi <strong>{{ customer_name }}</strong>,</p>
              <p style="margin: 12px 0 0; font-size: 15px; color: #3D3D3D; line-height: 1.7;">We genuinely appreciate your trust in SlimDose for your peptide research needs. We hope you've had a flawless experience from checkout to delivery.</p>
              <p style="margin: 12px 0 0; font-size: 15px; color: #3D3D3D; line-height: 1.7;">If you have a moment, we would love to hear your feedback or answer any protocol questions you might have.</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 14px 28px 24px;">
              <a href="{{ site_url }}" style="display: inline-block; background-color: #3C6CA8; color: #FFFFFF; text-decoration: none; padding: 12px 22px; border-radius: 8px; font-size: 14px; font-weight: 700;">Visit Customer Hub</a>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 28px; background-color: #F8FAFD; border-top: 1px solid #EFEFEF; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #8A8A8A;">SlimDose Peptides Philippines &middot; {{ site_url }}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
  },
  {
    id: 'tmpl-we-miss-you',
    template_key: 'we-miss-you',
    name: 'Re-engagement Checking In',
    subject: 'Checking in on your peptide protocol — SlimDose',
    description: 'Re-engagement email for inactive accounts or past customers due for a restock.',
    category: 'marketing',
    variables: COMMON_VARIABLES.marketing,
    is_customized: false,
    is_active: true,
    html_content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Checking In</title>
  <style>
    @media only screen and (max-width: 480px) {
      .container { width: 100% !important; padding: 16px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #FFFCF6; font-family: 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" style="padding: 28px 12px;">
        <table role="presentation" class="container" width="560" cellpadding="0" cellspacing="0" style="background-color: #FFFFFF; border: 1px solid #EFEFEF; border-radius: 16px; overflow: hidden;">
          <tr>
            <td style="padding: 28px 28px 8px;">
              <p style="margin: 0; font-size: 20px; font-weight: 700; color: #3C6CA8;">SlimDose <span style="color: #1A1A1A;">Peptides</span></p>
              <p style="margin: 4px 0 0; font-size: 11px; color: #8A8A8A; text-transform: uppercase; letter-spacing: 0.16em; font-weight: 600;">Checking In</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 22px 28px 8px;">
              <h1 style="margin: 0; font-size: 22px; font-weight: 700; color: #1A1A1A;">Hi {{ customer_name }} — how is your protocol going?</h1>
              <p style="margin: 14px 0 0; font-size: 15px; color: #3D3D3D; line-height: 1.7;">It's been a little while since we last connected. We wanted to check in and see if you need any restocks or have questions on reconstitutions and batch purity.</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 16px 28px 20px;">
              <a href="{{ catalog_url }}" style="display: inline-block; background-color: #3C6CA8; color: #FFFFFF; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-size: 14px; font-weight: 700;">See What's New In Stock</a>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 28px; background-color: #F8FAFD; border-top: 1px solid #EFEFEF; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #8A8A8A;">© SlimDose Peptides &middot; <a href="{{ site_url }}" style="color: #3C6CA8;">{{ site_url }}</a></p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
  },
];
