-- HP GLOW PEPTIDES PRICELIST UPDATE - NOVEMBER 2025
-- Update all products with correct prices and inventory from pricelist
-- Remove any products NOT in the pricelist

-- Delete all products that are NOT in the pricelist
-- (Variations will be automatically deleted due to CASCADE)
DELETE FROM products 
WHERE LOWER(name) NOT LIKE '%tirzepatide%'
  AND LOWER(name) NOT LIKE '%ghk%cu%'
  AND LOWER(name) NOT LIKE '%nad%'
  AND LOWER(name) NOT LIKE '%semax%'
  AND LOWER(name) NOT LIKE '%selank%'
  AND LOWER(name) NOT LIKE '%cagrilintide%'
  AND LOWER(name) NOT LIKE '%aod-9604%'
  AND LOWER(name) NOT LIKE '%aod9604%'
  AND LOWER(name) NOT LIKE '%kisspeptin%'
  AND LOWER(name) NOT LIKE '%pt-141%'
  AND LOWER(name) NOT LIKE '%pt141%'
  AND LOWER(name) NOT LIKE '%retatrutide%'
  AND LOWER(name) NOT LIKE '%glow%'
  AND LOWER(name) NOT LIKE '%glutathione%'
  AND LOWER(name) NOT LIKE '%lemon%bottle%'
  AND LOWER(name) NOT LIKE '%lipo-c%'
  AND LOWER(name) NOT LIKE '%lipoc%';

-- First, ensure we have the right categories
INSERT INTO categories (id, name, icon, sort_order, active) VALUES
('research', 'Research Peptides', 'FlaskConical', 1, true),
('cosmetic', 'Cosmetic & Skincare', 'Sparkles', 2, true),
('wellness', 'Wellness & Support', 'Leaf', 3, true),
('supplies', 'Supplies & Accessories', 'Package', 4, true)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  icon = EXCLUDED.icon,
  sort_order = EXCLUDED.sort_order,
  active = EXCLUDED.active;

-- Function to get or create product ID by name
DO $$
DECLARE
  product_id_tirzepatide UUID;
  product_id_ghkcu UUID;
  product_id_nad UUID;
  product_id_semax UUID;
  product_id_selank UUID;
  product_id_cagrilintide UUID;
  product_id_aod9604 UUID;
  product_id_kisspeptin UUID;
  product_id_pt141 UUID;
  product_id_retatrutide UUID;
  product_id_glow UUID;
  product_id_glutathione UUID;
  product_id_lemon_bottle UUID;
  product_id_lipo_c UUID;
