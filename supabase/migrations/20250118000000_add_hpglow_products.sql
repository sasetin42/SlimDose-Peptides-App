-- HP GLOW Products Migration
-- Add all products with correct pricing

-- Clear existing products and variations (only if tables exist)
DO $$
BEGIN
  -- Delete variations first (due to foreign key constraint)
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'product_variations') THEN
    DELETE FROM product_variations;
  END IF;
  
  -- Delete products
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'products') THEN
    DELETE FROM products;
  END IF;
END $$;

-- Ensure categories table exists and insert categories
DO $$
BEGIN
  -- Create categories table if it doesn't exist
  IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'categories') THEN
    CREATE TABLE categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      icon TEXT NOT NULL,
      sort_order INTEGER DEFAULT 0,
      active BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  END IF;
  
  -- Insert categories (with conflict handling)
  INSERT INTO categories (id, name, icon, sort_order, active) VALUES
  ('all', 'All Products', 'Grid', 0, true),
  ('research', 'Research Peptides', 'FlaskConical', 1, true),
  ('cosmetic', 'Cosmetic & Skincare', 'Sparkles', 2, true),
  ('wellness', 'Wellness & Support', 'Leaf', 3, true),
  ('supplies', 'Supplies & Accessories', 'Package', 4, true)
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    icon = EXCLUDED.icon,
    sort_order = EXCLUDED.sort_order,
    active = EXCLUDED.active;
END $$;

-- Ensure products table exists (after categories table)
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'products') THEN
    -- First ensure categories table exists
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'categories') THEN
      CREATE TABLE categories (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        icon TEXT NOT NULL,
        sort_order INTEGER DEFAULT 0,
        active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    END IF;
    
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
      purity_percentage DECIMAL(5,2) DEFAULT 99.00,
      molecular_weight TEXT,
      cas_number TEXT,
      sequence TEXT,
      storage_conditions TEXT DEFAULT 'Store at -20°C',
      stock_quantity INTEGER DEFAULT 0,
      available BOOLEAN DEFAULT true,
      featured BOOLEAN DEFAULT false,
      image_url TEXT,
      safety_sheet_url TEXT,
      inclusions TEXT[],
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  END IF;
  
  -- Ensure product_variations table exists (after products table)
  IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'product_variations') THEN
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'products') THEN
      RAISE EXCEPTION 'products table must exist before creating product_variations';
    END IF;
    
    CREATE TABLE product_variations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      quantity_mg DECIMAL(10,2) NOT NULL,
      price DECIMAL(10,2) NOT NULL,
      stock_quantity INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  END IF;
END $$;

-- Insert Tirzepatide (main product with variations)
DO $$
DECLARE
  tirzepatide_product_id UUID;
BEGIN
  -- Insert Tirzepatide product
  INSERT INTO products (
    name,
    description,
    category,
    base_price,
    discount_price,
    discount_active,
    purity_percentage,
    molecular_weight,
    cas_number,
    sequence,
    storage_conditions,
    stock_quantity,
    available,
    featured,
    image_url,
    safety_sheet_url
  ) VALUES (
    'Tirzepatide',
    'Tirzepatide is a dual GIP/GLP-1 receptor agonist. Research-grade peptide for metabolic studies. Available in multiple strengths for various research protocols.',
    'research',
    2499.00, -- Base price (15mg)
    NULL,
    false,
    99.5,
    '4813.5 g/mol',
    '2023788-19-2',
    'Proprietary',
    'Store at -20°C for long-term storage. Reconstituted solution should be stored at 2-8°C for up to 30 days.',
    100,
    true,
    true,
    NULL,
    NULL
  ) RETURNING id INTO tirzepatide_product_id;
  
  -- Insert Tirzepatide variations
  INSERT INTO product_variations (product_id, name, quantity_mg, price, stock_quantity) VALUES
  (tirzepatide_product_id, '15mg', 15.0, 2499.00, 100),
  (tirzepatide_product_id, '20mg', 20.0, 2899.00, 100),
  (tirzepatide_product_id, '30mg', 30.0, 3499.00, 100);
END $$;

