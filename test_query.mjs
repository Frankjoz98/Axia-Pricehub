import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
  const { data, error } = await supabase.from('ventas_historicas').select('date, product_name, category, marca, unit_price, quantity').limit(5);
  console.log("Error:", error);
  console.log("Data:", data);
}
run();
