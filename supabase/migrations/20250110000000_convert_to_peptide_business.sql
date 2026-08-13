-- Migration: Convert cafe business to peptide sales business
-- Drop old tables and create new peptide-specific schema

-- Drop existing tables (in correct order due to foreign keys)
DROP TABLE IF EXISTS add_ons CASCADE;
DROP TABLE IF EXISTS variations CASCADE;
DROP TABLE IF EXISTS menu_items CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS payment_methods CASCADE;
DROP TABLE IF EXISTS site_settings CASCADE;

-- Create categories table for peptide types
CREATE TABLE categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  icon TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create peptide products table
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL REFERENCES categories(id),
  base_price DECIMAL(10,2) NOT NULL,
  discount_price DECIMAL(10,2),
  discount_start_date TIMESTAMPTZ,
  discount_end_date TIMESTAMPTZ,
  discount_active BOOLEAN DEFAULT false,
  
  -- Peptide-specific fields
  purity_percentage DECIMAL(5,2) DEFAULT 99.00,
  molecular_weight TEXT,
  cas_number TEXT,
  sequence TEXT,
  storage_conditions TEXT DEFAULT 'Store at -20°C',
  
  -- Stock and availability
  stock_quantity INTEGER DEFAULT 0,
  available BOOLEAN DEFAULT true,
  featured BOOLEAN DEFAULT false,
  
  -- Images and metadata
  image_url TEXT,
  safety_sheet_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create product variations table (different sizes/quantities)
CREATE TABLE product_variations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name TEXT NOT NULL, -- e.g., "5mg", "10mg", "50mg"
  quantity_mg DECIMAL(10,2) NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  stock_quantity INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create payment methods table
