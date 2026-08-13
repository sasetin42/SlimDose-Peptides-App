/*
  # Create Categories Management System

  1. New Tables
    - `categories`
      - `id` (text, primary key) - kebab-case identifier
      - `name` (text) - display name
      - `icon` (text) - emoji or icon
      - `sort_order` (integer) - for ordering categories
      - `active` (boolean) - whether category is active
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on categories table
    - Add policies for public read access
    - Add policies for authenticated admin access

  3. Data Migration
    - Insert existing categories from the current hardcoded list
*/

-- Create categories table
CREATE TABLE IF NOT EXISTS categories (
  id text PRIMARY KEY,
  name text NOT NULL,
  icon text NOT NULL DEFAULT '☕',
  sort_order integer NOT NULL DEFAULT 0,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access
CREATE POLICY "Anyone can read categories"
  ON categories
  FOR SELECT
  TO public
  USING (active = true);

-- Create policies for authenticated admin access
CREATE POLICY "Authenticated users can manage categories"
  ON categories
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create updated_at trigger for categories
CREATE TRIGGER update_categories_updated_at
  BEFORE UPDATE ON categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert existing categories
INSERT INTO categories (id, name, icon, sort_order, active) VALUES
  ('hot-coffee', 'Hot Coffee', '☕', 1, true),
  ('iced-coffee', 'Iced Coffee', '🧊', 2, true),
  ('non-coffee', 'Non-Coffee', '🫖', 3, true),
  ('food', 'Food & Pastries', '🥐', 4, true)
ON CONFLICT (id) DO NOTHING;

-- Add foreign key constraint to menu_items table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'menu_items_category_fkey'
  ) THEN
    ALTER TABLE menu_items 
    ADD CONSTRAINT menu_items_category_fkey 
    FOREIGN KEY (category) REFERENCES categories(id);
  END IF;
END $$;