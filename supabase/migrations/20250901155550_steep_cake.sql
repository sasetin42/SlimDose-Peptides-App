/*
  # Add ClickEats Menu Items and Categories

  1. New Categories
    - Add dim-sum, noodles, rice-dishes, beverages categories for ClickEats

  2. New Menu Items
    - Platter category: Extra Small, Small, Medium, Large platters with dim sum assortments
    - NomBox Sets: Feast, Mid, Mini boxes with variety packs
    - Special Platters: Holiday, Trio, Siomai, Prawn, Hakaw platters
    - Individual Dim Sum Items: Various dumplings, bao, and traditional items
    - Noodle dishes: Various Asian noodle preparations
    - Rice dishes: Fried rice and rice-based meals
    - Beverages: Traditional Asian teas and drinks

  3. Features
    - Auto-generated UUIDs for all items
    - Detailed descriptions with serving sizes and piece counts
    - Appropriate pricing for each platter size
    - High-quality dim sum and Asian food images from Pexels
    - Proper categorization for easy browsing
*/

-- First, add the new categories for ClickEats
INSERT INTO categories (id, name, icon, sort_order, active) VALUES
  ('dim-sum', 'Dim Sum', '🥟', 1, true),
  ('noodles', 'Noodles', '🍜', 2, true),
  ('rice-dishes', 'Rice Dishes', '🍚', 3, true),
  ('beverages', 'Beverages', '🍵', 4, true)
ON CONFLICT (id) DO NOTHING;

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

-- Insert Noodle Dishes
INSERT INTO menu_items (name, description, base_price, category, popular, available, image_url) VALUES
  ('Beef Chow Fun', 'Stir-fried wide rice noodles with tender beef and bean sprouts', 280, 'noodles', true, true, 'https://images.pexels.com/photos/4518843/pexels-photo-4518843.jpeg?auto=compress&cs=tinysrgb&w=800'),
  
  ('Dan Dan Noodles', 'Sichuan noodles with spicy sesame sauce and minced pork', 250, 'noodles', false, true, 'https://images.pexels.com/photos/4518843/pexels-photo-4518843.jpeg?auto=compress&cs=tinysrgb&w=800'),
  
  ('Wonton Noodle Soup', 'Fresh egg noodles in clear broth with pork and shrimp wontons', 220, 'noodles', true, true, 'https://images.pexels.com/photos/4518843/pexels-photo-4518843.jpeg?auto=compress&cs=tinysrgb&w=800'),
  
  ('Pad Thai', 'Thai stir-fried rice noodles with shrimp, tofu, and peanuts', 260, 'noodles', false, true, 'https://images.pexels.com/photos/4518843/pexels-photo-4518843.jpeg?auto=compress&cs=tinysrgb&w=800'),
  
  ('Chicken Lo Mein', 'Soft egg noodles tossed with chicken and vegetables', 240, 'noodles', false, true, 'https://images.pexels.com/photos/4518843/pexels-photo-4518843.jpeg?auto=compress&cs=tinysrgb&w=800');

-- Insert Rice Dishes
INSERT INTO menu_items (name, description, base_price, category, popular, available, image_url) VALUES
  ('Yang Chow Fried Rice', 'Classic fried rice with shrimp, char siu, and eggs', 280, 'rice-dishes', true, true, 'https://images.pexels.com/photos/4518843/pexels-photo-4518843.jpeg?auto=compress&cs=tinysrgb&w=800'),
  
  ('Beef and Broccoli Rice', 'Tender beef with fresh broccoli in savory sauce over steamed rice', 320, 'rice-dishes', false, true, 'https://images.pexels.com/photos/4518843/pexels-photo-4518843.jpeg?auto=compress&cs=tinysrgb&w=800'),
  
  ('Sweet and Sour Pork Rice', 'Crispy pork with pineapple and bell peppers in tangy sauce', 300, 'rice-dishes', false, true, 'https://images.pexels.com/photos/4518843/pexels-photo-4518843.jpeg?auto=compress&cs=tinysrgb&w=800'),
  
  ('Mapo Tofu Rice', 'Silky tofu in spicy Sichuan sauce with ground pork over rice', 260, 'rice-dishes', false, true, 'https://images.pexels.com/photos/4518843/pexels-photo-4518843.jpeg?auto=compress&cs=tinysrgb&w=800'),
  
  ('Kung Pao Chicken Rice', 'Diced chicken with peanuts and chili peppers in savory sauce', 290, 'rice-dishes', false, true, 'https://images.pexels.com/photos/4518843/pexels-photo-4518843.jpeg?auto=compress&cs=tinysrgb&w=800');