-- Insert GHK-CU 100mg
INSERT INTO products (
  name,
  description,
  category,
  base_price,
  discount_price,
  discount_active,
  purity_percentage,
  molecular_weight,
  cas_number,
  sequence,
  storage_conditions,
  stock_quantity,
  available,
  featured,
  image_url,
  safety_sheet_url
) VALUES (
  'GHK-CU 100mg',
  'GHK-Cu (Copper Peptide) is a copper peptide complex with regenerative properties. Known for its potential in tissue repair, wound healing, and anti-aging research applications. Research-grade quality.',
  'cosmetic',
  1850.00,
  NULL,
  false,
  99.0,
  '404.98 g/mol',
  '49557-75-7',
  'Gly-His-Lys + Cu2+',
  'Store at -20°C protected from light. Reconstituted at 2-8°C for up to 21 days.',
  100,
  true,
  true,
  NULL,
  NULL
);

-- Insert NAD+ 500mg
INSERT INTO products (
  name,
  description,
  category,
  base_price,
  discount_price,
  discount_active,
  purity_percentage,
  molecular_weight,
  cas_number,
  sequence,
  storage_conditions,
  stock_quantity,
  available,
  featured,
  image_url,
  safety_sheet_url
) VALUES (
  'NAD+ 500mg',
  'Nicotinamide Adenine Dinucleotide (NAD+) is a coenzyme essential for cellular energy metabolism. Research-grade for anti-aging and cellular function studies.',
  'wellness',
  2499.00,
  NULL,
  false,
  99.0,
  '663.43 g/mol',
  '53-84-9',
  'C21H27N7O14P2',
  'Store at -20°C. Protect from light and moisture.',
  100,
  true,
  true,
  NULL,
  NULL
);

-- Insert Semax 5mg
INSERT INTO products (
  name,
  description,
  category,
  base_price,
  discount_price,
  discount_active,
  purity_percentage,
  molecular_weight,
  cas_number,
  sequence,
  storage_conditions,
  stock_quantity,
  available,
  featured,
  image_url,
  safety_sheet_url
) VALUES (
  'Semax 5mg',
  'Semax is a nootropic peptide derived from ACTH that enhances cognitive function, memory, and provides neuroprotective effects in research studies. Research-grade quality.',
  'wellness',
  1399.00,
  NULL,
  false,
  98.8,
  '712.85 g/mol',
  '80714-61-0',
  'Met-Glu-His-Phe-Pro-Gly-Pro',
  'Store at -20°C. Reconstituted solution at 2-8°C for up to 30 days.',
  100,
  true,
  true,
  NULL,
  NULL
);

-- Insert Selank 5mg
INSERT INTO products (
  name,
  description,
  category,
  base_price,
  discount_price,
  discount_active,
  purity_percentage,
  molecular_weight,
  cas_number,
  sequence,
  storage_conditions,
  stock_quantity,
  available,
  featured,
  image_url,
  safety_sheet_url
) VALUES (
  'Selank 5mg',
  'Selank is a synthetic peptide analog of tuftsin with nootropic and anxiolytic properties. Research-grade peptide for cognitive enhancement studies.',
  'wellness',
  1499.00,
  NULL,
  false,
  98.5,
  '751.95 g/mol',
  '129954-34-3',
  'Thr-Lys-Pro-Arg-Pro-Gly-Pro',
  'Store at -20°C. Reconstituted solution at 2-8°C for up to 30 days.',
  100,
  true,
  true,
  NULL,
  NULL
);

-- Insert Glutathione 1500mg
INSERT INTO products (
  name,
  description,
  category,
  base_price,
  discount_price,
  discount_active,
  purity_percentage,
  molecular_weight,
  cas_number,
  sequence,
  storage_conditions,
  stock_quantity,
  available,
  featured,
  image_url,
  safety_sheet_url
) VALUES (
  'Glutathione 1500mg',
  'Glutathione is a powerful antioxidant peptide that supports cellular health and detoxification. Research-grade quality for antioxidant and cellular protection studies.',
  'wellness',
  1499.00,
  NULL,
  false,
  99.0,
  '307.32 g/mol',
  '70-18-8',
  'γ-L-Glutamyl-L-cysteinylglycine',
  'Store at -20°C. Protect from light and air exposure.',
  100,
  true,
  true,
  NULL,
  NULL
);

-- Insert Lemon Bottle 10ml
INSERT INTO products (
  name,
  description,
  category,
  base_price,
  discount_price,
  discount_active,
  purity_percentage,
  molecular_weight,
  cas_number,
  sequence,
  storage_conditions,
  stock_quantity,
  available,
  featured,
  image_url,
  safety_sheet_url
) VALUES (
  'Lemon Bottle 10ml',
  'Lemon Bottle fat-dissolving injection solution. Professional-grade cosmetic solution for research purposes.',
  'cosmetic',
  1299.00,
  NULL,
  false,
  99.5,
  NULL,
  NULL,
  NULL,
  'Store at room temperature. Protect from direct sunlight.',
  100,
  true,
  true,
  NULL,
  NULL
);

