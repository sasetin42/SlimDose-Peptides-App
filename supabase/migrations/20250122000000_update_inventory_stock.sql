-- HP GLOW INVENTORY UPDATE - JANUARY 2025
-- Update stock quantities based on current inventory
-- Delete any products NOT in the approved list

-- First, delete all products that are NOT in the approved inventory list
-- (Variations will be automatically deleted due to CASCADE)
DELETE FROM products 
WHERE LOWER(name) NOT LIKE '%tirzepatide%'
  AND LOWER(name) NOT LIKE '%ghk%cu%'
  AND LOWER(name) NOT LIKE '%ghk-cu%'
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
  AND LOWER(name) NOT LIKE '%retratrutide%'
  AND LOWER(name) NOT LIKE '%glow%'
  AND LOWER(name) NOT LIKE '%glutathione%'
  AND LOWER(name) NOT LIKE '%lemon%bottle%'
  AND LOWER(name) NOT LIKE '%lipo-c%'
  AND LOWER(name) NOT LIKE '%lipoc%';

-- Function to update products and variations with correct stock
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
  -- TIRZEPATIDE (15mg: 32, 20mg: 5, 30mg: 25)
  SELECT id INTO product_id_tirzepatide FROM products WHERE LOWER(name) LIKE '%tirzepatide%' LIMIT 1;
  IF product_id_tirzepatide IS NOT NULL THEN
    -- Update or insert 15mg variation
    IF EXISTS (SELECT 1 FROM product_variations WHERE product_id = product_id_tirzepatide AND (name = '15mg' OR quantity_mg = 15.0)) THEN
      UPDATE product_variations SET stock_quantity = 32 WHERE product_id = product_id_tirzepatide AND (name = '15mg' OR quantity_mg = 15.0);
    ELSE
      INSERT INTO product_variations (product_id, name, quantity_mg, price, stock_quantity)
      SELECT product_id_tirzepatide, '15mg', 15.0, base_price, 32 FROM products WHERE id = product_id_tirzepatide;
    END IF;
    
    -- Update or insert 20mg variation
    IF EXISTS (SELECT 1 FROM product_variations WHERE product_id = product_id_tirzepatide AND (name = '20mg' OR quantity_mg = 20.0)) THEN
      UPDATE product_variations SET stock_quantity = 5 WHERE product_id = product_id_tirzepatide AND (name = '20mg' OR quantity_mg = 20.0);
    ELSE
      INSERT INTO product_variations (product_id, name, quantity_mg, price, stock_quantity)
      SELECT product_id_tirzepatide, '20mg', 20.0, base_price * 1.16, 5 FROM products WHERE id = product_id_tirzepatide;
    END IF;
    
    -- Update or insert 30mg variation
    IF EXISTS (SELECT 1 FROM product_variations WHERE product_id = product_id_tirzepatide AND (name = '30mg' OR quantity_mg = 30.0)) THEN
      UPDATE product_variations SET stock_quantity = 25 WHERE product_id = product_id_tirzepatide AND (name = '30mg' OR quantity_mg = 30.0);
    ELSE
      INSERT INTO product_variations (product_id, name, quantity_mg, price, stock_quantity)
      SELECT product_id_tirzepatide, '30mg', 30.0, base_price * 1.40, 25 FROM products WHERE id = product_id_tirzepatide;
    END IF;
    
    -- Delete any variations not in the list (if any exist)
    DELETE FROM product_variations WHERE product_id = product_id_tirzepatide 
      AND name NOT IN ('15mg', '20mg', '30mg') 
      AND quantity_mg NOT IN (15.0, 20.0, 30.0);
  END IF;

  -- GHK-CU (50mg: 7, 100mg: 4)
  SELECT id INTO product_id_ghkcu FROM products WHERE (LOWER(name) LIKE '%ghk%cu%' OR LOWER(name) LIKE '%ghk-cu%') LIMIT 1;
  IF product_id_ghkcu IS NOT NULL THEN
    UPDATE product_variations SET stock_quantity = 7 WHERE product_id = product_id_ghkcu AND (name = '50mg' OR quantity_mg = 50.0);
    UPDATE product_variations SET stock_quantity = 4 WHERE product_id = product_id_ghkcu AND (name = '100mg' OR quantity_mg = 100.0);
    DELETE FROM product_variations WHERE product_id = product_id_ghkcu 
      AND name NOT IN ('50mg', '100mg') 
      AND quantity_mg NOT IN (50.0, 100.0);
  END IF;

  -- NAD+ (100mg: 1, 500mg: 2)
  SELECT id INTO product_id_nad FROM products WHERE LOWER(name) LIKE '%nad%' LIMIT 1;
  IF product_id_nad IS NOT NULL THEN
    UPDATE product_variations SET stock_quantity = 1 WHERE product_id = product_id_nad AND (name = '100mg' OR quantity_mg = 100.0);
    UPDATE product_variations SET stock_quantity = 2 WHERE product_id = product_id_nad AND (name = '500mg' OR quantity_mg = 500.0);
    DELETE FROM product_variations WHERE product_id = product_id_nad 
      AND name NOT IN ('100mg', '500mg') 
      AND quantity_mg NOT IN (100.0, 500.0);
  END IF;

  -- SEMAX (5mg: 2, 10mg: 1)
  SELECT id INTO product_id_semax FROM products WHERE LOWER(name) LIKE '%semax%' LIMIT 1;
  IF product_id_semax IS NOT NULL THEN
    UPDATE product_variations SET stock_quantity = 2 WHERE product_id = product_id_semax AND (name = '5mg' OR quantity_mg = 5.0);
    UPDATE product_variations SET stock_quantity = 1 WHERE product_id = product_id_semax AND (name = '10mg' OR quantity_mg = 10.0);
    DELETE FROM product_variations WHERE product_id = product_id_semax 
      AND name NOT IN ('5mg', '10mg') 
      AND quantity_mg NOT IN (5.0, 10.0);
  END IF;

  -- SELANK (5mg: 0, 10mg: 2)
  SELECT id INTO product_id_selank FROM products WHERE LOWER(name) LIKE '%selank%' LIMIT 1;
  IF product_id_selank IS NOT NULL THEN
    UPDATE product_variations SET stock_quantity = 0 WHERE product_id = product_id_selank AND (name = '5mg' OR quantity_mg = 5.0);
    UPDATE product_variations SET stock_quantity = 2 WHERE product_id = product_id_selank AND (name = '10mg' OR quantity_mg = 10.0);
    DELETE FROM product_variations WHERE product_id = product_id_selank 
      AND name NOT IN ('5mg', '10mg') 
      AND quantity_mg NOT IN (5.0, 10.0);
  END IF;

  -- CAGRILINTIDE (5mg: 3, 10mg: 3)
  SELECT id INTO product_id_cagrilintide FROM products WHERE LOWER(name) LIKE '%cagrilintide%' LIMIT 1;
  IF product_id_cagrilintide IS NOT NULL THEN
    UPDATE product_variations SET stock_quantity = 3 WHERE product_id = product_id_cagrilintide AND (name = '5mg' OR quantity_mg = 5.0);
    UPDATE product_variations SET stock_quantity = 3 WHERE product_id = product_id_cagrilintide AND (name = '10mg' OR quantity_mg = 10.0);
    DELETE FROM product_variations WHERE product_id = product_id_cagrilintide 
      AND name NOT IN ('5mg', '10mg') 
      AND quantity_mg NOT IN (5.0, 10.0);
  END IF;

  -- AOD-9604 (5mg: 3)
  SELECT id INTO product_id_aod9604 FROM products WHERE (LOWER(name) LIKE '%aod-9604%' OR LOWER(name) LIKE '%aod9604%') LIMIT 1;
  IF product_id_aod9604 IS NOT NULL THEN
    UPDATE product_variations SET stock_quantity = 3 WHERE product_id = product_id_aod9604 AND (name = '5mg' OR quantity_mg = 5.0);
    DELETE FROM product_variations WHERE product_id = product_id_aod9604 
      AND name != '5mg' 
      AND quantity_mg != 5.0;
  END IF;

  -- KISSPEPTIN (5mg: 1, 10mg: 1)
  SELECT id INTO product_id_kisspeptin FROM products WHERE LOWER(name) LIKE '%kisspeptin%' LIMIT 1;
  IF product_id_kisspeptin IS NOT NULL THEN
    UPDATE product_variations SET stock_quantity = 1 WHERE product_id = product_id_kisspeptin AND (name = '5mg' OR quantity_mg = 5.0);
    UPDATE product_variations SET stock_quantity = 1 WHERE product_id = product_id_kisspeptin AND (name = '10mg' OR quantity_mg = 10.0);
    DELETE FROM product_variations WHERE product_id = product_id_kisspeptin 
      AND name NOT IN ('5mg', '10mg') 
      AND quantity_mg NOT IN (5.0, 10.0);
  END IF;

  -- PT-141 (10mg: 3)
  SELECT id INTO product_id_pt141 FROM products WHERE (LOWER(name) LIKE '%pt-141%' OR LOWER(name) LIKE '%pt141%') LIMIT 1;
  IF product_id_pt141 IS NOT NULL THEN
    UPDATE product_variations SET stock_quantity = 3 WHERE product_id = product_id_pt141 AND (name = '10mg' OR quantity_mg = 10.0);
    -- Delete 15mg variation if it exists
    DELETE FROM product_variations WHERE product_id = product_id_pt141 
      AND (name = '15mg' OR quantity_mg = 15.0);
  END IF;

  -- RETATRUTIDE (15mg: 0, 20mg: 0, 30mg: 0)
  SELECT id INTO product_id_retatrutide FROM products WHERE (LOWER(name) LIKE '%retatrutide%' OR LOWER(name) LIKE '%retratrutide%') LIMIT 1;
  IF product_id_retatrutide IS NOT NULL THEN
    -- Update or insert 15mg variation
    IF EXISTS (SELECT 1 FROM product_variations WHERE product_id = product_id_retatrutide AND (name = '15mg' OR quantity_mg = 15.0)) THEN
      UPDATE product_variations SET stock_quantity = 0 WHERE product_id = product_id_retatrutide AND (name = '15mg' OR quantity_mg = 15.0);
    ELSE
      INSERT INTO product_variations (product_id, name, quantity_mg, price, stock_quantity)
      SELECT product_id_retatrutide, '15mg', 15.0, base_price, 0 FROM products WHERE id = product_id_retatrutide;
    END IF;
    UPDATE product_variations SET stock_quantity = 0 WHERE product_id = product_id_retatrutide AND (name = '20mg' OR quantity_mg = 20.0);
    UPDATE product_variations SET stock_quantity = 0 WHERE product_id = product_id_retatrutide AND (name = '30mg' OR quantity_mg = 30.0);
    DELETE FROM product_variations WHERE product_id = product_id_retatrutide 
      AND name NOT IN ('15mg', '20mg', '30mg') 
      AND quantity_mg NOT IN (15.0, 20.0, 30.0);
  END IF;

  -- GLOW blend (70mg: 1)
  SELECT id INTO product_id_glow FROM products WHERE LOWER(name) LIKE '%glow%' LIMIT 1;
  IF product_id_glow IS NOT NULL THEN
    UPDATE product_variations SET stock_quantity = 1 WHERE product_id = product_id_glow AND (name = '70mg' OR quantity_mg = 70.0);
    DELETE FROM product_variations WHERE product_id = product_id_glow 
      AND name != '70mg' 
      AND quantity_mg != 70.0;
  END IF;

  -- GLUTATHIONE (1500mg: 28)
  SELECT id INTO product_id_glutathione FROM products WHERE LOWER(name) LIKE '%glutathione%' LIMIT 1;
  IF product_id_glutathione IS NOT NULL THEN
    UPDATE product_variations SET stock_quantity = 28 WHERE product_id = product_id_glutathione AND (name = '1500mg' OR quantity_mg = 1500.0);
    DELETE FROM product_variations WHERE product_id = product_id_glutathione 
      AND name != '1500mg' 
      AND quantity_mg != 1500.0;
  END IF;

  -- LEMON BOTTLE (10ml: 5)
  SELECT id INTO product_id_lemon_bottle FROM products WHERE LOWER(name) LIKE '%lemon%bottle%' LIMIT 1;
  IF product_id_lemon_bottle IS NOT NULL THEN
    UPDATE product_variations SET stock_quantity = 5 WHERE product_id = product_id_lemon_bottle AND (name = '10ml' OR quantity_mg = 10.0);
    DELETE FROM product_variations WHERE product_id = product_id_lemon_bottle 
      AND name != '10ml' 
      AND quantity_mg != 10.0;
  END IF;

  -- LIPO-C WITH B12 (10ml: 1)
  SELECT id INTO product_id_lipo_c FROM products WHERE (LOWER(name) LIKE '%lipo-c%' OR LOWER(name) LIKE '%lipoc%') LIMIT 1;
  IF product_id_lipo_c IS NOT NULL THEN
    UPDATE product_variations SET stock_quantity = 1 WHERE product_id = product_id_lipo_c AND (name = '10ml' OR quantity_mg = 10.0);
    DELETE FROM product_variations WHERE product_id = product_id_lipo_c 
      AND name != '10ml' 
      AND quantity_mg != 10.0;
  END IF;

  -- Update product availability based on variations stock
  -- If product has variations, check if any variation has stock
  UPDATE products p
  SET available = EXISTS (
    SELECT 1 FROM product_variations pv 
    WHERE pv.product_id = p.id AND pv.stock_quantity > 0
  )
  WHERE EXISTS (SELECT 1 FROM product_variations pv2 WHERE pv2.product_id = p.id);

  -- For products without variations, set availability based on stock_quantity
  UPDATE products
  SET available = (stock_quantity > 0)
  WHERE NOT EXISTS (SELECT 1 FROM product_variations pv WHERE pv.product_id = products.id);

