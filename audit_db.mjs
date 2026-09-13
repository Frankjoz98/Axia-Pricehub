import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://svylytekfqhzuiouzral.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN2eWx5dGVrZnFoenVpb3V6cmFsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc5NzE1NjgsImV4cCI6MjEwMzU0NzU2OH0.XwObTR46eJViuNycNGZkfFdwLLdVaFkysu-sa851-WY';

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { count, error } = await supabase.from('productos').select('*', { count: 'exact', head: true });
  console.log('Total Productos:', count);

  const { data } = await supabase.from('productos').select('offers').limit(5000);
  if (data && data.length > 0) {
    const providers = {};
    for (const p of data) {
      if (p.offers) {
        for (const o of p.offers) {
          providers[o.provider] = (providers[o.provider] || 0) + 1;
        }
      }
    }
    console.log('Proveedores en DB:', providers);
  } else {
    console.log('La tabla de productos está vacía o no retornó datos.');
  }
}

check().catch(console.error);
