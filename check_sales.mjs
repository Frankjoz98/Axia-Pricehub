import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://svylytekfqhzuiouzral.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN2eWx5dGVrZnFoenVpb3V6cmFsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc5NzE1NjgsImV4cCI6MjEwMzU0NzU2OH0.XwObTR46eJViuNycNGZkfFdwLLdVaFkysu-sa851-WY'
);

async function check() {
  const { data, error } = await supabase
    .from('ventas_historicas')
    .select('order_ref, product_name, quantity, date');

  if (error) {
    console.error('Error:', error);
  } else {
    console.log(`Found ${data.length} total rows in DB.`);
    
    const ibu = data.filter(r => r.product_name.toUpperCase().includes('IBUPROFENO 800'));
    console.log(`Found ${ibu.length} rows for Ibuprofeno.`);
    console.log(ibu);
    const sum = ibu.reduce((acc, row) => acc + row.quantity, 0);
    console.log('Total quantity for Ibuprofeno in DB:', sum);
  }
}

check();
