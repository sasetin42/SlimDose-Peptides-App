-- Migration: Update peptide categories to be more suitable for peptide business
-- Update category names and descriptions to be more professional and peptide-specific

-- Update categories with better peptide-specific names
UPDATE categories SET name = 'All Products', sort_order = 0 WHERE id = 'all';
UPDATE categories SET name = 'Growth & Hormones', sort_order = 1 WHERE id = 'research';
UPDATE categories SET name = 'Anti-Aging & Skin', sort_order = 2 WHERE id = 'cosmetic';
UPDATE categories SET name = 'Athletic Performance', sort_order = 3 WHERE id = 'performance';
UPDATE categories SET name = 'Recovery & Repair', sort_order = 4 WHERE id = 'healing';
UPDATE categories SET name = 'Brain & Focus', sort_order = 5 WHERE id = 'cognitive';

-- Note: These category IDs remain the same for database consistency
-- Only the display names are updated for better clarity

