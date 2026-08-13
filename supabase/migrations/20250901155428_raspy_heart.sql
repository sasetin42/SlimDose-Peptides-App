/*
  # Add ClickEats Menu Items

  1. New Menu Items
    - Platter category: Extra Small, Small, Medium, Large platters with dim sum assortments
    - NomBox Sets: Feast, Mid, Mini boxes with variety packs
    - Special Platters: Holiday, Trio, Siomai, Prawn, Hakaw platters
    - Individual Dim Sum Items: Various dumplings, bao, and traditional items

  2. Features
    - Auto-generated UUIDs for all items
    - Detailed descriptions with serving sizes and piece counts
    - Appropriate pricing for each platter size
    - High-quality dim sum images from Pexels
    - Proper categorization for easy browsing

  3. Categories
    - Updates menu with authentic dim sum and platter offerings
    - Maintains existing category structure
*/

-- Insert Platter Items
INSERT INTO menu_items (name, description, base_price, category, popular, available, image_url) VALUES
  ('Extra Small Platter', 'Perfect for small gatherings (3-5 pax) - 50 pieces total: 10 Pork Xiao Long Bao, 10 Molten Chocolate Xiao Long Bao, 10 Pan Fried Pork Dumpling, 10 Prawn Dumpling, 10 Pork & Shrimp Siomai', 998, 'dim-sum', true, true, 'https://images.pexels.com/photos/4518843/pexels-photo-4518843.jpeg?auto=compress&cs=tinysrgb&w=800'),
  
  ('Small Platter', 'Great for family meals (5-8 pax) - 60 pieces total: 10 Pork Xiao Long Bao, 14 Molten Chocolate Xiao Long Bao, 10 Pan Fried Pork Dumpling, 12 Prawn Dumpling, 14 Pork & Shrimp Siomai', 1100, 'dim-sum', true, true, 'https://images.pexels.com/photos/4518843/pexels-photo-4518843.jpeg?auto=compress&cs=tinysrgb&w=800'),
  
  ('Medium Platter', 'Perfect for parties (10-12 pax) - 80 pieces total: 14 Pork Xiao Long Bao, 16 Molten Chocolate Xiao Long Bao, 18 Pan Fried Pork Dumpling, 14 Prawn Dumpling, 18 Pork & Shrimp Siomai', 1500, 'dim-sum', true, true, 'https://images.pexels.com/photos/4518843/pexels-photo-4518843.jpeg?auto=compress&cs=tinysrgb&w=800'),
  
  ('Large Platter', 'Ultimate feast for large groups (15-18 pax) - 100 pieces total: 20 Pork Xiao Long Bao, 20 Molten Chocolate Xiao Long Bao, 20 Pan Fried Pork Dumpling, 20 Prawn Dumpling, 20 Pork & Shrimp Siomai', 1900, 'dim-sum', true, true, 'https://images.pexels.com/photos/4518843/pexels-photo-4518843.jpeg?auto=compress&cs=tinysrgb&w=800');

-- Insert NomBox Sets
INSERT INTO menu_items (name, description, base_price, category, popular, available, image_url) VALUES
  ('NomBox Feast', 'The ultimate dim sum experience - 24 pieces total: 3 Mongopao, 3 Brown Sugar Mantho, 3 Taro Balls, 3 Pork Xiao Long Bao, 3 Pork & Veggie, 3 Pork & Shrimp Siomai, 3 Hakaw, 3 Prawn Dumplings', 528, 'dim-sum', true, true, 'https://images.pexels.com/photos/5409751/pexels-photo-5409751.jpeg?auto=compress&cs=tinysrgb&w=800'),
  
  ('NomBox Mid', 'Perfect variety pack - 17 pieces total: 3 Mongopao, 2 Brown Sugar Mantho, 2 Taro Balls, 2 Pork Xiao Long Bao, 2 Pork & Veggie, 2 Pork Shrimp Siomai, 2 Hakaw, 2 Pork & Mushroom', 368, 'dim-sum', true, true, 'https://images.pexels.com/photos/5409751/pexels-photo-5409751.jpeg?auto=compress&cs=tinysrgb&w=800'),
  
  ('NomBox Mini', 'Great starter pack - 12 pieces total: 2 Mongopao, 2 Brown Sugar Mantho, 2 Pork Xiao Long Bao, 2 Pork & Veggie, 2 Pork Shrimp Siomai, 2 Hakaw', 238, 'dim-sum', false, true, 'https://images.pexels.com/photos/5409751/pexels-photo-5409751.jpeg?auto=compress&cs=tinysrgb&w=800');

