import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
  const { data, error } = await supabase.from('ventas_historicas')
    .select('*')
    .like('sesion', '%00106%')
    .ilike('product_name', '%FIXIM%');
  
  if (error) console.error(error);
  else console.log(JSON.stringify(data, null, 2));
}

run();
