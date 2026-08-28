import { supabase } from './src/lib/supabase.ts';

async function testSupabase() {
  const { data, error } = await supabase.from('products').select('*');
  console.log('Query Error:', error);
  console.log('Total Products returned by Supabase adapter:', data ? data.length : 0);
  if (data && data.length > 0) {
    console.log('First 3 products:', data.slice(0, 3).map(p => ({ id: p.id, name: p.name })));
  }
}

testSupabase().catch(console.error);
