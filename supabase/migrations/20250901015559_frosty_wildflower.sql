/*
  # Add M&C Bakehouse Menu Items

  1. New Menu Items
    - Bread category: Artisan breads including ciabatta, brioche, sourdough varieties
    - Biscotti category: Almond, mango almond, and biscotti bites
    - Soft Bread category: Pan de coco, cheese rolls, and various filled breads
    - Cookies category: Chocolate chip cookies
    - Banana Bread category: Plain and chocolate varieties
    - Cake category: Chocolate, carrot, and biscoff cheesecake
    - Others category: Artisan biscocho and butterscotch

  2. Features
    - Variations for items with multiple options (brioche, olive bread, etc.)
    - Special availability notes for sourdough and focaccia items
    - Proper categorization and pricing
    - High-quality bakery images from Pexels

  3. Categories
    - Updates existing food category items
    - Maintains existing coffee categories
*/

-- Insert bread items
INSERT INTO menu_items (id, name, description, base_price, category, popular, available, image_url) VALUES
  ('artisan-ciabatta', 'Artisan Ciabatta', 'Traditional Italian bread with a crispy crust and airy interior, perfect for sandwiches or dipping', 180, 'food', false, true, 'https://images.pexels.com/photos/1775043/pexels-photo-1775043.jpeg?auto=compress&cs=tinysrgb&w=800'),
  ('brioche', 'Brioche', 'Rich, buttery French bread with a golden crust and tender crumb', 300, 'food', true, true, 'https://images.pexels.com/photos/4110256/pexels-photo-4110256.jpeg?auto=compress&cs=tinysrgb&w=800'),
  ('olive-bread', 'Olive Bread', 'Mediterranean-style bread infused with premium olives', 250, 'food', false, true, 'https://images.pexels.com/photos/4110007/pexels-photo-4110007.jpeg?auto=compress&cs=tinysrgb&w=800'),
  ('sourdough-sandwich', 'Sourdough Sandwich Loaf', 'Tangy sourdough perfect for sandwiches (Available Wednesday & Saturday)', 280, 'food', true, true, 'https://images.pexels.com/photos/4110251/pexels-photo-4110251.jpeg?auto=compress&cs=tinysrgb&w=800'),
  ('sourdough-bread', 'Sourdough Bread', 'Classic artisan sourdough with complex flavors (Available Wednesday & Saturday)', 280, 'food', true, true, 'https://images.pexels.com/photos/1775043/pexels-photo-1775043.jpeg?auto=compress&cs=tinysrgb&w=800'),
  ('sourdough-olive', 'Sourdough Olive Bread', 'Tangy sourdough with Mediterranean olives (Available Wednesday & Saturday)', 350, 'food', false, true, 'https://images.pexels.com/photos/4110007/pexels-photo-4110007.jpeg?auto=compress&cs=tinysrgb&w=800'),
  ('sourdough-olive-cheese', 'Sourdough Olive and Cheese Bread', 'Sourdough with olives and aged cheese (Available Wednesday & Saturday)', 350, 'food', false, true, 'https://images.pexels.com/photos/4110007/pexels-photo-4110007.jpeg?auto=compress&cs=tinysrgb&w=800'),
  ('jalapeno-cheddar-sourdough', 'Jalapeño and Cheddar Cheese Sourdough', 'Spicy jalapeños with sharp cheddar in tangy sourdough (Available Wednesday & Saturday)', 350, 'food', false, true, 'https://images.pexels.com/photos/4110251/pexels-photo-4110251.jpeg?auto=compress&cs=tinysrgb&w=800'),
  ('focaccia', 'Focaccia', 'Italian flatbread with herbs and olive oil (Available Wednesday & Saturday)', 250, 'food', false, true, 'https://images.pexels.com/photos/4110256/pexels-photo-4110256.jpeg?auto=compress&cs=tinysrgb&w=800'),
  ('baguette', 'Baguette', 'Classic French bread with crispy crust (Available Saturday)', 180, 'food', false, true, 'https://images.pexels.com/photos/1775043/pexels-photo-1775043.jpeg?auto=compress&cs=tinysrgb&w=800')
