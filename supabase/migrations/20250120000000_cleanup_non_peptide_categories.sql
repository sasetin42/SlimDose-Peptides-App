-- Cleanup Non-Peptide Categories
-- Remove all categories that are not related to peptides
-- Keep only peptide-related categories: all, research, cosmetic, wellness, supplies

DO $$
BEGIN
  -- First, update any products that might be using non-peptide categories
  -- Move them to 'research' as default
  UPDATE products 
  SET category = 'research'
  WHERE category NOT IN ('all', 'research', 'cosmetic', 'wellness', 'supplies');
  
  -- Now delete non-peptide categories (safe since we've moved products)
  -- Delete old cafe/restaurant categories
  DELETE FROM categories WHERE id IN (
    'hot-coffee',
    'iced-coffee',
    'non-coffee',
    'food'
  );
  
  -- Delete old ClickEats categories
  DELETE FROM categories WHERE id IN (
    'dim-sum',
    'noodles',
    'rice-dishes',
    'beverages'
  );
  
  -- Delete old peptide categories that are no longer used
  DELETE FROM categories WHERE id IN (
    'performance',
    'healing',
    'cognitive',
    'weight-management',
    'anti-aging',
    'recovery'
  );
  
  -- Deactivate and then delete any other categories that aren't in our valid list
  -- First deactivate them
  UPDATE categories 
  SET active = false, updated_at = NOW()
  WHERE id NOT IN ('all', 'research', 'cosmetic', 'wellness', 'supplies');
  
  -- Then safely delete inactive categories that have no products
  DELETE FROM categories 
  WHERE active = false
    AND id NOT IN (
      SELECT DISTINCT category FROM products WHERE category IS NOT NULL
    );
  
  RAISE NOTICE '✅ Non-peptide categories removed';
END $$;

-- Ensure the core peptide categories exist with correct values
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
  active = EXCLUDED.active,
  updated_at = NOW();

-- Verify: Show summary of active categories
DO $$
DECLARE
  category_count INTEGER;
  category_list TEXT;
BEGIN
  SELECT COUNT(*) INTO category_count 
  FROM categories 
  WHERE active = true;
  
  SELECT string_agg(id, ', ' ORDER BY sort_order) INTO category_list
  FROM categories 
  WHERE active = true;
  
  RAISE NOTICE '✅ Active peptide categories: %', category_count;
  RAISE NOTICE '✅ Categories: %', category_list;
END $$;
