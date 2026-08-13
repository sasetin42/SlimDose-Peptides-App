-- Global Discounts table
-- Allows admin to set a site-wide discount on all products with an exclusion list
CREATE TABLE IF NOT EXISTS global_discounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL DEFAULT 'Site-wide Discount',
  discount_type TEXT NOT NULL DEFAULT 'percentage' CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value NUMERIC NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT false,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  excluded_product_ids UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Allow public read access
ALTER TABLE global_discounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access on global_discounts"
  ON global_discounts FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow public insert on global_discounts"
  ON global_discounts FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Allow public update on global_discounts"
  ON global_discounts FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public delete on global_discounts"
  ON global_discounts FOR DELETE
  TO anon, authenticated
  USING (true);