ON CONFLICT (id) DO NOTHING;

-- Insert biscotti items
INSERT INTO menu_items (id, name, description, base_price, category, popular, available, image_url) VALUES
  ('almond-biscotti', 'Almond Biscotti', 'Traditional Italian twice-baked cookies with whole almonds, perfect with coffee', 275, 'food', true, true, 'https://images.pexels.com/photos/4110252/pexels-photo-4110252.jpeg?auto=compress&cs=tinysrgb&w=800'),
  ('mango-almond-biscotti', 'Mango Almond Biscotti', 'Tropical twist on classic biscotti with dried mango and almonds', 300, 'food', false, true, 'https://images.pexels.com/photos/4110252/pexels-photo-4110252.jpeg?auto=compress&cs=tinysrgb&w=800'),
  ('biscotti-bites', 'Biscotti Bites', 'Mini biscotti perfect for sharing or a quick sweet treat', 100, 'food', false, true, 'https://images.pexels.com/photos/4110252/pexels-photo-4110252.jpeg?auto=compress&cs=tinysrgb&w=800')
ON CONFLICT (id) DO NOTHING;

-- Insert soft bread items
INSERT INTO menu_items (id, name, description, base_price, category, popular, available, image_url) VALUES
  ('pan-de-coco', 'Pan de Coco', 'Sweet Filipino bread filled with coconut strips', 45, 'food', true, true, 'https://images.pexels.com/photos/4110256/pexels-photo-4110256.jpeg?auto=compress&cs=tinysrgb&w=800'),
  ('cheese-roll', 'Cheese Roll', 'Soft bread roll filled with creamy cheese', 50, 'food', true, true, 'https://images.pexels.com/photos/4110256/pexels-photo-4110256.jpeg?auto=compress&cs=tinysrgb&w=800'),
  ('ham-cheese', 'Ham and Cheese', 'Classic combination of ham and cheese in soft bread', 50, 'food', false, true, 'https://images.pexels.com/photos/4110256/pexels-photo-4110256.jpeg?auto=compress&cs=tinysrgb&w=800'),
  ('cheesy-tuna', 'Cheesy Tuna', 'Tuna salad with melted cheese in soft bread', 50, 'food', false, true, 'https://images.pexels.com/photos/4110256/pexels-photo-4110256.jpeg?auto=compress&cs=tinysrgb&w=800'),
  ('chicken-floss', 'Chicken Floss', 'Soft bread topped with savory chicken floss', 55, 'food', false, true, 'https://images.pexels.com/photos/4110256/pexels-photo-4110256.jpeg?auto=compress&cs=tinysrgb&w=800'),
  ('sausage-parmesan', 'Sausage Parmesan', 'Italian sausage with parmesan cheese in soft bread', 55, 'food', false, true, 'https://images.pexels.com/photos/4110256/pexels-photo-4110256.jpeg?auto=compress&cs=tinysrgb&w=800'),
  ('bacon-cheese', 'Bacon and Cheese', 'Crispy bacon with melted cheese in soft bread', 55, 'food', false, true, 'https://images.pexels.com/photos/4110256/pexels-photo-4110256.jpeg?auto=compress&cs=tinysrgb&w=800'),
  ('cheese-ensaymada', 'Cheese Ensaymada', 'Filipino brioche-style bread topped with cheese and sugar', 60, 'food', true, true, 'https://images.pexels.com/photos/4110256/pexels-photo-4110256.jpeg?auto=compress&cs=tinysrgb&w=800')
ON CONFLICT (id) DO NOTHING;

