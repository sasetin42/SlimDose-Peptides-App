-- Migration: Add inclusions field for complete peptide sets
-- This allows products to display what's included in the kit/set

-- Add inclusions column to products table
ALTER TABLE products 
ADD COLUMN inclusions TEXT[];

-- Add comment for documentation
COMMENT ON COLUMN products.inclusions IS 'Array of items included in the complete set/kit. Each item is a text string describing what is included.';

-- Example: Update Tirzepatide with inclusions (customize as needed)
UPDATE products 
SET inclusions = ARRAY[
  '🧬 Peptide and bacteriostatic water',
  '🧬 Syringe for reconstitution',
  '🧬 6pcs Insulin Syringe',
  '🧬 Plastic container and box',
  '🧬 10pcs alcohol pads'
]
WHERE name LIKE '%Tirzepatide%';

-- You can add inclusions to other products too
-- Example for other peptides (uncomment and customize):
/*
UPDATE products 
SET inclusions = ARRAY[
  '🧬 Peptide and bacteriostatic water',
  '🧬 Syringe for reconstitution',
  '🧬 6pcs Insulin Syringe',
  '🧬 Plastic container and box',
  '🧬 10pcs alcohol pads'
]
WHERE name = 'BPC-157';
*/

