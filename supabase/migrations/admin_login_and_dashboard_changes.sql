-- =============================================
-- SlimDose Peptides Admin Dashboard & Auth Migration
-- Generated: 2026-06-05
-- =============================================

-- 1. ALTER PRODUCTS FOR PRE-ORDER
ALTER TABLE products ADD COLUMN IF NOT EXISTS pre_order_enabled BOOLEAN DEFAULT false;
ALTER TABLE products ADD COLUMN IF NOT EXISTS pre_order_est_arrival TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS pre_order_restock_date TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS pre_order_note TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS pre_order_max_qty INTEGER DEFAULT 10;

-- 2. CREATE PAGE CONTENTS TABLE
CREATE TABLE IF NOT EXISTS page_contents (
  page_id TEXT PRIMARY KEY,
  content JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Disable RLS on page_contents for easy dev/local mock
ALTER TABLE page_contents DISABLE ROW LEVEL SECURITY;
GRANT ALL ON page_contents TO anon, authenticated;

-- 3. SEED PAGE CONTENTS DEFAULT DATA
INSERT INTO page_contents (page_id, content) VALUES
('home', '{
  "hero_badge_text": "Premium Peptide Solutions",
  "hero_title_prefix": "Premium",
  "hero_title_highlight": "Peptides",
  "hero_title_suffix": "& Essentials",
  "hero_subtext": "From the Lab to You — Simplifying Science, One Dose at a Time.",
  "hero_tagline": "Quality-tested products. Reliable performance. Trusted by our community.",
  "hero_description": "SlimDose Peptides is your all-in-one destination for high-quality peptides, peptide pens, and the essential accessories you need for a smooth and confident wellness routine.",
  "hero_accent_color": "gold-500",
  "seo_title": "SlimDose Peptides - Premium Biotech & Research Solutions",
  "seo_description": "Order premium research-grade peptides, pens, and accessories. High-purity verified with third-party COA laboratory testing."
}'::jsonb),
('about', '{
  "title": "About SlimDose Peptides",
  "subtitle": "Leading Scientific Innovation in Peptide Research",
  "content": "SlimDose Peptides is a premier provider of research-grade peptides and biochemical solutions. We commit ourselves to sourcing the highest quality compounds for laboratory and clinical research applications. Every batch is subject to rigorous quality control processes, including third-party HPLC and Mass Spectrometry analysis to verify identity and purity levels. Our mission is to empower researchers worldwide with reliable, premium products that deliver consistent scientific results.",
  "banner_url": "/assets/logo.jpeg",
  "seo_title": "About Us - SlimDose Peptides Research Lab",
  "seo_description": "Learn about our rigorous testing standards, high-purity guarantees, and mission to advance scientific peptide research."
}'::jsonb),
('contact', '{
  "title": "Contact Authorized Personnel",
  "subtitle": "Get in Touch with our Support Team",
  "email": "support@slimdose.ph",
  "phone": "+63 977 813 2630",
  "whatsapp": "+63 977 813 2630",
  "hours": "Monday - Friday: 9:00 AM - 6:00 PM PHT",
  "telegram_group": "https://t.me/+fGtShIUkbB84YzZl",
  "seo_title": "Contact Us - SlimDose Peptides",
  "seo_description": "Have questions about peptide orders or laboratory results? Contact our customer support team directly."
}'::jsonb),
('shipping_policy', '{
  "title": "Shipping & Fulfillment Policy",
  "content": "All orders are processed within 24-48 business hours. We package our lyophilized peptides in secure, light-protected packaging. For reconstituted solutions (available for Metro Manila J&T/Lalamove delivery only), we ship with medical-grade gel ice packs and insulated thermal bags to preserve peptide stability during transit.\n\nEstimated Delivery Times:\n- Luzon (Metro Manila): 1-2 business days\n- Luzon (Outside NCR): 2-3 business days\n- Visayas & Mindanao: 3-5 business days\n\nShipping rates are calculated automatically at checkout based on region.",
  "seo_title": "Shipping Policy - Safe & Temperature-Controlled Delivery",
  "seo_description": "Read about our cold-chain shipping practices, insulated packaging, and delivery time estimates for Luzon, Visayas, and Mindanao."
}'::jsonb),
('privacy_policy', '{
  "title": "Privacy Policy",
  "content": "At SlimDose Peptides, we prioritize the confidentiality and security of our research clients. This Privacy Policy details how we collect, process, and safeguard your personal information when you use our website. We do not sell or lease your personal information to third parties. All transaction records, delivery data, and communications are encrypted end-to-end to ensure your administrative records remain confidential and secure.",
  "seo_title": "Privacy Policy - SlimDose Peptides",
  "seo_description": "Read our privacy policy to understand how we secure your client transaction data and protect your laboratory records."
}'::jsonb),
('terms_conditions', '{
  "title": "Terms and Conditions",
  "content": "All chemical compounds offered by SlimDose Peptides are strictly for laboratory research and in vitro application models. These products are not intended, nor approved, for human consumption, therapeutic, or diagnostic use. By purchasing, the client agrees to take full responsibility for biological safety compliance, laboratory handling protocols, and legal use within their jurisdiction.",
  "seo_title": "Terms & Conditions - Chemical Research Agreement",
  "seo_description": "Understand our laboratory use agreement, research compliance guidelines, and purchase conditions."
}'::jsonb),
('faq', '{
  "title": "Frequently Asked Questions",
  "subtitle": "Scientific, Shipping, & Ordering FAQs",
  "seo_title": "FAQ - SlimDose Peptides Research Help Center",
  "seo_description": "Find answers to questions regarding reconstitution ratios, storage temperatures, J&T courier times, and payment options."
}'::jsonb),
('footer', '{
  "copyright": "SlimDose Peptides. All rights reserved.",
  "about_text": "Premium research-grade peptide solutions verified by third-party analytics. Strictly for laboratory research use."
}'::jsonb),
('header', '{
  "logo_text": "SlimDose Peptides",
  "announcement_text": "⚡ FREE cold-chain shipping for Metro Manila orders over ₱5,000! ❄️",
  "announcement_active": true
}'::jsonb)
ON CONFLICT (page_id) DO UPDATE 
SET content = EXCLUDED.content, updated_at = NOW();

-- 4. CREATE ADMIN USERS TABLE
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('super_admin', 'admin', 'content_editor', 'order_manager')),
  name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Disable RLS on admin_users for easy dev
ALTER TABLE admin_users DISABLE ROW LEVEL SECURITY;
GRANT ALL ON admin_users TO anon, authenticated;

-- 5. SEED ADMIN USERS
INSERT INTO admin_users (email, password_hash, role, name) VALUES
('superadmin@slimdose.ph', 'superadmin2026', 'super_admin', 'Super Admin'),
('admin@slimdose.ph', 'admin2026', 'admin', 'Store Admin'),
('editor@slimdose.ph', 'editor2026', 'content_editor', 'Content Editor'),
('ordermanager@slimdose.ph', 'orders2026', 'order_manager', 'Order Manager')
ON CONFLICT (email) DO UPDATE 
SET password_hash = EXCLUDED.password_hash, role = EXCLUDED.role, name = EXCLUDED.name;

-- 6. CREATE AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_email TEXT NOT NULL,
  actor_role TEXT NOT NULL,
  action TEXT NOT NULL,
  details TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Disable RLS on audit_logs for easy dev
ALTER TABLE audit_logs DISABLE ROW LEVEL SECURITY;
GRANT ALL ON audit_logs TO anon, authenticated;
