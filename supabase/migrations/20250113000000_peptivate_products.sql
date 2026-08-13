-- Peptivate.ph Product Migration
-- Clear existing products and add new product lineup

-- Clear existing data
TRUNCATE TABLE products CASCADE;
TRUNCATE TABLE categories CASCADE;

-- Insert categories
INSERT INTO categories (id, name, icon, sort_order, active) VALUES
('weight-management', 'Weight Management', 'Scale', 1, true),
('anti-aging', 'Anti-Aging & Longevity', 'Sparkles', 2, true),
('recovery', 'Recovery & Healing', 'Heart', 3, true),
('wellness', 'Wellness & Support', 'Leaf', 4, true);

-- Insert products
INSERT INTO products (
  id,
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
) VALUES
(
  gen_random_uuid(),
  'Tirzepatide 15mg',
  'Tirzepatide is a dual GIP/GLP-1 receptor agonist. Research-grade peptide for metabolic studies. 15mg formulation for research applications.',
  'weight-management',
  8500.00,
  NULL,
  false,
  99.5,
  '4813.5 g/mol',
  '2023788-19-2',
  'Proprietary',
  'Store at -20°C for long-term storage. Reconstituted solution should be stored at 2-8°C for up to 30 days.',
  50,
  true,
  true,
  NULL,
  NULL
),
(
  gen_random_uuid(),
  'Tirzepatide 30mg',
  'Tirzepatide is a dual GIP/GLP-1 receptor agonist. Research-grade peptide for metabolic studies. 30mg formulation for extended research protocols.',
  'weight-management',
  15000.00,
  NULL,
  false,
  99.5,
  '4813.5 g/mol',
  '2023788-19-2',
  'Proprietary',
  'Store at -20°C for long-term storage. Reconstituted solution should be stored at 2-8°C for up to 30 days.',
  50,
  true,
  true,
  NULL,
  NULL
),
(
  gen_random_uuid(),
  'NAD+ 500mg',
  'Nicotinamide Adenine Dinucleotide (NAD+) is a coenzyme essential for cellular energy metabolism. Research-grade for anti-aging and cellular function studies.',
  'anti-aging',
  3500.00,
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
),
(
  gen_random_uuid(),
  'Cagrilintide 5mg',
  'Cagrilintide is a long-acting amylin analogue. Research-grade peptide for appetite regulation and metabolic studies.',
  'weight-management',
  6500.00,
  NULL,
  false,
  98.5,
  '3896.4 g/mol',
  '2381089-83-2',
  'Proprietary',
  'Store lyophilized at -20°C. Reconstituted solution at 2-8°C for up to 14 days.',
  50,
  true,
  false,
  NULL,
  NULL
),
(
  gen_random_uuid(),
  'Epithalon 10mg',
  'Epithalon (Epitalon) is a synthetic tetrapeptide. Research-grade for telomerase activation and longevity studies.',
  'anti-aging',
  2500.00,
  NULL,
  false,
  99.0,
  '390.35 g/mol',
  '307297-39-8',
  'Ala-Glu-Asp-Gly',
  'Store at -20°C in dry state. Reconstituted at 2-8°C for up to 14 days.',
  100,
  true,
  true,
  NULL,
  NULL
),
(
  gen_random_uuid(),
  'Bacteriostatic Water 10ml',
  'Sterile bacteriostatic water for injection, USP. Contains 0.9% benzyl alcohol as preservative. For reconstitution of peptides.',
  'wellness',
  350.00,
  NULL,
  false,
  NULL,
  NULL,
  NULL,
  'Sterile Water + 0.9% Benzyl Alcohol',
  'Store at room temperature (20-25°C). Do not freeze.',
  200,
  true,
  false,
  NULL,
  NULL
),
(
  gen_random_uuid(),
  'SS-31 (Elamipretide) 10mg',
  'SS-31 is a mitochondrial-targeted peptide. Research-grade for mitochondrial function and cellular energy studies.',
  'recovery',
  4500.00,
  NULL,
  false,
  98.0,
  '640.78 g/mol',
  '736992-21-5',
  'D-Arg-Dmt-Lys-Phe-NH2',
  'Store lyophilized at -20°C. Reconstituted solution at 2-8°C for up to 7 days.',
  50,
  true,
  false,
  NULL,
  NULL
),
(
  gen_random_uuid(),
  'KPV 10mg',
  'KPV is a tripeptide with anti-inflammatory properties. Research-grade for inflammatory response studies.',
  'recovery',
  2800.00,
  NULL,
  false,
  99.0,
  '357.42 g/mol',
  '23404-68-4',
  'Lys-Pro-Val',
  'Store at -20°C. Reconstituted solution at 2-8°C for up to 14 days.',
  75,
  true,
  false,
  NULL,
  NULL
),
(
  gen_random_uuid(),
  'GHK-Cu 50mg',
  'GHK-Cu is a copper peptide complex. Research-grade for wound healing, tissue repair, and skin regeneration studies.',
  'recovery',
  3200.00,
  NULL,
  false,
  98.5,
  '404.98 g/mol',
  '49557-75-7',
  'Gly-His-Lys + Cu2+',
  'Store at -20°C protected from light. Reconstituted at 2-8°C for up to 21 days.',
  80,
  true,
  true,
  NULL,
  NULL
);

-- Add product variations for Tirzepatide products
INSERT INTO product_variations (id, product_id, name, quantity_mg, price, stock_quantity)
SELECT 
  gen_random_uuid(),
  p.id,
  '5mg Vial',
  5,
  3500.00,
  50
FROM products p WHERE p.name = 'Tirzepatide 15mg';

INSERT INTO product_variations (id, product_id, name, quantity_mg, price, stock_quantity)
SELECT 
  gen_random_uuid(),
  p.id,
  '10mg Vial',
  10,
  6500.00,
  50
FROM products p WHERE p.name = 'Tirzepatide 15mg';

INSERT INTO product_variations (id, product_id, name, quantity_mg, price, stock_quantity)
SELECT 
  gen_random_uuid(),
  p.id,
  '15mg Vial',
  15,
  8500.00,
  50
FROM products p WHERE p.name = 'Tirzepatide 15mg';

INSERT INTO product_variations (id, product_id, name, quantity_mg, price, stock_quantity)
SELECT 
  gen_random_uuid(),
  p.id,
  '30mg Vial',
  30,
  15000.00,
  50
FROM products p WHERE p.name = 'Tirzepatide 30mg';

-- Update site settings for Peptivate.ph
UPDATE site_settings SET value = 'Peptivate.ph' WHERE id = 'site_name';
UPDATE site_settings SET value = 'Premium Peptide Solutions' WHERE id = 'site_tagline';
UPDATE site_settings SET value = 'Premium research-grade peptides for scientific research purposes only.' WHERE id = 'site_description';
UPDATE site_settings SET value = 'support@peptivate.ph' WHERE id = 'contact_email';
UPDATE site_settings SET value = 'All peptides are sold strictly for research purposes only. Not intended for human consumption.' WHERE id = 'legal_disclaimer';

