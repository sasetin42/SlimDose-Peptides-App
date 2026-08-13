-- Migration: Add size variations for all peptide products
-- This adds 2mg, 5mg, 10mg options for all products

-- Add variations for all products with standard sizes
INSERT INTO product_variations (product_id, name, quantity_mg, price, stock_quantity)
-- Ipamorelin
SELECT id, '2mg', 2.0, base_price * 0.8, 40 FROM products WHERE name = 'Ipamorelin'
UNION ALL
SELECT id, '5mg', 5.0, base_price, 120 FROM products WHERE name = 'Ipamorelin'
UNION ALL
SELECT id, '10mg', 10.0, base_price * 1.8, 80 FROM products WHERE name = 'Ipamorelin'
UNION ALL
-- CJC-1295
SELECT id, '2mg', 2.0, base_price * 0.8, 35 FROM products WHERE name = 'CJC-1295'
UNION ALL
SELECT id, '5mg', 5.0, base_price, 95 FROM products WHERE name = 'CJC-1295'
UNION ALL
SELECT id, '10mg', 10.0, base_price * 1.8, 70 FROM products WHERE name = 'CJC-1295'
UNION ALL
-- Melanotan II
SELECT id, '2mg', 2.0, base_price * 0.8, 50 FROM products WHERE name = 'Melanotan II'
UNION ALL
SELECT id, '5mg', 5.0, base_price, 150 FROM products WHERE name = 'Melanotan II'
UNION ALL
SELECT id, '10mg', 10.0, base_price * 1.8, 100 FROM products WHERE name = 'Melanotan II'
UNION ALL
-- GHK-Cu
SELECT id, '2mg', 2.0, base_price * 0.8, 45 FROM products WHERE name = 'GHK-Cu'
UNION ALL
SELECT id, '5mg', 5.0, base_price, 110 FROM products WHERE name = 'GHK-Cu'
UNION ALL
SELECT id, '10mg', 10.0, base_price * 1.8, 85 FROM products WHERE name = 'GHK-Cu'
UNION ALL
-- Semax
SELECT id, '2mg', 2.0, base_price * 0.8, 30 FROM products WHERE name = 'Semax'
UNION ALL
SELECT id, '5mg', 5.0, base_price, 75 FROM products WHERE name = 'Semax'
UNION ALL
SELECT id, '10mg', 10.0, base_price * 1.8, 60 FROM products WHERE name = 'Semax'
UNION ALL
-- Selank
SELECT id, '2mg', 2.0, base_price * 0.8, 32 FROM products WHERE name = 'Selank'
UNION ALL
SELECT id, '5mg', 5.0, base_price, 80 FROM products WHERE name = 'Selank'
UNION ALL
SELECT id, '10mg', 10.0, base_price * 1.8, 65 FROM products WHERE name = 'Selank'
UNION ALL
-- PT-141
SELECT id, '2mg', 2.0, base_price * 0.8, 28 FROM products WHERE name = 'PT-141 (Bremelanotide)'
UNION ALL
SELECT id, '5mg', 5.0, base_price, 65 FROM products WHERE name = 'PT-141 (Bremelanotide)'
UNION ALL
SELECT id, '10mg', 10.0, base_price * 1.8, 50 FROM products WHERE name = 'PT-141 (Bremelanotide)'
UNION ALL
-- Epithalon
SELECT id, '2mg', 2.0, base_price * 0.8, 30 FROM products WHERE name = 'Epithalon'
UNION ALL
SELECT id, '5mg', 5.0, base_price, 70 FROM products WHERE name = 'Epithalon'
UNION ALL
SELECT id, '10mg', 10.0, base_price * 1.8, 55 FROM products WHERE name = 'Epithalon';

-- Note: BPC-157 and TB-500 already have variations from the initial migration