-- Insert cookies
INSERT INTO menu_items (id, name, description, base_price, category, popular, available, image_url) VALUES
  ('chocolate-chip-cookies', 'Chocolate Chip Cookies', 'Classic homemade cookies with premium chocolate chips, baked fresh daily', 300, 'food', true, true, 'https://images.pexels.com/photos/4110252/pexels-photo-4110252.jpeg?auto=compress&cs=tinysrgb&w=800')
ON CONFLICT (id) DO NOTHING;

-- Insert banana bread
INSERT INTO menu_items (id, name, description, base_price, category, popular, available, image_url) VALUES
  ('banana-bread', 'Banana Bread', 'Moist, flavorful banana bread made with ripe bananas', 325, 'food', true, true, 'https://images.pexels.com/photos/4110251/pexels-photo-4110251.jpeg?auto=compress&cs=tinysrgb&w=800'),
  ('banana-bread-hershey', 'Banana Bread with Hershey''s', 'Our signature banana bread loaded with Hershey''s chocolate chips', 375, 'food', true, true, 'https://images.pexels.com/photos/4110251/pexels-photo-4110251.jpeg?auto=compress&cs=tinysrgb&w=800')
ON CONFLICT (id) DO NOTHING;

-- Insert cakes
INSERT INTO menu_items (id, name, description, base_price, category, popular, available, image_url) VALUES
  ('chocolate-cake', 'Chocolate Cake', 'Rich, decadent chocolate cake perfect for celebrations', 1400, 'food', true, true, 'https://images.pexels.com/photos/291528/pexels-photo-291528.jpeg?auto=compress&cs=tinysrgb&w=800'),
  ('carrot-cake', 'Carrot Cake', 'Moist carrot cake with cream cheese frosting and walnuts', 1600, 'food', false, true, 'https://images.pexels.com/photos/291528/pexels-photo-291528.jpeg?auto=compress&cs=tinysrgb&w=800'),
  ('biscoff-cheesecake', 'Biscoff Cheesecake', 'Creamy cheesecake with Biscoff cookie crust and topping', 2500, 'food', true, true, 'https://images.pexels.com/photos/291528/pexels-photo-291528.jpeg?auto=compress&cs=tinysrgb&w=800')
ON CONFLICT (id) DO NOTHING;

-- Insert other items
INSERT INTO menu_items (id, name, description, base_price, category, popular, available, image_url) VALUES
  ('artisan-biscocho', 'Artisan Biscocho', 'Traditional Filipino twice-baked bread, crispy and sweet', 110, 'food', false, true, 'https://images.pexels.com/photos/4110252/pexels-photo-4110252.jpeg?auto=compress&cs=tinysrgb&w=800'),
  ('butterscotch', 'Butterscotch', 'Rich butterscotch candy made with real butter and brown sugar', 75, 'food', false, true, 'https://images.pexels.com/photos/4110252/pexels-photo-4110252.jpeg?auto=compress&cs=tinysrgb&w=800')
ON CONFLICT (id) DO NOTHING;

-- Add variations for brioche
INSERT INTO variations (menu_item_id, name, price) VALUES
  ((SELECT id FROM menu_items WHERE name = 'Brioche'), 'Plain', 0),
  ((SELECT id FROM menu_items WHERE name = 'Brioche'), 'Almond', 50)
ON CONFLICT DO NOTHING;

-- Add variations for olive bread
INSERT INTO variations (menu_item_id, name, price) VALUES
  ((SELECT id FROM menu_items WHERE name = 'Olive Bread'), 'Plain', 0),
  ((SELECT id FROM menu_items WHERE name = 'Olive Bread'), 'Olives and Cheese', 50)
ON CONFLICT DO NOTHING;

-- Add variations for banana bread
INSERT INTO variations (menu_item_id, name, price) VALUES
  ((SELECT id FROM menu_items WHERE name = 'Banana Bread'), 'Plain', 0),
  ((SELECT id FROM menu_items WHERE name = 'Banana Bread with Hershey''s'), 'With Hershey''s Chocolate', 50)
ON CONFLICT DO NOTHING;