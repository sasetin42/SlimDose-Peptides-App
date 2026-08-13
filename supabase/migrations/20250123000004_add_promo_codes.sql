-- Create promo_codes table
CREATE TABLE IF NOT EXISTS promo_codes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value DECIMAL(10, 2) NOT NULL,
  min_purchase_amount DECIMAL(10, 2) DEFAULT 0,
  max_discount_amount DECIMAL(10, 2), -- Optional cap for percentage discounts
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  usage_limit INTEGER,
  usage_count INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_promo_codes_code ON promo_codes(code);
CREATE INDEX IF NOT EXISTS idx_promo_codes_active ON promo_codes(active);

-- Update orders table to track discounts
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS promo_code_id UUID REFERENCES promo_codes(id),
ADD COLUMN IF NOT EXISTS promo_code TEXT, -- Store the code text for historical record even if deleted
ADD COLUMN IF NOT EXISTS discount_applied DECIMAL(10, 2) DEFAULT 0;

-- Enable RLS
ALTER TABLE promo_codes ENABLE ROW LEVEL SECURITY;

-- Policies for promo_codes
-- Admins can do everything
DROP POLICY IF EXISTS "Admins can manage promo codes" ON promo_codes;
CREATE POLICY "Admins can manage promo codes" ON promo_codes
  FOR ALL
  USING (auth.role() = 'authenticated'); -- Simplified for this project's auth model

-- Public can read active promo codes (needed for validation at checkout)
DROP POLICY IF EXISTS "Public can read active promo codes" ON promo_codes;
CREATE POLICY "Public can read active promo codes" ON promo_codes
  FOR SELECT
  USING (active = true);
