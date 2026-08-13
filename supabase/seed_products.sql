-- Full Schema Recovery and Seed Script

-- 1. Create Categories Table (if not exists)
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    icon TEXT,
    sort_order INTEGER DEFAULT 0,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create Products Table (if not exists)
CREATE TABLE IF NOT EXISTS public.products (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT DEFAULT 'Uncategorized', -- Stores Category ID
    base_price DECIMAL(10, 2) NOT NULL DEFAULT 0,
    discount_price DECIMAL(10, 2),
    discount_start_date TIMESTAMP WITH TIME ZONE,
    discount_end_date TIMESTAMP WITH TIME ZONE,
    discount_active BOOLEAN DEFAULT false,
    purity_percentage DECIMAL(5, 2) DEFAULT 99.0,
    molecular_weight TEXT,
    cas_number TEXT,
    sequence TEXT,
    storage_conditions TEXT DEFAULT 'Store at -20°C',
    inclusions TEXT[], -- Array of strings for inclusions
    stock_quantity INTEGER DEFAULT 0,
    available BOOLEAN DEFAULT true,
    featured BOOLEAN DEFAULT false,
    image_url TEXT,
    safety_sheet_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Create Product Variations Table (if not exists)
CREATE TABLE IF NOT EXISTS public.product_variations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    quantity_mg DECIMAL(10, 2) NOT NULL DEFAULT 0,
    price DECIMAL(10, 2) NOT NULL DEFAULT 0,
    stock_quantity INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Disable RLS and Open Permissions
ALTER TABLE public.categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.products DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variations DISABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE public.categories TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.products TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.product_variations TO anon, authenticated, service_role;


-- 5. Seed Data

-- Clear existing data (Order matters for FKs)
DELETE FROM public.product_variations;
DELETE FROM public.products;
DELETE FROM public.categories;

-- Seed Categories with Fixed IDs
INSERT INTO public.categories (id, name, sort_order, icon, active) VALUES
('c0a80121-7ac0-4e78-94f8-585d77059123', 'Weight Management', 1, 'Scale', true),
('c0a80121-7ac0-4e78-94f8-585d77059124', 'Beauty & Anti-Aging', 2, 'Sparkles', true),
('c0a80121-7ac0-4e78-94f8-585d77059125', 'Wellness & Vitality', 3, 'Heart', true),
('c0a80121-7ac0-4e78-94f8-585d77059126', 'Insulin Pen', 4, 'Package', true);

-- Seed Products with Fixed IDs for Variation Linking
INSERT INTO public.products (id, name, description, base_price, category, image_url, featured, available, stock_quantity) VALUES
-- Weight Management
('d0a80121-7ac0-4e78-94f8-585d77059201', 'SlimDose 10mg', 'Premium weight management peptide solution. Laboratory tested for purity.', 2500.00, 'c0a80121-7ac0-4e78-94f8-585d77059123', NULL, true, true, 1),
('d0a80121-7ac0-4e78-94f8-585d77059202', 'SlimDose 20mg', 'Double strength weight management formula. Enhanced potency.', 3500.00, 'c0a80121-7ac0-4e78-94f8-585d77059123', NULL, true, true, 1),
('d0a80121-7ac0-4e78-94f8-585d77059203', 'SlimDose 30mg', 'Maximum strength weight management solution. Advanced formula.', 4500.00, 'c0a80121-7ac0-4e78-94f8-585d77059123', NULL, true, true, 1),
('d0a80121-7ac0-4e78-94f8-585d77059204', 'RetaDose 10mg', 'Next generation GLP-1/GIP/Glucagon agonist.', 3800.00, 'c0a80121-7ac0-4e78-94f8-585d77059123', NULL, true, true, 1),
('d0a80121-7ac0-4e78-94f8-585d77059205', 'RetaDose 20mg', 'High potency RetaDose for advanced protocols.', 4800.00, 'c0a80121-7ac0-4e78-94f8-585d77059123', NULL, false, true, 1),
('d0a80121-7ac0-4e78-94f8-585d77059206', 'LipoLemon 10ml', 'Lipolytic solution for targeted fat reduction.', 1900.00, 'c0a80121-7ac0-4e78-94f8-585d77059123', NULL, false, true, 1),

-- Beauty & Anti-Aging
('d0a80121-7ac0-4e78-94f8-585d77059207', 'BeautyDose 100mg', 'GHK-Cu Copper peptide for skin rejuvenation and elasticity.', 2800.00, 'c0a80121-7ac0-4e78-94f8-585d77059124', NULL, true, true, 1),
('d0a80121-7ac0-4e78-94f8-585d77059208', 'BotoxDose 10mg', 'Argireline peptide solution for fine lines.', 1800.00, 'c0a80121-7ac0-4e78-94f8-585d77059124', NULL, false, true, 1),
('d0a80121-7ac0-4e78-94f8-585d77059209', 'Topical BeautyDose 1000mg', 'High concentration topical copper peptide formula.', 3500.00, 'c0a80121-7ac0-4e78-94f8-585d77059124', NULL, false, true, 1),
('d0a80121-7ac0-4e78-94f8-585d77059210', 'GlowDose 70mg', 'Melanotan 2 tanning and vitality peptide.', 1500.00, 'c0a80121-7ac0-4e78-94f8-585d77059124', NULL, false, true, 1),
('d0a80121-7ac0-4e78-94f8-585d77059211', 'SkinBoost 10mg', 'BPC-157 regenerative peptide for skin and tissue repair.', 2600.00, 'c0a80121-7ac0-4e78-94f8-585d77059124', NULL, true, true, 1),

-- Wellness & Vitality
('d0a80121-7ac0-4e78-94f8-585d77059212', 'YouthDose 500mg', 'Epitalon peptide for longevity and cellular health.', 3200.00, 'c0a80121-7ac0-4e78-94f8-585d77059125', NULL, false, true, 1),
('d0a80121-7ac0-4e78-94f8-585d77059213', 'SlimBoost 5mg', 'MOTS-c mitochondrial optimizer for metabolic support.', 2200.00, 'c0a80121-7ac0-4e78-94f8-585d77059125', NULL, false, true, 1),
('d0a80121-7ac0-4e78-94f8-585d77059214', 'CalmDose 11mg', 'Selank peptide for stress relief and focus.', 1200.00, 'c0a80121-7ac0-4e78-94f8-585d77059125', NULL, false, true, 1),
('d0a80121-7ac0-4e78-94f8-585d77059215', 'BrainBoost 11mg', 'Semax peptide for cognitive enhancement and memory.', 1400.00, 'c0a80121-7ac0-4e78-94f8-585d77059125', NULL, false, true, 1),

-- Insulin Pen
('d0a80121-7ac0-4e78-94f8-585d77059216', 'SlimPen', 'Precision delivery device for peptide administration.', 1500.00, 'c0a80121-7ac0-4e78-94f8-585d77059126', NULL, false, true, 1),
('d0a80121-7ac0-4e78-94f8-585d77059217', 'SlimPen Pro', 'Advanced electronic dosage pen with memory function.', 2500.00, 'c0a80121-7ac0-4e78-94f8-585d77059126', NULL, true, true, 1);


-- Seed Variations

-- Helper block for injecting Vials Only/Set variations for all Peptides (IDs 9201 to 9215)
-- We insert two variations per product. Price is set to base_price (can be adjusted by admin later)
INSERT INTO public.product_variations (product_id, name, price, stock_quantity)
SELECT id, 'Vials Only', base_price, 1 FROM public.products WHERE category IN ('c0a80121-7ac0-4e78-94f8-585d77059123', 'c0a80121-7ac0-4e78-94f8-585d77059124', 'c0a80121-7ac0-4e78-94f8-585d77059125');

INSERT INTO public.product_variations (product_id, name, price, stock_quantity)
SELECT id, 'Set', base_price + 500, 1 FROM public.products WHERE category IN ('c0a80121-7ac0-4e78-94f8-585d77059123', 'c0a80121-7ac0-4e78-94f8-585d77059124', 'c0a80121-7ac0-4e78-94f8-585d77059125');

-- Seed Variations for SlimPen Pro (d0a80121-7ac0-4e78-94f8-585d77059217)
INSERT INTO public.product_variations (product_id, name, price, stock_quantity) VALUES
('d0a80121-7ac0-4e78-94f8-585d77059217', 'Cloud Pink', 2500.00, 1),
('d0a80121-7ac0-4e78-94f8-585d77059217', 'Sea Green', 2500.00, 1),
('d0a80121-7ac0-4e78-94f8-585d77059217', 'Champagne Gold', 2500.00, 1),
('d0a80121-7ac0-4e78-94f8-585d77059217', 'Mystic Black', 2500.00, 1);