-- Insert Beverages
INSERT INTO menu_items (name, description, base_price, category, popular, available, image_url) VALUES
  ('Jasmine Tea', 'Fragrant jasmine tea served hot in traditional pot', 80, 'beverages', true, true, 'https://images.pexels.com/photos/4518843/pexels-photo-4518843.jpeg?auto=compress&cs=tinysrgb&w=800'),
  
  ('Oolong Tea', 'Premium oolong tea with complex floral notes', 100, 'beverages', false, true, 'https://images.pexels.com/photos/4518843/pexels-photo-4518843.jpeg?auto=compress&cs=tinysrgb&w=800'),
  
  ('Chrysanthemum Tea', 'Cooling herbal tea with dried chrysanthemum flowers', 90, 'beverages', false, true, 'https://images.pexels.com/photos/4518843/pexels-photo-4518843.jpeg?auto=compress&cs=tinysrgb&w=800'),
  
  ('Fresh Lychee Juice', 'Sweet and refreshing lychee juice served chilled', 120, 'beverages', false, true, 'https://images.pexels.com/photos/4518843/pexels-photo-4518843.jpeg?auto=compress&cs=tinysrgb&w=800'),
  
  ('Winter Melon Tea', 'Traditional Chinese tea with subtle sweet flavor', 85, 'beverages', false, true, 'https://images.pexels.com/photos/4518843/pexels-photo-4518843.jpeg?auto=compress&cs=tinysrgb&w=800'),
  
  ('Hot Soy Milk', 'Fresh soy milk served hot with optional sugar', 70, 'beverages', false, true, 'https://images.pexels.com/photos/4518843/pexels-photo-4518843.jpeg?auto=compress&cs=tinysrgb&w=800');

-- Add variations for Hot Soy Milk
INSERT INTO variations (menu_item_id, name, price) VALUES
  ((SELECT id FROM menu_items WHERE name = 'Hot Soy Milk'), 'Plain', 0),
  ((SELECT id FROM menu_items WHERE name = 'Hot Soy Milk'), 'Sweetened', 10)
ON CONFLICT DO NOTHING;

-- Add variations for Cheung Fun (if we want to add it later)
-- This is commented out since it's not in the current menu list
-- INSERT INTO menu_items (name, description, base_price, category, popular, available, image_url) VALUES
--   ('Cheung Fun (Rice Noodle Rolls)', 'Silky rice noodle rolls with choice of shrimp, beef, or char siu', 180, 'dim-sum', false, true, 'https://images.pexels.com/photos/4518843/pexels-photo-4518843.jpeg?auto=compress&cs=tinysrgb&w=800');

-- INSERT INTO variations (menu_item_id, name, price) VALUES
--   ((SELECT id FROM menu_items WHERE name = 'Cheung Fun (Rice Noodle Rolls)'), 'Shrimp', 0),
--   ((SELECT id FROM menu_items WHERE name = 'Cheung Fun (Rice Noodle Rolls)'), 'Beef', 20),
--   ((SELECT id FROM menu_items WHERE name = 'Cheung Fun (Rice Noodle Rolls)'), 'Char Siu', 15)
-- ON CONFLICT DO NOTHING;