END $$;

-- Verify the update
DO $$
DECLARE
  total_products INTEGER;
  total_variations INTEGER;
  tirzepatide_15mg INTEGER;
  tirzepatide_20mg INTEGER;
  tirzepatide_30mg INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_products FROM products;
  SELECT COUNT(*) INTO total_variations FROM product_variations;
  
  -- Verify Tirzepatide stock
  SELECT pv.stock_quantity INTO tirzepatide_15mg FROM product_variations pv
  JOIN products p ON p.id = pv.product_id
  WHERE LOWER(p.name) LIKE '%tirzepatide%' AND (pv.name = '15mg' OR pv.quantity_mg = 15.0) LIMIT 1;
  
  SELECT pv.stock_quantity INTO tirzepatide_20mg FROM product_variations pv
  JOIN products p ON p.id = pv.product_id
  WHERE LOWER(p.name) LIKE '%tirzepatide%' AND (pv.name = '20mg' OR pv.quantity_mg = 20.0) LIMIT 1;
  
  SELECT pv.stock_quantity INTO tirzepatide_30mg FROM product_variations pv
  JOIN products p ON p.id = pv.product_id
  WHERE LOWER(p.name) LIKE '%tirzepatide%' AND (pv.name = '30mg' OR pv.quantity_mg = 30.0) LIMIT 1;
  
  RAISE NOTICE '✅ Inventory update completed successfully!';
  RAISE NOTICE '📦 Total products: %', total_products;
  RAISE NOTICE '📊 Total variations: %', total_variations;
  RAISE NOTICE '💉 Tirzepatide stock - 15mg: %, 20mg: %, 30mg: %', tirzepatide_15mg, tirzepatide_20mg, tirzepatide_30mg;
END $$;

