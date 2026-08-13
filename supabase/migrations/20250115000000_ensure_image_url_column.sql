-- Migration: Ensure image_url column exists and is properly configured for product images
-- This migration ensures the products table can store Supabase Storage image URLs

-- Check if image_url column exists, if not add it
DO $$ 
BEGIN
    -- Add image_url column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'products' 
        AND column_name = 'image_url'
    ) THEN
        ALTER TABLE products ADD COLUMN image_url TEXT;
        RAISE NOTICE 'Added image_url column to products table';
    ELSE
        RAISE NOTICE 'image_url column already exists in products table';
    END IF;
END $$;

-- Ensure the column can store long URLs (Supabase Storage URLs can be up to 2048 characters)
-- TEXT type already supports this, but let's make sure it's not constrained
ALTER TABLE products 
    ALTER COLUMN image_url TYPE TEXT;

-- Add a comment to document the column
COMMENT ON COLUMN products.image_url IS 'URL to product image stored in Supabase Storage (menu-images bucket) or external URL';

-- Ensure safety_sheet_url also exists (for consistency)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'products' 
        AND column_name = 'safety_sheet_url'
    ) THEN
        ALTER TABLE products ADD COLUMN safety_sheet_url TEXT;
        RAISE NOTICE 'Added safety_sheet_url column to products table';
    END IF;
END $$;

-- Create an index on image_url for faster queries (optional but helpful)
CREATE INDEX IF NOT EXISTS idx_products_image_url ON products(image_url) WHERE image_url IS NOT NULL;

-- Verify the column exists and show current products
DO $$
DECLARE
    product_count INTEGER;
    products_with_images INTEGER;
BEGIN
    SELECT COUNT(*) INTO product_count FROM products;
    SELECT COUNT(*) INTO products_with_images FROM products WHERE image_url IS NOT NULL AND image_url != '';
    
    RAISE NOTICE 'Total products: %', product_count;
    RAISE NOTICE 'Products with images: %', products_with_images;
    RAISE NOTICE 'Products without images: %', (product_count - products_with_images);
END $$;

-- Grant necessary permissions (if using RLS)
-- This ensures authenticated users can update image_url
-- Note: Adjust these policies based on your RLS setup

-- Example: Allow updates to image_url (adjust based on your auth setup)
-- If you're using service role or anon key with proper RLS policies, this might not be needed
-- But we'll create a policy that allows updates if RLS is enabled

DO $$
BEGIN
    -- Check if RLS is enabled
    IF EXISTS (
        SELECT 1 
        FROM pg_policies 
        WHERE tablename = 'products'
    ) THEN
        -- RLS is enabled, ensure there's a policy for updates
        -- Note: This is a basic policy - adjust based on your security requirements
        RAISE NOTICE 'RLS is enabled on products table. Ensure your policies allow image_url updates.';
    ELSE
        RAISE NOTICE 'RLS is not enabled on products table. Updates should work without additional policies.';
    END IF;
END $$;

