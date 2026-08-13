-- Add discount pricing fields to product_variations table
ALTER TABLE product_variations 
ADD COLUMN IF NOT EXISTS discount_price DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS discount_active BOOLEAN DEFAULT false;

COMMENT ON COLUMN product_variations.discount_price IS 'Sale/discounted price for this variation';
COMMENT ON COLUMN product_variations.discount_active IS 'Whether the discount is currently active for this variation';
