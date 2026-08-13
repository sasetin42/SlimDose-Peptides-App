
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://rsmdexmgnloifzqvjyvz.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJzbWRleG1nbmxvaWZ6cXZqeXZ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU1MzU5NzUsImV4cCI6MjA4MTExMTk3NX0.Zr9WjqLZ5I4WvZdWxBZCtsBnnX4riDOBObkcFmXh6dA';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const products = [
    { name: 'SlimDose 10mg', description: 'Premium weight management peptide solution. Laboratory tested for purity.', price: 2500.00, category: 'Weight Management', image_url: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&q=80&w=800', featured: true, available: true },
    { name: 'SlimDose 20mg', description: 'Double strength weight management formula. Enhanced potency.', price: 3500.00, category: 'Weight Management', image_url: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&q=80&w=800', featured: true, available: true },
    { name: 'SlimDose 30mg', description: 'Maximum strength weight management solution. Advanced formula.', price: 4500.00, category: 'Weight Management', image_url: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&q=80&w=800', featured: true, available: true },
    { name: 'BeautyDose 100mg', description: 'GHK-Cu Copper peptide for skin rejuvenation and elasticity.', price: 2800.00, category: 'Beauty & Anti-Aging', image_url: 'https://images.unsplash.com/photo-1612817288484-96916a0816a9?auto=format&fit=crop&q=80&w=800', featured: true, available: true },
    { name: 'YouthDose 500mg', description: 'Epitalon peptide for longevity and cellular health.', price: 3200.00, category: 'Longevity', image_url: 'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?auto=format&fit=crop&q=80&w=800', featured: false, available: true },
    { name: 'RetaDose 10mg', description: 'Next generation GLP-1/GIP/Glucagon agonist.', price: 3800.00, category: 'Weight Management', image_url: 'https://images.unsplash.com/photo-1585435557343-3b092031a831?auto=format&fit=crop&q=80&w=800', featured: true, available: true },
    { name: 'RetaDose 20mg', description: 'High potency RetaDose for advanced protocols.', price: 4800.00, category: 'Weight Management', image_url: 'https://images.unsplash.com/photo-1585435557343-3b092031a831?auto=format&fit=crop&q=80&w=800', featured: false, available: true },
    { name: 'BotoxDose 10mg', description: 'Argireline peptide solution for fine lines.', price: 1800.00, category: 'Beauty & Anti-Aging', image_url: 'https://images.unsplash.com/photo-1579165466741-7f35a4755657?auto=format&fit=crop&q=80&w=800', featured: false, available: true },
    { name: 'SlimBoost 5mg', description: 'MOTS-c mitochondrial optimizer for metabolic support.', price: 2200.00, category: 'Performance', image_url: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&q=80&w=800', featured: false, available: true },
    { name: 'Topical BeautyDose 1000mg', description: 'High concentration topical copper peptide formula.', price: 3500.00, category: 'Topicals', image_url: 'https://images.unsplash.com/photo-1556228720-1957be979c23?auto=format&fit=crop&q=80&w=800', featured: false, available: true },
    { name: 'GlowDose 70mg', description: 'Melanotan 2 tanning and vitality peptide.', price: 1500.00, category: 'Beauty & Anti-Aging', image_url: 'https://images.unsplash.com/photo-1542452255191-c85a98f2c5d1?auto=format&fit=crop&q=80&w=800', featured: false, available: true },
    { name: 'SkinBoost 10mg', description: 'BPC-157 regenerative peptide for skin and tissue repair.', price: 2600.00, category: 'Regeneration', image_url: 'https://images.unsplash.com/photo-1579165466906-e3a4e92a40e8?auto=format&fit=crop&q=80&w=800', featured: true, available: true },
    { name: 'LipoLemon 10ml', description: 'Lipolytic solution for targeted fat reduction.', price: 1900.00, category: 'Body Sculpting', image_url: 'https://images.unsplash.com/photo-1608248597279-f99d160bfbc8?auto=format&fit=crop&q=80&w=800', featured: false, available: true },
    { name: 'CalmDose 11mg', description: 'Selank peptide for stress relief and focus.', price: 1200.00, category: 'Cognitive', image_url: 'https://images.unsplash.com/photo-1512418490979-59295d48651a?auto=format&fit=crop&q=80&w=800', featured: false, available: true },
    { name: 'BrainBoost 11mg', description: 'Semax peptide for cognitive enhancement and memory.', price: 1400.00, category: 'Cognitive', image_url: 'https://images.unsplash.com/photo-1507413245164-6160d8298b31?auto=format&fit=crop&q=80&w=800', featured: false, available: true },
    { name: 'SlimPen', description: 'Precision delivery device for peptide administration.', price: 1500.00, category: 'Accessories', image_url: 'https://images.unsplash.com/photo-1631549916768-4119b2e5f926?auto=format&fit=crop&q=80&w=800', featured: false, available: true },
    { name: 'SlimPen Pro', description: 'Advanced electronic dosage pen with memory function.', price: 2500.00, category: 'Accessories', image_url: 'https://images.unsplash.com/photo-1583946099395-9f50944c3ba4?auto=format&fit=crop&q=80&w=800', featured: true, available: true }
];

async function seed() {
    console.log('🌱 delete existing products...');

    // Try to delete all products where filtered (blind delete)
    // Assuming RLS allows anon delete if it allows anon insert (which admin panel seems to use)
    const { error: deleteError } = await supabase.from('products').delete().gt('price', -1);

    if (deleteError) {
        console.error('Error deleting products:', deleteError);
    } else {
        console.log(`Deleted existing products (if any).`);
    }

    console.log('🌱 Inserting new products...');
    const { data, error } = await supabase.from('products').insert(products).select();

    if (error) {
        console.error('❌ Error inserting products:', error);
    } else {
        console.log(`✅ Successfully inserted ${data?.length || 0} products!`);
    }
}

seed();
