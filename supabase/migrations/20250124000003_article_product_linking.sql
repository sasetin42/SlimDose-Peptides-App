-- Add related_product_ids column to guide_topics for linking articles to products
ALTER TABLE guide_topics 
ADD COLUMN IF NOT EXISTS related_product_ids UUID[] DEFAULT '{}';

-- Add a comment to document the column
COMMENT ON COLUMN guide_topics.related_product_ids IS 'Array of product IDs related to this article';
