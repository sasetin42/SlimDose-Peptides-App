-- Seed SlimDose Peptides Products

-- TRUNCATE products table to ensure a clean slate (optional but cleaner for re-seeding fixed list)
-- Note: Cascading deletes might be needed if other tables reference products, but for a simple product list update this is usually fine if we don't have orders yet or if we want to reset.
-- Given the instruction to "reset" or "populate", we'll attempt to clear and insert.
DELETE FROM products;

-- Insert new SlimDose products
INSERT INTO products (name, description, price, category, image_url, featured, available) VALUES
('SlimDose 10mg', 'Premium weight management peptide solution. Laboratory tested for purity.', 2500.00, 'Weight Management', 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&q=80&w=800', true, true),
('SlimDose 20mg', 'Double strength weight management formula. Enhanced potency.', 3500.00, 'Weight Management', 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&q=80&w=800', true, true),
('SlimDose 30mg', 'Maximum strength weight management solution. Advanced formula.', 4500.00, 'Weight Management', 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&q=80&w=800', true, true),
('BeautyDose 100mg', 'GHK-Cu Copper peptide for skin rejuvenation and elasticity.', 2800.00, 'Beauty & Anti-Aging', 'https://images.unsplash.com/photo-1612817288484-96916a0816a9?auto=format&fit=crop&q=80&w=800', true, true),
('YouthDose 500mg', 'Epitalon peptide for longevity and cellular health.', 3200.00, 'Longevity', 'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?auto=format&fit=crop&q=80&w=800', false, true),
('RetaDose 10mg', 'Next generation GLP-1/GIP/Glucagon agonist.', 3800.00, 'Weight Management', 'https://images.unsplash.com/photo-1585435557343-3b092031a831?auto=format&fit=crop&q=80&w=800', true, true),
('RetaDose 20mg', 'High potency RetaDose for advanced protocols.', 4800.00, 'Weight Management', 'https://images.unsplash.com/photo-1585435557343-3b092031a831?auto=format&fit=crop&q=80&w=800', false, true),
('BotoxDose 10mg', 'Argireline peptide solution for fine lines.', 1800.00, 'Beauty & Anti-Aging', 'https://images.unsplash.com/photo-1579165466741-7f35a4755657?auto=format&fit=crop&q=80&w=800', false, true),
('SlimBoost 5mg', 'MOTS-c mitochondrial optimizer for metabolic support.', 2200.00, 'Performance', 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&q=80&w=800', false, true),
('Topical BeautyDose 1000mg', 'High concentration topical copper peptide formula.', 3500.00, 'Topicals', 'https://images.unsplash.com/photo-1556228720-1957be979c23?auto=format&fit=crop&q=80&w=800', false, true),
('GlowDose 70mg', 'Melanotan 2 tanning and vitality peptide.', 1500.00, 'Beauty & Anti-Aging', 'https://images.unsplash.com/photo-1542452255191-c85a98f2c5d1?auto=format&fit=crop&q=80&w=800', false, true),
('SkinBoost 10mg', 'BPC-157 regenerative peptide for skin and tissue repair.', 2600.00, 'Regeneration', 'https://images.unsplash.com/photo-1579165466906-e3a4e92a40e8?auto=format&fit=crop&q=80&w=800', true, true),
('LipoLemon 10ml', 'Lipolytic solution for targeted fat reduction.', 1900.00, 'Body Sculpting', 'https://images.unsplash.com/photo-1608248597279-f99d160bfbc8?auto=format&fit=crop&q=80&w=800', false, true),
('CalmDose 11mg', 'Selank peptide for stress relief and focus.', 1200.00, 'Cognitive', 'https://images.unsplash.com/photo-1512418490979-59295d48651a?auto=format&fit=crop&q=80&w=800', false, true),
('BrainBoost 11mg', 'Semax peptide for cognitive enhancement and memory.', 1400.00, 'Cognitive', 'https://images.unsplash.com/photo-1507413245164-6160d8298b31?auto=format&fit=crop&q=80&w=800', false, true),
('SlimPen', 'Precision delivery device for peptide administration.', 1500.00, 'Accessories', 'https://images.unsplash.com/photo-1631549916768-4119b2e5f926?auto=format&fit=crop&q=80&w=800', false, true),
('SlimPen Pro', 'Advanced electronic dosage pen with memory function.', 2500.00, 'Accessories', 'https://images.unsplash.com/photo-1583946099395-9f50944c3ba4?auto=format&fit=crop&q=80&w=800', true, true);
