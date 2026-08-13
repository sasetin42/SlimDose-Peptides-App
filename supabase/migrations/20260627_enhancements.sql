-- ========================================================
-- SlimDose Website Enhancements SQL Migration Script
-- Date: 2026-06-27
-- Disable RLS and grant permissions for simple development
-- ========================================================

-- 1. Create peptalk_videos Table
CREATE TABLE IF NOT EXISTS peptalk_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  video_url TEXT NOT NULL,
  thumbnail_url TEXT,
  category TEXT DEFAULT 'Educational',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Add Dosing Guide, Peptide Calculator & PepTalk columns to products
ALTER TABLE products ADD COLUMN IF NOT EXISTS dosing_guide TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS dosage_chart_url TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS usage_notes TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS linked_peptalk_id UUID REFERENCES peptalk_videos(id) ON DELETE SET NULL;

-- 3. Add Multi-Branch Stock columns to products and variations
ALTER TABLE products ADD COLUMN IF NOT EXISTS stock_manila INTEGER DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS stock_davao INTEGER DEFAULT 0;

ALTER TABLE product_variations ADD COLUMN IF NOT EXISTS stock_manila INTEGER DEFAULT 0;
ALTER TABLE product_variations ADD COLUMN IF NOT EXISTS stock_davao INTEGER DEFAULT 0;

-- Backfill branch stocks from stock_quantity (Manila gets initial stock)
UPDATE products SET stock_manila = COALESCE(stock_quantity, 0) WHERE stock_manila = 0 AND stock_davao = 0;
UPDATE product_variations SET stock_manila = COALESCE(stock_quantity, 0) WHERE stock_manila = 0 AND stock_davao = 0;

-- 4. Create product_reviews Table
CREATE TABLE IF NOT EXISTS product_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  customer_name TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT NOT NULL,
  profile_image_url TEXT,
  is_verified_purchase BOOLEAN DEFAULT false,
  approved BOOLEAN DEFAULT false,
  review_date TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Create Customers Table (CRM & Accounts)
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  shipping_address TEXT,
  shipping_barangay TEXT,
  shipping_city TEXT,
  shipping_state TEXT,
  shipping_zip_code TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Add customer_id, fulfillment_branch, hitpay_payment_request_id columns to orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id) ON DELETE SET NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS fulfillment_branch TEXT DEFAULT 'Manila';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS hitpay_payment_request_id TEXT;

-- 7. Create invoice_verifications Table
CREATE TABLE IF NOT EXISTS invoice_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  proof_url TEXT NOT NULL,
  status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT
);

-- 8. Create Email restock_settings Table
CREATE TABLE IF NOT EXISTS restock_settings (
  id TEXT PRIMARY KEY DEFAULT 'global_settings',
  enabled BOOLEAN DEFAULT true,
  interval_days INTEGER DEFAULT 30,
  email_subject TEXT DEFAULT 'Time to restock your SlimDose supplies!',
  email_template TEXT DEFAULT 'Hello {name},\n\nIt''s been about {interval} days since your last purchase of {products}. You may be ready to restock your supplies.\n\nVisit SlimDose Peptides to place a reorder quickly!\n\nBest regards,\nSlimDose Peptides Team',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default global settings if not exists
INSERT INTO restock_settings (id, enabled, interval_days) 
VALUES ('global_settings', true, 30)
ON CONFLICT (id) DO NOTHING;

-- 9. Create restock_reminders Table
CREATE TABLE IF NOT EXISTS restock_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  sent_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================================
-- DATABASE TRIGGERS FOR STOCK UPDATES
-- ========================================================

-- Trigger to automatically calculate total stock_quantity from branch stocks
CREATE OR REPLACE FUNCTION update_total_stock()
RETURNS TRIGGER AS $$
BEGIN
  NEW.stock_quantity = COALESCE(NEW.stock_manila, 0) + COALESCE(NEW.stock_davao, 0);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_product_total_stock ON products;
CREATE TRIGGER trigger_update_product_total_stock
BEFORE INSERT OR UPDATE ON products
FOR EACH ROW EXECUTE FUNCTION update_total_stock();

DROP TRIGGER IF EXISTS trigger_update_variation_total_stock ON product_variations;
CREATE TRIGGER trigger_update_variation_total_stock
BEFORE INSERT OR UPDATE ON product_variations
FOR EACH ROW EXECUTE FUNCTION update_total_stock();

-- Trigger to decrement stock per-branch based on fulfillment_branch
CREATE OR REPLACE FUNCTION decrement_stock_on_order()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  item JSONB;
  v_product_id UUID;
  v_variation_id UUID;
  v_quantity INTEGER;
  v_branch TEXT;
BEGIN
  v_branch := COALESCE(NEW.fulfillment_branch, 'Manila');

  FOR item IN SELECT * FROM jsonb_array_elements(NEW.order_items)
  LOOP
    v_product_id := (item->>'product_id')::UUID;
    v_variation_id := (item->>'variation_id')::UUID;
    v_quantity := (item->>'quantity')::INTEGER;

    IF v_variation_id IS NOT NULL THEN
      IF v_branch = 'Davao' THEN
        UPDATE product_variations
        SET stock_davao = GREATEST(0, stock_davao - v_quantity)
        WHERE id = v_variation_id;
      ELSE
        UPDATE product_variations
        SET stock_manila = GREATEST(0, stock_manila - v_quantity)
        WHERE id = v_variation_id;
      END IF;
    ELSE
      IF v_branch = 'Davao' THEN
        UPDATE products
        SET stock_davao = GREATEST(0, stock_davao - v_quantity)
        WHERE id = v_product_id;
      ELSE
        UPDATE products
        SET stock_manila = GREATEST(0, stock_manila - v_quantity)
        WHERE id = v_product_id;
      END IF;
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

-- Ensure the decrement stock trigger on orders exists
DROP TRIGGER IF EXISTS trigger_decrement_stock ON orders;
CREATE TRIGGER trigger_decrement_stock
AFTER INSERT ON orders
FOR EACH ROW
EXECUTE FUNCTION decrement_stock_on_order();

-- ========================================================
-- DISABLE ROW LEVEL SECURITY (RLS) ON NEW TABLES
-- ========================================================

ALTER TABLE peptalk_videos DISABLE ROW LEVEL SECURITY;
ALTER TABLE product_reviews DISABLE ROW LEVEL SECURITY;
ALTER TABLE customers DISABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_verifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE restock_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE restock_reminders DISABLE ROW LEVEL SECURITY;

-- ========================================================
-- GRANT ACCESS PERMISSIONS
-- ========================================================

GRANT ALL ON peptalk_videos TO anon, authenticated;
GRANT ALL ON product_reviews TO anon, authenticated;
GRANT ALL ON customers TO anon, authenticated;
GRANT ALL ON invoice_verifications TO anon, authenticated;
GRANT ALL ON restock_settings TO anon, authenticated;
GRANT ALL ON restock_reminders TO anon, authenticated;

-- ========================================================
-- TRIGGERS FOR UPDATED_AT
-- ========================================================

DROP TRIGGER IF EXISTS update_peptalk_videos_updated_at ON peptalk_videos;
CREATE TRIGGER update_peptalk_videos_updated_at BEFORE UPDATE ON peptalk_videos
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_customers_updated_at ON customers;
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
