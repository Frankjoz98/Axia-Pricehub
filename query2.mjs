import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://svylytekfqhzuiouzral.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN2eWx5dGVrZnFoenVpb3V6cmFsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc5NzE1NjgsImV4cCI6MjEwMzU0NzU2OH0.XwObTR46eJViuNycNGZkfFdwLLdVaFkysu-sa851-WY';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function run() {
  const { data, error } = await supabase.from('ventas_historicas')
    .select('order_ref, product_name, quantity, unit_price')
    .like('sesion', '%00106%')
    .ilike('product_name', '%FIXIM%');
  
  if (error) console.error(error);
  else console.log(JSON.stringify(data, null, 2));
}

run();