-- Insert Special Platters
INSERT INTO menu_items (name, description, base_price, category, popular, available, image_url) VALUES
  ('Holiday Platter', 'Special festive assortment perfect for celebrations - 80 pieces of our finest dim sum selection', 1650, 'dim-sum', true, true, 'https://images.pexels.com/photos/4518843/pexels-photo-4518843.jpeg?auto=compress&cs=tinysrgb&w=800'),
  
  ('Trio Platter', 'Three classic favorites - 60 pieces total: 20 Siomai, 20 Hakaw, 20 Prawn Dumplings', 1200, 'dim-sum', false, true, 'https://images.pexels.com/photos/4518843/pexels-photo-4518843.jpeg?auto=compress&cs=tinysrgb&w=800'),
  
  ('Siomai Platter', 'For siomai lovers - 55 pieces of our signature pork and shrimp siomai', 998, 'dim-sum', false, true, 'https://images.pexels.com/photos/4518843/pexels-photo-4518843.jpeg?auto=compress&cs=tinysrgb&w=800'),
  
  ('Prawn Platter', 'Fresh prawn dumplings - 60 pieces of succulent prawn dumplings', 1200, 'dim-sum', false, true, 'https://images.pexels.com/photos/4518843/pexels-photo-4518843.jpeg?auto=compress&cs=tinysrgb&w=800'),
  
  ('Hakaw XS Platter', 'Delicate shrimp dumplings - 50 pieces of traditional hakaw', 1100, 'dim-sum', false, true, 'https://images.pexels.com/photos/4518843/pexels-photo-4518843.jpeg?auto=compress&cs=tinysrgb&w=800'),
  
  ('Hakaw Small Platter', 'More hakaw goodness - 60 pieces of our signature shrimp dumplings', 1300, 'dim-sum', false, true, 'https://images.pexels.com/photos/4518843/pexels-photo-4518843.jpeg?auto=compress&cs=tinysrgb&w=800');

-- Insert Individual Dim Sum Items
INSERT INTO menu_items (name, description, base_price, category, popular, available, image_url) VALUES
  ('Pork Xiao Long Bao', 'Traditional soup dumplings filled with savory pork and rich broth', 180, 'dim-sum', true, true, 'https://images.pexels.com/photos/4518843/pexels-photo-4518843.jpeg?auto=compress&cs=tinysrgb&w=800'),
  
  ('Molten Chocolate Xiao Long Bao', 'Innovative dessert dumpling with warm molten chocolate center', 220, 'dim-sum', true, true, 'https://images.pexels.com/photos/4518843/pexels-photo-4518843.jpeg?auto=compress&cs=tinysrgb&w=800'),
  
  ('Pan Fried Pork Dumpling', 'Crispy bottom dumplings filled with seasoned pork', 160, 'dim-sum', false, true, 'https://images.pexels.com/photos/4518843/pexels-photo-4518843.jpeg?auto=compress&cs=tinysrgb&w=800'),
  
  ('Prawn Dumpling (Hakaw)', 'Translucent dumplings filled with fresh prawns and bamboo shoots', 180, 'dim-sum', true, true, 'https://images.pexels.com/photos/4518843/pexels-photo-4518843.jpeg?auto=compress&cs=tinysrgb&w=800'),
  
  ('Pork & Shrimp Siomai', 'Open-topped dumplings with pork, shrimp, and mushrooms', 160, 'dim-sum', true, true, 'https://images.pexels.com/photos/4518843/pexels-photo-4518843.jpeg?auto=compress&cs=tinysrgb&w=800'),
  
  ('Mongopao', 'Fluffy steamed buns with sweet mango filling', 140, 'dim-sum', false, true, 'https://images.pexels.com/photos/4518843/pexels-photo-4518843.jpeg?auto=compress&cs=tinysrgb&w=800'),
  
  ('Brown Sugar Mantho', 'Sweet steamed buns with rich brown sugar flavor', 120, 'dim-sum', false, true, 'https://images.pexels.com/photos/4518843/pexels-photo-4518843.jpeg?auto=compress&cs=tinysrgb&w=800'),
  
  ('Taro Balls', 'Chewy taro-flavored balls, a popular Taiwanese treat', 100, 'dim-sum', false, true, 'https://images.pexels.com/photos/4518843/pexels-photo-4518843.jpeg?auto=compress&cs=tinysrgb&w=800'),
  
  ('Pork & Veggie Dumpling', 'Healthy dumplings filled with pork and fresh vegetables', 150, 'dim-sum', false, true, 'https://images.pexels.com/photos/4518843/pexels-photo-4518843.jpeg?auto=compress&cs=tinysrgb&w=800'),
  
  ('Pork & Mushroom Dumpling', 'Savory dumplings with pork and shiitake mushrooms', 160, 'dim-sum', false, true, 'https://images.pexels.com/photos/4518843/pexels-photo-4518843.jpeg?auto=compress&cs=tinysrgb&w=800');

-- Update existing items to better match ClickEats branding
UPDATE menu_items 
SET 
  name = 'Har Gow (Shrimp Dumplings)',
  description = 'Delicate translucent dumplings filled with fresh shrimp and bamboo shoots - a dim sum classic'
WHERE name = 'Har Gow (Shrimp Dumplings)';

UPDATE menu_items 
SET 
  name = 'Siu Mai (Pork & Shrimp Dumplings)',
  description = 'Traditional open-topped dumplings with seasoned pork, shrimp, and mushrooms'
WHERE name = 'Siu Mai (Pork & Shrimp Dumplings)';

UPDATE menu_items 
SET 
  name = 'Char Siu Bao (BBQ Pork Buns)',
  description = 'Fluffy steamed buns filled with sweet and savory Chinese BBQ pork'
WHERE name = 'Char Siu Bao (BBQ Pork Buns)';