-- Insert PT-141
INSERT INTO products (
  name,
  description,
  category,
  base_price,
  discount_price,
  discount_active,
  purity_percentage,
  molecular_weight,
  cas_number,
  sequence,
  storage_conditions,
  stock_quantity,
  available,
  featured,
  image_url,
  safety_sheet_url
) VALUES (
  'PT-141',
  'PT-141 (Bremelanotide) is a synthetic peptide that acts as a melanocortin receptor agonist. Research-grade peptide for behavioral and physiological studies.',
  'research',
  1699.00,
  NULL,
  false,
  99.0,
  '1025.19 g/mol',
  '189691-06-3',
  'Ac-Nle-cyclo[Asp-His-D-Phe-Arg-Trp-Lys]-OH',
  'Store at -20°C. Reconstituted solution at 2-8°C for up to 30 days.',
  100,
  true,
  true,
  NULL,
  NULL
);

-- Insert Kisspeptin 5mg
INSERT INTO products (
  name,
  description,
  category,
  base_price,
  discount_price,
  discount_active,
  purity_percentage,
  molecular_weight,
  cas_number,
  sequence,
  storage_conditions,
  stock_quantity,
  available,
  featured,
  image_url,
  safety_sheet_url
) VALUES (
  'Kisspeptin 5mg',
  'Kisspeptin is a neuropeptide that plays a crucial role in reproductive function and hormone regulation. Research-grade peptide for endocrine and reproductive studies.',
  'research',
  1499.00,
  NULL,
  false,
  99.0,
  '1479.68 g/mol',
  '374675-21-5',
  'YNWNSFGLRY-NH2',
  'Store at -20°C. Reconstituted solution at 2-8°C for up to 30 days.',
  100,
  true,
  true,
  NULL,
  NULL
);

-- Insert Terumo 30g x 3/8 Syringe
INSERT INTO products (
  name,
  description,
  category,
  base_price,
  discount_price,
  discount_active,
  purity_percentage,
  molecular_weight,
  cas_number,
  sequence,
  storage_conditions,
  stock_quantity,
  available,
  featured,
  image_url,
  safety_sheet_url
) VALUES (
  'Terumo 30g x 3/8 Syringe',
  'Professional medical-grade syringe. Terumo 30 gauge, 3/8 inch needle. Single-use, sterile packaging. Essential accessory for research applications.',
  'supplies',
  14.00,
  NULL,
  false,
  100.0,
  NULL,
  NULL,
  NULL,
  'Store at room temperature in a clean, dry environment.',
  500,
  true,
  false,
  NULL,
  NULL
);

-- Insert Sungshim 31g x 8mm Syringe
INSERT INTO products (
  name,
  description,
  category,
  base_price,
  discount_price,
  discount_active,
  purity_percentage,
  molecular_weight,
  cas_number,
  sequence,
  storage_conditions,
  stock_quantity,
  available,
  featured,
  image_url,
  safety_sheet_url
) VALUES (
  'Sungshim 31g x 8mm Syringe',
  'Professional medical-grade syringe. Sungshim 31 gauge, 8mm needle. Single-use, sterile packaging. Essential accessory for research applications.',
  'supplies',
  10.00,
  NULL,
  false,
  100.0,
  NULL,
  NULL,
  NULL,
  'Store at room temperature in a clean, dry environment.',
  500,
  true,
  false,
  NULL,
  NULL
);

-- Update site settings for HP GLOW
UPDATE site_settings SET value = 'HP GLOW' WHERE id = 'site_name';
UPDATE site_settings SET value = 'Premium pep solutions for radiance, confidence & vitality.' WHERE id = 'site_tagline';
UPDATE site_settings SET value = 'Premium pep solutions for radiance, confidence & vitality.' WHERE id = 'site_description';

-- Ensure site_settings table exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'site_settings') THEN
    CREATE TABLE site_settings (
      id TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      type TEXT DEFAULT 'text',
      description TEXT,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  END IF;
END $$;

-- Insert/Update contact information
INSERT INTO site_settings (id, value, type, description) VALUES
('contact_instagram', 'https://www.instagram.com/hpglowpeptides', 'url', 'Instagram profile URL'),
('contact_viber', '09062349763', 'text', 'Viber phone number')
ON CONFLICT (id) DO UPDATE SET
  value = EXCLUDED.value,
  type = EXCLUDED.type,
  description = EXCLUDED.description,
  updated_at = NOW();

