-- Create orders table to store customer orders
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Customer Information
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  
  -- Shipping Address
  shipping_address TEXT NOT NULL,
  shipping_city TEXT NOT NULL,
  shipping_state TEXT NOT NULL,
  shipping_zip_code TEXT NOT NULL,
  shipping_country TEXT NOT NULL,
  
  -- Order Details
  order_items JSONB NOT NULL, -- Array of {product_id, product_name, variation_id, variation_name, quantity, price}
  total_price DECIMAL(10,2) NOT NULL,
  
  -- Payment
  payment_method_id TEXT,
  payment_method_name TEXT,
  payment_status TEXT DEFAULT 'pending', -- pending, paid, failed
  
  -- Order Status
  order_status TEXT DEFAULT 'new', -- new, confirmed, processing, shipped, delivered, cancelled
  notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_orders_customer_email ON orders(customer_email);
CREATE INDEX IF NOT EXISTS idx_orders_customer_phone ON orders(customer_phone);
CREATE INDEX IF NOT EXISTS idx_orders_order_status ON orders(order_status);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_orders_updated_at ON orders;
CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS (optional - adjust based on your security needs)
-- ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Create policy for public insert (customers can create orders)
-- CREATE POLICY "Anyone can create orders" ON orders
--   FOR INSERT
--   TO public
--   WITH CHECK (true);

-- Create policy for authenticated admin read (admins can view orders)
-- CREATE POLICY "Admins can view orders" ON orders
--   FOR SELECT
--   TO authenticated
--   USING (true);