BEGIN
  -- TIRZEPATIDE (with variations: 15mg, 20mg, 30mg)
  SELECT id INTO product_id_tirzepatide FROM products WHERE name = 'Tirzepatide' LIMIT 1;
  IF product_id_tirzepatide IS NULL THEN
    INSERT INTO products (name, description, category, base_price, purity_percentage, stock_quantity, available, featured, storage_conditions)
    VALUES ('Tirzepatide', 'Tirzepatide is a dual GIP/GLP-1 receptor agonist. Research-grade peptide for metabolic studies.', 'research', 2499.00, 99.5, 0, true, true, 'Store at -20°C')
    RETURNING id INTO product_id_tirzepatide;
  ELSE
    UPDATE products SET base_price = 2499.00, available = true, featured = true WHERE id = product_id_tirzepatide;
  END IF;

  -- Delete existing variations and insert new ones
  DELETE FROM product_variations WHERE product_id = product_id_tirzepatide;
  INSERT INTO product_variations (product_id, name, quantity_mg, price, stock_quantity) VALUES
  (product_id_tirzepatide, '15mg', 15.0, 2499.00, 32),
  (product_id_tirzepatide, '20mg', 20.0, 2899.00, 5),
  (product_id_tirzepatide, '30mg', 30.0, 3499.00, 25);

  -- GHK-CU (with variations: 50mg, 100mg)
  SELECT id INTO product_id_ghkcu FROM products WHERE name = 'GHK-CU' OR name = 'GHK-Cu' LIMIT 1;
  IF product_id_ghkcu IS NULL THEN
    INSERT INTO products (name, description, category, base_price, purity_percentage, stock_quantity, available, featured, storage_conditions)
    VALUES ('GHK-CU', 'Copper peptide complex with regenerative properties. Known for its potential in tissue repair and anti-aging research applications.', 'cosmetic', 1199.00, 99.0, 0, true, true, 'Store at -20°C')
    RETURNING id INTO product_id_ghkcu;
  ELSE
    UPDATE products SET base_price = 1199.00, available = true, featured = true WHERE id = product_id_ghkcu;
  END IF;

  DELETE FROM product_variations WHERE product_id = product_id_ghkcu;
  INSERT INTO product_variations (product_id, name, quantity_mg, price, stock_quantity) VALUES
  (product_id_ghkcu, '50mg', 50.0, 1199.00, 7),
  (product_id_ghkcu, '100mg', 100.0, 1850.00, 4);

  -- NAD+ (with variations: 100mg, 500mg)
  SELECT id INTO product_id_nad FROM products WHERE name = 'NAD+' OR name = 'NAD' LIMIT 1;
  IF product_id_nad IS NULL THEN
    INSERT INTO products (name, description, category, base_price, purity_percentage, stock_quantity, available, featured, storage_conditions)
    VALUES ('NAD+', 'Nicotinamide Adenine Dinucleotide - Essential coenzyme involved in cellular energy production and metabolic processes.', 'wellness', 1299.00, 99.5, 0, true, true, 'Store at -20°C')
    RETURNING id INTO product_id_nad;
  ELSE
    UPDATE products SET base_price = 1299.00, available = true, featured = true WHERE id = product_id_nad;
  END IF;

  DELETE FROM product_variations WHERE product_id = product_id_nad;
  INSERT INTO product_variations (product_id, name, quantity_mg, price, stock_quantity) VALUES
  (product_id_nad, '100mg', 100.0, 1299.00, 1),
  (product_id_nad, '500mg', 500.0, 2199.00, 2);

  -- SEMAX (with variations: 5mg, 10mg)
  SELECT id INTO product_id_semax FROM products WHERE name = 'Semax' LIMIT 1;
  IF product_id_semax IS NULL THEN
    INSERT INTO products (name, description, category, base_price, purity_percentage, stock_quantity, available, featured, storage_conditions)
    VALUES ('Semax', 'Nootropic peptide derived from ACTH that enhances cognitive function, memory, and provides neuroprotective effects.', 'wellness', 1399.00, 98.8, 0, true, true, 'Store at -20°C')
    RETURNING id INTO product_id_semax;
  ELSE
    UPDATE products SET base_price = 1399.00, available = true, featured = true WHERE id = product_id_semax;
  END IF;

  DELETE FROM product_variations WHERE product_id = product_id_semax;
  INSERT INTO product_variations (product_id, name, quantity_mg, price, stock_quantity) VALUES
  (product_id_semax, '5mg', 5.0, 1399.00, 2),
  (product_id_semax, '10mg', 10.0, 1699.00, 1);

  -- SELANK (with variations: 5mg, 10mg)
  SELECT id INTO product_id_selank FROM products WHERE name = 'Selank' LIMIT 1;
  IF product_id_selank IS NULL THEN
    INSERT INTO products (name, description, category, base_price, purity_percentage, stock_quantity, available, featured, storage_conditions)
    VALUES ('Selank', 'Anxiolytic peptide with nootropic properties. Research-grade peptide for cognitive enhancement studies.', 'wellness', 1499.00, 99.0, 0, false, false, 'Store at -20°C')
    RETURNING id INTO product_id_selank;
  ELSE
    UPDATE products SET base_price = 1499.00, available = false, featured = false WHERE id = product_id_selank;
  END IF;

  DELETE FROM product_variations WHERE product_id = product_id_selank;
  INSERT INTO product_variations (product_id, name, quantity_mg, price, stock_quantity) VALUES
  (product_id_selank, '5mg', 5.0, 1499.00, 0),
  (product_id_selank, '10mg', 10.0, 1799.00, 2);

  -- CAGRILINTIDE (with variations: 5mg, 10mg)
  SELECT id INTO product_id_cagrilintide FROM products WHERE name = 'Cagrilintide' OR name = 'CAGRILINTIDE' LIMIT 1;
  IF product_id_cagrilintide IS NULL THEN
    INSERT INTO products (name, description, category, base_price, purity_percentage, stock_quantity, available, featured, storage_conditions)
    VALUES ('Cagrilintide', 'Amylin receptor agonist for metabolic research. Research-grade peptide for weight management studies.', 'research', 1799.00, 99.0, 0, true, false, 'Store at -20°C')
    RETURNING id INTO product_id_cagrilintide;
  ELSE
    UPDATE products SET base_price = 1799.00, available = true, featured = false WHERE id = product_id_cagrilintide;
  END IF;

  DELETE FROM product_variations WHERE product_id = product_id_cagrilintide;
  INSERT INTO product_variations (product_id, name, quantity_mg, price, stock_quantity) VALUES
  (product_id_cagrilintide, '5mg', 5.0, 1799.00, 3),
  (product_id_cagrilintide, '10mg', 10.0, 2299.00, 3);

  -- AOD-9604 (single size: 5mg)
  SELECT id INTO product_id_aod9604 FROM products WHERE name = 'AOD-9604' OR name = 'AOD-9604' LIMIT 1;
  IF product_id_aod9604 IS NULL THEN
    INSERT INTO products (name, description, category, base_price, purity_percentage, stock_quantity, available, featured, storage_conditions)
    VALUES ('AOD-9604', 'Modified fragment of human growth hormone (HGH) C-terminus. Researched for its potential metabolic effects.', 'research', 2099.00, 99.0, 3, true, false, 'Store at -20°C')
    RETURNING id INTO product_id_aod9604;
  ELSE
    UPDATE products SET base_price = 2099.00, stock_quantity = 3, available = true, featured = false WHERE id = product_id_aod9604;
  END IF;

  DELETE FROM product_variations WHERE product_id = product_id_aod9604;
  INSERT INTO product_variations (product_id, name, quantity_mg, price, stock_quantity) VALUES
  (product_id_aod9604, '5mg', 5.0, 2099.00, 3);

  -- KISSPEPTIN (with variations: 5mg, 10mg)
  SELECT id INTO product_id_kisspeptin FROM products WHERE name = 'Kisspeptin' OR name = 'KISSPEPTIN' LIMIT 1;
  IF product_id_kisspeptin IS NULL THEN
    INSERT INTO products (name, description, category, base_price, purity_percentage, stock_quantity, available, featured, storage_conditions)
    VALUES ('Kisspeptin', 'Reproductive hormone peptide. Research-grade peptide for hormonal studies.', 'wellness', 1699.00, 99.0, 0, true, false, 'Store at -20°C')
    RETURNING id INTO product_id_kisspeptin;
  ELSE
    UPDATE products SET base_price = 1699.00, available = true, featured = false WHERE id = product_id_kisspeptin;
  END IF;

  DELETE FROM product_variations WHERE product_id = product_id_kisspeptin;
  INSERT INTO product_variations (product_id, name, quantity_mg, price, stock_quantity) VALUES
  (product_id_kisspeptin, '5mg', 5.0, 1699.00, 3),
  (product_id_kisspeptin, '10mg', 10.0, 2399.00, 1);

  -- PT-141 (with variations: 10mg, 15mg)
  SELECT id INTO product_id_pt141 FROM products WHERE name = 'PT-141' OR name = 'PT141' LIMIT 1;
  IF product_id_pt141 IS NULL THEN
    INSERT INTO products (name, description, category, base_price, purity_percentage, stock_quantity, available, featured, storage_conditions)
    VALUES ('PT-141', 'Bremelanotide peptide. Research-grade peptide for sexual health studies.', 'wellness', 1499.00, 99.0, 0, true, false, 'Store at -20°C')
    RETURNING id INTO product_id_pt141;
  ELSE
    UPDATE products SET base_price = 1499.00, available = true, featured = false WHERE id = product_id_pt141;
  END IF;

  DELETE FROM product_variations WHERE product_id = product_id_pt141;
  INSERT INTO product_variations (product_id, name, quantity_mg, price, stock_quantity) VALUES
  (product_id_pt141, '10mg', 10.0, 1499.00, 3),
  (product_id_pt141, '15mg', 15.0, 2899.00, 0);

  -- RETATRUTIDE (with variations: 20mg, 30mg)
  SELECT id INTO product_id_retatrutide FROM products WHERE name = 'Retatrutide' OR name = 'RETATRUTIDE' LIMIT 1;
  IF product_id_retatrutide IS NULL THEN
    INSERT INTO products (name, description, category, base_price, purity_percentage, stock_quantity, available, featured, storage_conditions)
    VALUES ('Retatrutide', 'Triple agonist peptide for metabolic research. Research-grade peptide for weight management studies.', 'research', 3499.00, 99.5, 0, false, true, 'Store at -20°C')
    RETURNING id INTO product_id_retatrutide;
  ELSE
    UPDATE products SET base_price = 3499.00, available = false, featured = true WHERE id = product_id_retatrutide;
  END IF;

  DELETE FROM product_variations WHERE product_id = product_id_retatrutide;
  INSERT INTO product_variations (product_id, name, quantity_mg, price, stock_quantity) VALUES
  (product_id_retatrutide, '20mg', 20.0, 3499.00, 0),
  (product_id_retatrutide, '30mg', 30.0, 4299.00, 1);

  -- GLOW (BPC-157, GHK-CU, TB500) - single size: 70mg
  SELECT id INTO product_id_glow FROM products WHERE name = 'GLOW' OR name = 'Glow' OR name LIKE '%BPC-157%GHK-CU%TB500%' LIMIT 1;
  IF product_id_glow IS NULL THEN
    INSERT INTO products (name, description, category, base_price, purity_percentage, stock_quantity, available, featured, storage_conditions)
    VALUES ('GLOW (BPC-157, GHK-CU, TB500)', 'Premium blend of BPC-157, GHK-CU, and TB500 peptides. Complete recovery and regenerative peptide combination.', 'wellness', 2899.00, 99.0, 1, true, true, 'Store at -20°C')
    RETURNING id INTO product_id_glow;
  ELSE
    UPDATE products SET base_price = 2899.00, stock_quantity = 1, available = true, featured = true WHERE id = product_id_glow;
  END IF;

  DELETE FROM product_variations WHERE product_id = product_id_glow;
  INSERT INTO product_variations (product_id, name, quantity_mg, price, stock_quantity) VALUES
  (product_id_glow, '70mg', 70.0, 2899.00, 1);

  -- GLUTATHIONE - single size: 1500mg
  SELECT id INTO product_id_glutathione FROM products WHERE name = 'Glutathione' OR name = 'GLUTATHIONE' LIMIT 1;
  IF product_id_glutathione IS NULL THEN
    INSERT INTO products (name, description, category, base_price, purity_percentage, stock_quantity, available, featured, storage_conditions)
    VALUES ('Glutathione', 'Master antioxidant peptide. Essential for cellular protection and detoxification. Research-grade quality.', 'wellness', 1499.00, 99.0, 28, true, true, 'Store at -20°C')
    RETURNING id INTO product_id_glutathione;
  ELSE
    UPDATE products SET base_price = 1499.00, stock_quantity = 28, available = true, featured = true WHERE id = product_id_glutathione;
  END IF;

  DELETE FROM product_variations WHERE product_id = product_id_glutathione;
  INSERT INTO product_variations (product_id, name, quantity_mg, price, stock_quantity) VALUES
  (product_id_glutathione, '1500mg', 1500.0, 1499.00, 28);

  -- LEMON BOTTLE - single size: 10ml
  SELECT id INTO product_id_lemon_bottle FROM products WHERE name = 'Lemon Bottle' OR name = 'LEMON BOTTLE' LIMIT 1;
  IF product_id_lemon_bottle IS NULL THEN
    INSERT INTO products (name, description, category, base_price, purity_percentage, stock_quantity, available, featured, storage_conditions)
    VALUES ('Lemon Bottle', 'Fat-dissolving injection solution. Professional-grade cosmetic product.', 'cosmetic', 1299.00, 99.0, 5, true, false, 'Store at room temperature')
    RETURNING id INTO product_id_lemon_bottle;
  ELSE
    UPDATE products SET base_price = 1299.00, stock_quantity = 5, available = true, featured = false WHERE id = product_id_lemon_bottle;
  END IF;

  DELETE FROM product_variations WHERE product_id = product_id_lemon_bottle;
  INSERT INTO product_variations (product_id, name, quantity_mg, price, stock_quantity) VALUES
  (product_id_lemon_bottle, '10ml', 10.0, 1299.00, 5);

  -- LIPO-C WITH B12 - single size: 10ml
  SELECT id INTO product_id_lipo_c FROM products WHERE name = 'Lipo-C with B12' OR name = 'LIPO-C WITH B12' OR name LIKE '%Lipo-C%' LIMIT 1;
  IF product_id_lipo_c IS NULL THEN
    INSERT INTO products (name, description, category, base_price, purity_percentage, stock_quantity, available, featured, storage_conditions)
    VALUES ('Lipo-C with B12', 'Fat-burning injection solution with Vitamin B12. Professional-grade cosmetic product.', 'cosmetic', 1699.00, 99.0, 1, true, false, 'Store at room temperature')
    RETURNING id INTO product_id_lipo_c;
  ELSE
    UPDATE products SET base_price = 1699.00, stock_quantity = 1, available = true, featured = false WHERE id = product_id_lipo_c;
  END IF;

  DELETE FROM product_variations WHERE product_id = product_id_lipo_c;
  INSERT INTO product_variations (product_id, name, quantity_mg, price, stock_quantity) VALUES
  (product_id_lipo_c, '10ml', 10.0, 1699.00, 1);

  -- Update product availability based on variations stock
  -- If product has variations, check if any variation has stock
  UPDATE products p
  SET available = EXISTS (
    SELECT 1 FROM product_variations pv 
    WHERE pv.product_id = p.id AND pv.stock_quantity > 0
  )
  WHERE EXISTS (SELECT 1 FROM product_variations pv2 WHERE pv2.product_id = p.id);

  -- For products without variations, availability is already set correctly above

END $$;

-- Verify the update
DO $$
DECLARE
  total_products INTEGER;
  total_variations INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_products FROM products;
  SELECT COUNT(*) INTO total_variations FROM product_variations;
  
  RAISE NOTICE '✅ Migration completed successfully!';
  RAISE NOTICE '📦 Total products: %', total_products;
  RAISE NOTICE '📊 Total variations: %', total_variations;
END $$;

