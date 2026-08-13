/*
  # Add tracking information to orders table

  1. Changes
    - Add `tracking_number` column (text, nullable)
    - Add `shipping_note` column (text, nullable)
*/

DO $$ 
BEGIN
  -- Add tracking_number column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'tracking_number'
  ) THEN
    ALTER TABLE orders ADD COLUMN tracking_number TEXT;
  END IF;

  -- Add shipping_note column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'shipping_note'
  ) THEN
    ALTER TABLE orders ADD COLUMN shipping_note TEXT;
  END IF;
END $$;