CREATE TABLE payment_methods (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  account_number TEXT NOT NULL,
  account_name TEXT NOT NULL,
  qr_code_url TEXT,
  active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create site settings table
CREATE TABLE site_settings (
  id TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  type TEXT DEFAULT 'text',
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default categories for peptides
INSERT INTO categories (id, name, icon, sort_order, active) VALUES
('all', 'All Products', 'Grid', 0, true),
('research', 'Growth & Hormones', 'FlaskConical', 1, true),
('cosmetic', 'Anti-Aging & Skin', 'Sparkles', 2, true),
('performance', 'Athletic Performance', 'Dumbbell', 3, true),
('healing', 'Recovery & Repair', 'Heart', 4, true),
('cognitive', 'Brain & Focus', 'Brain', 5, true);

-- Insert sample peptide products
INSERT INTO products (name, description, category, base_price, purity_percentage, molecular_weight, cas_number, sequence, featured, available, stock_quantity) VALUES
('BPC-157', 'Body Protection Compound-157 is a synthetic peptide known for its regenerative properties and tissue repair capabilities.', 'healing', 45.00, 99.5, '1419.55 g/mol', '137525-51-0', 'GEPPPGKPADDAGLV', true, true, 100),
('TB-500', 'Thymosin Beta-4 peptide that promotes healing, cell migration, and angiogenesis. Popular for injury recovery.', 'healing', 55.00, 99.0, '4963.44 g/mol', '77591-33-4', 'SDKPDMAEIEKFDKSKLKKTETQEKNPLPSKET', true, true, 85),
('Ipamorelin', 'Growth hormone releasing peptide (GHRP) that stimulates natural GH production without affecting cortisol levels.', 'performance', 40.00, 98.5, '711.85 g/mol', '170851-70-4', 'Aib-His-D-2Nal-D-Phe-Lys-NH2', true, true, 120),
('CJC-1295', 'Long-acting GHRH analog that increases growth hormone and IGF-1 levels. Often stacked with Ipamorelin.', 'performance', 50.00, 99.2, '3367.97 g/mol', '863288-34-0', 'Modified GHRH(1-29)', true, true, 95),
('Melanotan II', 'Synthetic peptide that stimulates melanogenesis for tanning effects and may support weight management.', 'cosmetic', 35.00, 98.0, '1024.2 g/mol', '121062-08-6', 'Ac-Nle-cyclo[Asp-His-D-Phe-Arg-Trp-Lys]-NH2', false, true, 150),
('GHK-Cu', 'Copper peptide with anti-aging properties, promotes collagen synthesis and skin regeneration.', 'cosmetic', 38.00, 99.0, '404.0 g/mol', '49557-75-7', 'Gly-His-Lys', true, true, 110),
('Semax', 'Nootropic peptide derived from ACTH that enhances cognitive function, memory, and neuroprotection.', 'cognitive', 42.00, 98.8, '813.9 g/mol', '80714-61-0', 'Met-Glu-His-Phe-Pro-Gly-Pro', true, true, 75),
('Selank', 'Anxiolytic nootropic peptide that reduces anxiety, improves mood, and enhances mental clarity.', 'cognitive', 44.00, 99.1, '751.9 g/mol', '129954-34-3', 'Thr-Lys-Pro-Arg-Pro-Gly-Pro', false, true, 80),
('PT-141 (Bremelanotide)', 'Melanocortin receptor agonist peptide for enhancing libido and sexual function.', 'performance', 48.00, 98.5, '1025.2 g/mol', '189691-06-3', 'Ac-Nle-cyclo[Asp-His-D-Phe-Arg-Trp-Lys]-OH', false, true, 65),
('Epithalon', 'Tetrapeptide that may promote longevity by regulating melatonin production and telomerase activity.', 'research', 52.00, 99.3, '390.35 g/mol', '307297-39-8', 'Ala-Glu-Asp-Gly', true, true, 70);

-- Insert product variations (different sizes)
INSERT INTO product_variations (product_id, name, quantity_mg, price, stock_quantity)
SELECT id, '2mg', 2.0, base_price * 0.8, 50 FROM products WHERE name = 'BPC-157'
UNION ALL
SELECT id, '5mg', 5.0, base_price, 100 FROM products WHERE name = 'BPC-157'
UNION ALL
SELECT id, '10mg', 10.0, base_price * 1.8, 80 FROM products WHERE name = 'BPC-157'
UNION ALL
SELECT id, '2mg', 2.0, base_price * 0.8, 40 FROM products WHERE name = 'TB-500'
UNION ALL
SELECT id, '5mg', 5.0, base_price, 85 FROM products WHERE name = 'TB-500'
UNION ALL
SELECT id, '10mg', 10.0, base_price * 1.8, 60 FROM products WHERE name = 'TB-500';

-- Insert default payment methods
INSERT INTO payment_methods (id, name, account_number, account_name, qr_code_url, active, sort_order) VALUES
('gcash', 'GCash', '09123456789', 'Peptide Store', '', true, 1),
('maya', 'Maya', '09123456789', 'Peptide Store', '', true, 2),
('bank', 'Bank Transfer', '1234567890', 'Peptide Store Inc.', '', true, 3);

-- Insert site settings
INSERT INTO site_settings (id, value, type, description) VALUES
('site_name', 'Premium Peptides', 'text', 'Website name'),
('site_tagline', 'Research-Grade Peptides for Your Goals', 'text', 'Website tagline'),
('contact_email', 'info@premiumpeptides.com', 'email', 'Contact email'),
('contact_phone', '+1-800-PEPTIDE', 'text', 'Contact phone number'),
('min_order_amount', '25.00', 'number', 'Minimum order amount'),
('free_shipping_threshold', '150.00', 'number', 'Free shipping threshold'),
('disclaimer', 'All peptides are sold for research purposes only. Not for human consumption.', 'text', 'Legal disclaimer');

-- Create indexes for better query performance
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_available ON products(available);
CREATE INDEX idx_products_featured ON products(featured);
CREATE INDEX idx_product_variations_product_id ON product_variations(product_id);
CREATE INDEX idx_categories_active ON categories(active);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payment_methods_updated_at BEFORE UPDATE ON payment_methods
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_site_settings_updated_at BEFORE UPDATE ON site_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

