// Peptide Product Types
export interface Product {
  id: string;
  name: string;
  description: string;
  category: string;
  base_price: number;
  raw_price: number;
  discount_price: number | null;
  discount_start_date: string | null;
  discount_end_date: string | null;
  discount_active: boolean;

  // Peptide-specific fields
  purity_percentage: number;
  molecular_weight: string | null;
  cas_number: string | null;
  sequence: string | null;
  storage_conditions: string;
  inclusions: string[] | null;

  // Stock and availability
  stock_quantity: number;
  stock_manila?: number;
  stock_davao?: number;
  sales_count?: number;
  available: boolean;
  featured: boolean;

  // Images and metadata
  image_url: string | null;
  safety_sheet_url: string | null;
  coa_url: string | null;

  // Pre-order fields
  pre_order_enabled: boolean;
  pre_order_est_arrival: string | null;
  pre_order_restock_date: string | null;
  pre_order_note: string | null;
  pre_order_max_qty: number;

  slug: string;

  created_at: string;
  updated_at: string;

  // Dosing instructions
  dosing_guide?: string;
  dosage_chart_url?: string;
  usage_notes?: string;
  linked_peptalk_id?: string | null;

  // Relations
  variations?: ProductVariation[];
  bundle_tiers?: ProductBundleTier[];
}

export interface Protocol {
  id: string;
  name: string;
  category: string;
  dosage: string;
  frequency: string;
  duration: string;
  notes: string[] | null;
  storage: string;
  active: boolean;
  sort_order: number;
  product_id: string | null;
  image_url: string | null;
  file_url: string | null;
  content_type: string;
  created_at: string;
  updated_at: string;
}

export interface ProductBundleTier {
  id: string;
  product_id: string;
  min_quantity: number;
  discount_percentage: number;
  active: boolean;
  most_popular: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProductVariation {
  id: string;
  product_id: string;
  name: string;
  quantity_mg: number;
  price: number;
  cost_price: number;
  discount_price: number | null;
  discount_active: boolean;
  stock_quantity: number;
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  sort_order: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PaymentMethod {
  id: string;
  name: string;
  account_number: string;
  account_name: string;
  qr_code_url: string;
  active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface SiteSetting {
  id: string;
  value: string;
  type: string;
  description: string | null;
  updated_at: string;
}

export interface SiteSettings {
  site_name: string;
  site_logo: string;
  site_description: string;
  currency: string;
  currency_code: string;
  hero_badge_text?: string;
  hero_title_prefix?: string;
  hero_title_highlight?: string;
  hero_title_suffix?: string;
  hero_subtext?: string;
  hero_tagline?: string;
  hero_description?: string;
  hero_accent_color?: string;
  // Promo Popup
  popup_enabled?: string;
  popup_title?: string;
  popup_description?: string;
  popup_link?: string;
  popup_image?: string;
  popup_countdown_enabled?: string;
  popup_countdown_ends_at?: string;
  popup_countdown_auto_disable?: string;
  popup_display_behavior?: string;
  popup_page_filter?: string;
  popup_delay_seconds?: string;
  popup_close_on_outside_click?: string;
  // Important Notice Modal Settings
  notice_title?: string;
  notice_subtitle?: string;
  notice_disclaimer_p1?: string;
  notice_disclaimer_p2?: string;
  notice_consult_text?: string;
  notice_warning_pill?: string;
  notice_order_days?: string;
  notice_cutoff_time?: string;
  notice_courier?: string;
  notice_weekend_orders?: string;
  notice_agree_button_text?: string;
  // Social & Community Links
  community_telegram_url?: string;
  support_telegram_url?: string;
  support_email?: string;
  support_phone?: string;
  contact_phone?: string;
  contact_whatsapp?: string;
  contact_inquiry_text?: string;
  operating_hours?: string;
  instagram_url?: string;
  facebook_url?: string;
  // SEO & Meta
  meta_title?: string;
  meta_description?: string;
  meta_keywords?: string;
}

// Cart Types
export interface CartItem {
  product: Product;
  variation?: ProductVariation;
  quantity: number;
  price: number;
}

// Order Types
export interface OrderDetails {
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  shipping_address: string;
  payment_method: string;
  notes?: string;
  promo_code?: string;
  discount_applied?: number;
}

export interface GlobalDiscount {
  id: string;
  name: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  active: boolean;
  start_date?: string;
  end_date?: string;
  excluded_product_ids: string[];
  created_at: string;
  updated_at: string;
}

export interface PromoCode {
  id: string;
  code: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  min_purchase_amount: number;
  max_discount_amount?: number;
  start_date?: string;
  end_date?: string;
  usage_limit?: number;
  usage_count: number;
  active: boolean;
  created_at: string;
}
