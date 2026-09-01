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
    { key: 'promo_code', label: 'Promo Code', example: 'SLIM10' },
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
    { key: 'customer_name', label: 'Customer Name', example: 'Maria Santos' },
    { key: 'otp_code', label: '6-Digit OTP PIN', example: '849201' },
    { key: 'expiry_minutes', label: 'Expiry (Minutes)', example: '15' },
    { key: 'account_url', label: 'Account URL', example: 'https://slimdoseph.com' },
    { key: 'support_email', label: 'Support Email', example: 'info@slimdoseph.com' },
    { key: 'site_url', label: 'Store URL', example: 'https://slimdoseph.com' },
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
    id: 'tmpl-order-confirmation',
    template_key: 'order-confirmation',
    name: 'Order Confirmation',
    subject: 'Order Confirmed: {{ order_number }} — SlimDose Peptides',
    description: 'Sent immediately when an order is created by the customer.',
    category: 'transactional',
    variables: COMMON_VARIABLES.transactional,
    is_customized: false,
    is_active: true,
    html_content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Order Confirmation</title>
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
              <p style="margin: 4px 0 0; font-size: 11px; color: #8A8A8A; text-transform: uppercase; letter-spacing: 0.16em; font-weight: 600;">Order Confirmation</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 22px 28px 8px;">
              <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #1A1A1A; letter-spacing: -0.02em;">Thank you, {{ customer_name }}.</h1>
              <p style="margin: 14px 0 0; font-size: 15px; color: #3D3D3D; line-height: 1.7;">We have successfully received your order <strong style="color: #3C6CA8;">{{ order_number }}</strong>. Our team is preparing your research package with cold-chain protection.</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 16px 28px;">
              <div style="background-color: #FAF8F5; border-radius: 12px; padding: 18px 20px;">
                <p style="margin: 0 0 10px; font-size: 12px; font-weight: 700; color: #666; text-transform: uppercase; letter-spacing: 0.1em;">Order Summary</p>
                <pre style="margin: 0; font-family: inherit; font-size: 14px; color: #222; white-space: pre-wrap; line-height: 1.6;">{{ items_summary }}</pre>
                <div style="margin-top: 14px; pt-3; border-top: 1px solid #E6E1DA; font-size: 15px; font-weight: 700; color: #1A1A1A; display: flex; justify-content: space-between;">
                  <span>Total Amount</span>
                  <span style="color: #3C6CA8;">₱{{ total_price }}</span>
                </div>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding: 16px 28px 24px;">
              <p style="margin: 0; font-size: 13px; color: #737373; line-height: 1.6;">Payment Method: <strong>{{ payment_method }}</strong><br>Delivery to: <strong>{{ shipping_address }}</strong></p>
              <p style="margin: 16px 0 0; font-size: 13px; color: #737373;">Need assistance? Reply directly to this email or visit our <a href="{{ site_url }}" style="color: #3C6CA8; text-decoration: none; font-weight: 600;">Customer Portal</a>.</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 18px 28px; background-color: #FAF8F5; border-top: 1px solid #EFEFEF; text-align: center;">
              <p style="margin: 0; font-size: 11px; color: #A0A0A0;">© SlimDose Peptides Philippines. All batches third-party HPLC/MS verified.</p>
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
    id: 'tmpl-payment-confirmed',
    template_key: 'payment-confirmed',
    name: 'Payment Confirmed',
    subject: 'Payment Verified for Order {{ order_number }}',
    description: 'Sent when admin confirms and approves payment proof for an order.',
    category: 'transactional',
    variables: COMMON_VARIABLES.transactional,
    is_customized: false,
    is_active: true,
    html_content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment Confirmed</title>
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
              <p style="margin: 4px 0 0; font-size: 11px; color: #8A8A8A; text-transform: uppercase; letter-spacing: 0.16em; font-weight: 600;">Payment Verification</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 22px 28px 8px;">
              <div style="display: inline-block; background-color: #ECFDF5; color: #047857; font-size: 12px; font-weight: 700; padding: 4px 12px; border-radius: 9999px; margin-bottom: 12px;">
                ✓ Payment Received
              </div>
              <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #1A1A1A; letter-spacing: -0.02em;">Payment verified for order {{ order_number }}</h1>
              <p style="margin: 14px 0 0; font-size: 15px; color: #3D3D3D; line-height: 1.7;">Your payment of <strong>₱{{ total_price }}</strong> via {{ payment_method }} has been verified. Your order is now queued for immediate fulfillment and dispatch.</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 16px 28px 24px;">
              <p style="margin: 0; font-size: 13px; color: #737373;">We will send you courier tracking information as soon as your parcel is dispatched.</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 18px 28px; background-color: #FAF8F5; border-top: 1px solid #EFEFEF; text-align: center;">
              <p style="margin: 0; font-size: 11px; color: #A0A0A0;">© SlimDose Peptides Philippines. High purity research solutions.</p>
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
    id: 'tmpl-order-dispatched',
    template_key: 'order-dispatched',
    name: 'Order Dispatched (Tracking)',
    subject: 'Your SlimDose Order {{ order_number }} Has Been Dispatched!',
    description: 'Sent when the order is fulfilled and assigned a shipping tracking number.',
    category: 'transactional',
    variables: COMMON_VARIABLES.transactional,
    is_customized: false,
    is_active: true,
    html_content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Order Dispatched</title>
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
              <p style="margin: 4px 0 0; font-size: 11px; color: #8A8A8A; text-transform: uppercase; letter-spacing: 0.16em; font-weight: 600;">Shipment Dispatched</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 22px 28px 8px;">
              <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #1A1A1A; letter-spacing: -0.02em;">Your package is on its way, {{ customer_name }}.</h1>
              <p style="margin: 14px 0 0; font-size: 15px; color: #3D3D3D; line-height: 1.7;">Order <strong style="color: #3C6CA8;">{{ order_number }}</strong> has been safely packaged and handed over to <strong>{{ shipping_provider }}</strong>.</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 16px 28px;">
              <div style="background-color: #EFF6FF; border: 1px solid #BFDBFE; border-radius: 12px; padding: 18px 20px; text-align: center;">
                <p style="margin: 0; font-size: 12px; color: #1E40AF; text-transform: uppercase; letter-spacing: 0.14em; font-weight: 700;">Tracking Number</p>
                <p style="margin: 8px 0 0; font-size: 20px; font-weight: 900; color: #1E3A8A; letter-spacing: 0.08em; font-family: monospace;">{{ tracking_number }}</p>
                <a href="{{ tracking_url }}" style="display: inline-block; margin-top: 14px; background-color: #3C6CA8; color: #FFFFFF; text-decoration: none; font-weight: 700; font-size: 13px; padding: 10px 22px; border-radius: 8px;">
                  Track Real-Time Status →
                </a>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding: 16px 28px 24px;">
              <p style="margin: 0; font-size: 13px; color: #737373;">Delivery address: {{ shipping_address }}</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 18px 28px; background-color: #FAF8F5; border-top: 1px solid #EFEFEF; text-align: center;">
              <p style="margin: 0; font-size: 11px; color: #A0A0A0;">© SlimDose Peptides Philippines. All parcels insulated for cold-chain safety.</p>
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
    name: 'Member Welcome & Promo',
    subject: 'Welcome to SlimDose — Enjoy {{ discount_percentage }} off your first order!',
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
                <p style="margin: 0; font-size: 12px; color: #15803D; text-transform: uppercase; letter-spacing: 0.18em; font-weight: 800;">Your Welcome Discount Code</p>
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
  {
    id: 'tmpl-customer-otp-login',
    template_key: 'customer-otp-login',
    name: 'Customer Sign-In OTP Code',
    subject: '🔑 [SlimDose] Your 6-Digit Sign-In Code: {{ otp_code }}',
    description: 'Instant passwordless authentication code sent when a member signs in.',
    category: 'customer',
    variables: COMMON_VARIABLES.customer,
    is_customized: false,
    is_active: true,
    html_content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SlimDose Sign-In Code</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F8FAFC; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" style="padding: 36px 16px;">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background-color: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05);">
          <tr>
            <td style="padding: 32px 32px 24px; background: linear-gradient(135deg, #0F172A 0%, #1E3A8A 50%, #0F172A 100%);">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <p style="margin: 0; font-size: 24px; font-weight: 900; color: #FFFFFF; letter-spacing: -0.02em;">
                      SlimDose <span style="color: #60A5FA; font-weight: 700;">Peptides</span>
                    </p>
                    <p style="margin: 6px 0 0; font-size: 11px; color: #93C5FD; text-transform: uppercase; letter-spacing: 0.18em; font-weight: 800;">
                      Member Access &amp; Authentication
                    </p>
                  </td>
                  <td align="right" valign="top">
                    <span style="display: inline-block; padding: 6px 12px; background-color: rgba(59, 130, 246, 0.2); border: 1px solid rgba(96, 165, 250, 0.3); border-radius: 9999px; color: #93C5FD; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em;">
                      🔑 Secure Login
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px 32px 16px;">
              <h1 style="margin: 0; font-size: 22px; font-weight: 900; color: #0F172A; line-height: 1.3;">
                Your Single-Use Sign-In Code
              </h1>
              <p style="margin: 12px 0 0; font-size: 14px; color: #475569; line-height: 1.7;">
                Hello <strong>{{ customer_name }}</strong>,<br>
                Use the 6-digit verification code below to authorize your sign-in to the SlimDose Portal.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 12px 32px 24px;" align="center">
              <div style="background: linear-gradient(135deg, #F1F5F9 0%, #E2E8F0 100%); border: 2px dashed #94A3B8; border-radius: 16px; padding: 24px; text-align: center; max-width: 380px;">
                <p style="margin: 0 0 8px; font-size: 11px; font-weight: 800; color: #475569; text-transform: uppercase; letter-spacing: 0.15em;">
                  6-Digit One-Time PIN
                </p>
                <div style="font-family: 'Courier New', monospace, Courier; font-size: 38px; font-weight: 900; letter-spacing: 0.35em; color: #1E3A8A; padding-left: 0.35em; margin: 8px 0;">
                  {{ otp_code }}
                </div>
                <p style="margin: 10px 0 0; font-size: 11px; color: #64748B; font-weight: 600;">
                  ⏱️ Valid for <strong>{{ expiry_minutes }} minutes</strong> &middot; Do not share with anyone
                </p>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 32px 28px;">
              <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 14px 16px;">
                <p style="margin: 0; font-size: 12px; color: #64748B; line-height: 1.6;">
                  🔒 <strong>Passwordless Security:</strong> SlimDose uses direct email OTP verification to protect your account discounts, order history, and lab certificates.
                </p>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 32px; background-color: #F8FAFC; border-top: 1px solid #E2E8F0; text-align: center;">
              <p style="margin: 0; font-size: 11px; color: #94A3B8; font-weight: 500;">
                © SlimDose Peptides Philippines &middot; Support: <a href="mailto:{{ support_email }}" style="color: #3C6CA8;">{{ support_email }}</a>
              </p>
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
    id: 'tmpl-customer-welcome-registration',
    template_key: 'customer-welcome-registration',
    name: 'Customer Welcome & Verification PIN',
    subject: '🎉 Welcome to SlimDose — Your 6-Digit Code: {{ otp_code }}',
    description: 'Sent when a new user creates an account and receives their first verification PIN.',
    category: 'customer',
    variables: COMMON_VARIABLES.customer,
    is_customized: false,
    is_active: true,
    html_content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to SlimDose</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F8FAFC; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" style="padding: 36px 16px;">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background-color: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05);">
          <tr>
            <td style="padding: 32px 32px 24px; background: linear-gradient(135deg, #0F172A 0%, #1E3A8A 50%, #0F172A 100%);">
              <p style="margin: 0; font-size: 24px; font-weight: 900; color: #FFFFFF; letter-spacing: -0.02em;">
                SlimDose <span style="color: #60A5FA; font-weight: 700;">Peptides</span>
              </p>
              <p style="margin: 6px 0 0; font-size: 11px; color: #93C5FD; text-transform: uppercase; letter-spacing: 0.18em; font-weight: 800;">
                Account Registration &amp; Activation
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px 32px 16px;">
              <h1 style="margin: 0; font-size: 22px; font-weight: 900; color: #0F172A; line-height: 1.3;">
                Welcome to SlimDose, {{ customer_name }}! 🎉
              </h1>
              <p style="margin: 12px 0 0; font-size: 14px; color: #475569; line-height: 1.7;">
                Thank you for creating your account. Please enter the single-use 6-digit security code below to complete your registration and activate your Gold Tier benefits.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 12px 32px 24px;" align="center">
              <div style="background: linear-gradient(135deg, #F1F5F9 0%, #E2E8F0 100%); border: 2px dashed #94A3B8; border-radius: 16px; padding: 24px; text-align: center; max-width: 380px;">
                <p style="margin: 0 0 8px; font-size: 11px; font-weight: 800; color: #475569; text-transform: uppercase; letter-spacing: 0.15em;">
                  6-Digit Activation PIN
                </p>
                <div style="font-family: 'Courier New', monospace, Courier; font-size: 38px; font-weight: 900; letter-spacing: 0.35em; color: #1E3A8A; padding-left: 0.35em; margin: 8px 0;">
                  {{ otp_code }}
                </div>
                <p style="margin: 10px 0 0; font-size: 11px; color: #64748B; font-weight: 600;">
                  ⏱️ Valid for <strong>{{ expiry_minutes }} minutes</strong>
                </p>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 32px; background-color: #F8FAFC; border-top: 1px solid #E2E8F0; text-align: center;">
              <p style="margin: 0; font-size: 11px; color: #94A3B8; font-weight: 500;">
                © SlimDose Peptides Philippines &middot; Support: <a href="mailto:{{ support_email }}" style="color: #3C6CA8;">{{ support_email }}</a>
              </p>
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
    id: 'tmpl-password-reset-otp',
    template_key: 'password-reset-otp',
    name: 'Password Recovery Code',
    subject: '🔐 [SlimDose] Your Password Reset Code: {{ otp_code }}',
    description: 'Sent when a user requests password reset or account recovery.',
    category: 'customer',
    variables: COMMON_VARIABLES.customer,
    is_customized: false,
    is_active: true,
    html_content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SlimDose Password Recovery</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F8FAFC; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" style="padding: 36px 16px;">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background-color: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05);">
          <tr>
            <td style="padding: 32px 32px 24px; background: linear-gradient(135deg, #0F172A 0%, #1E3A8A 50%, #0F172A 100%);">
              <p style="margin: 0; font-size: 24px; font-weight: 900; color: #FFFFFF; letter-spacing: -0.02em;">
                SlimDose <span style="color: #60A5FA; font-weight: 700;">Peptides</span>
              </p>
              <p style="margin: 6px 0 0; font-size: 11px; color: #93C5FD; text-transform: uppercase; letter-spacing: 0.18em; font-weight: 800;">
                Account Recovery &amp; Security
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px 32px 16px;">
              <h1 style="margin: 0; font-size: 22px; font-weight: 900; color: #0F172A; line-height: 1.3;">
                Password Reset Code
              </h1>
              <p style="margin: 12px 0 0; font-size: 14px; color: #475569; line-height: 1.7;">
                Hello <strong>{{ customer_name }}</strong>,<br>
                We received a request to recover your SlimDose account. Use the code below to proceed:
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 12px 32px 24px;" align="center">
              <div style="background: linear-gradient(135deg, #F1F5F9 0%, #E2E8F0 100%); border: 2px dashed #94A3B8; border-radius: 16px; padding: 24px; text-align: center; max-width: 380px;">
                <div style="font-family: 'Courier New', monospace, Courier; font-size: 38px; font-weight: 900; letter-spacing: 0.35em; color: #1E3A8A; padding-left: 0.35em; margin: 8px 0;">
                  {{ otp_code }}
                </div>
                <p style="margin: 10px 0 0; font-size: 11px; color: #64748B; font-weight: 600;">
                  ⏱️ Valid for <strong>{{ expiry_minutes }} minutes</strong>
                </p>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 32px; background-color: #F8FAFC; border-top: 1px solid #E2E8F0; text-align: center;">
              <p style="margin: 0; font-size: 11px; color: #94A3B8; font-weight: 500;">
                © SlimDose Peptides Philippines &middot; Support: <a href="mailto:{{ support_email }}" style="color: #3C6CA8;">{{ support_email }}</a>
              </p>
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
