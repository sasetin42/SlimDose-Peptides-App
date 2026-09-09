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
  instagram_url?: string;
  facebook_url?: string;
  // SEO & Meta
  meta_title?: string;
  meta_description?: string;
  meta_keywords?: string;
  // SMTP & Transactional Email Settings
  smtp_enabled?: string;
  smtp_provider?: string;
  smtp_host?: string;
  smtp_port?: string;
  smtp_encryption_type?: 'none' | 'ssl' | 'starttls' | string;
  smtp_secure?: string;
  smtp_auth_required?: string;
  smtp_user?: string;
  smtp_pass?: string;
  smtp_from_email?: string;
  smtp_from_name?: string;
  smtp_reply_to_email?: string;
  smtp_admin_email?: string;
  smtp_send_order_receipt?: string;
  smtp_send_admin_alert?: string;
  smtp_send_status_update?: string;
  smtp_last_tested_at?: string;
  smtp_last_sent_at?: string;
  smtp_status?: 'connected' | 'testing' | 'sending' | 'disconnected' | 'auth_failed' | 'config_error' | 'sending_failed' | string;
  smtp_last_error?: string;

  // Extended Branding & Logos
  site_logo_dark?: string;
  site_logo_light?: string;
  site_favicon?: string;
  site_email_logo?: string;
  site_invoice_logo?: string;
  site_admin_logo?: string;
  brand_primary_color?: string;
  brand_secondary_color?: string;
  brand_accent_color?: string;
  brand_font_family?: string;

  // Extended General & Regional
  timezone?: string;
  date_format?: string;
  time_format?: string;
  unit_system?: string;
  number_format?: string;
  currency_symbol?: string;

  // Company Information
  company_legal_name?: string;
  company_trade_name?: string;
  company_tin?: string;
  company_reg_number?: string;
  company_address?: string;
  company_city?: string;
  company_province?: string;
  company_postal_code?: string;
  company_country?: string;
  company_phone?: string;
  company_email?: string;
  company_website?: string;

  // Contact Profiles & Departments
  contact_sales_email?: string;
  contact_sales_phone?: string;
  contact_billing_email?: string;
  contact_tech_email?: string;
  contact_escalation_email?: string;

  // Payment Links & Gateway Diagnostics
  payment_links_enabled?: string;
  payment_test_mode?: string;
  payment_auto_confirm?: string;
  payment_receipt_required?: string;
  custom_checkout_redirect?: string;

  // Platform & Access
  maintenance_mode?: string;
  maintenance_heading?: string;
  maintenance_message?: string;
  maintenance_eta?: string;
  maintenance_ip_whitelist?: string;
  user_registration_enabled?: string;
  guest_checkout_enabled?: string;
  session_timeout_minutes?: string;
  max_upload_size_mb?: string;

  // User & Roles
  default_user_role?: string;
  allow_role_switching?: string;
  require_admin_approval?: string;

  // Security & Authentication
  security_2fa_required?: string;
  security_brute_force_protection?: string;
  security_max_login_attempts?: string;
  security_lockout_duration_mins?: string;
  password_min_length?: string;
  password_require_symbols?: string;
  password_require_numbers?: string;
  security_ip_whitelist?: string;
  security_ip_blacklist?: string;

  // API & Webhooks
  api_enabled?: string;
  webhook_url?: string;
  webhook_secret?: string;
  webhook_events?: string;

  // Storage & Media
  storage_provider?: string;
  storage_auto_compress?: string;
  storage_webp_conversion?: string;
  storage_max_image_dim?: string;

  // CDN & Caching
  cdn_enabled?: string;
  cdn_provider?: string;
  cdn_domain?: string;
  cdn_cache_ttl?: string;

  // Database & Backup
  backup_auto_enabled?: string;
  backup_frequency?: string;
  backup_retention_days?: string;
  backup_last_run?: string;

  // Tax & Financial Settings
  tax_enabled?: string;
  tax_rate_percent?: string;
  tax_inclusive?: string;
  invoice_prefix?: string;
  receipt_prefix?: string;
  invoice_start_number?: string;
  payment_terms_days?: string;

  // Configuration Snapshots & Auditing
  settings_snapshots_json?: string;
  audit_logs_json?: string;
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
