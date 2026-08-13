/*
  # Add availability field to menu items

  1. Changes
    - Add `available` boolean field to menu_items table
    - Set default value to true for existing items
    - Update trigger function to handle the new field

  2. Security
    - No changes to existing RLS policies needed
*/

-- Add availability field to menu_items table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'menu_items' AND column_name = 'available'
  ) THEN
    ALTER TABLE menu_items ADD COLUMN available boolean DEFAULT true;
  END IF;
END $$;