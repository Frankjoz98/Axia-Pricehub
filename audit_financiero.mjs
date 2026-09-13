import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://svylytekfqhzuiouzral.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN2eWx5dGVrZnFoenVpb3V6cmFsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc5NzE1NjgsImV4cCI6MjEwMzU0NzU2OH0.XwObTR46eJViuNycNGZkfFdwLLdVaFkysu-sa851-WY'
);

async function audit() {
  // Login first to bypass RLS
  const { error: authErr } = await supabase.auth.signInWithPassword({
    email: 'francisco@novarix.com',
    password: 'Axia2024!'
  });
  
  if (authErr) {
    console.log('Auth error, trying anon...');
    // Try different credentials
    const { data: { session } } = await supabase.auth.getSession();
    console.log('Session:', session ? 'exists' : 'none');
  }

  console.log('=== AUDITORÍA FINANCIERA AXIA PRICEHUB ===\n');

  // 1. Total de registros
  const { count, error: countErr } = await supabase.from('ventas_historicas').select('*', { count: 'exact', head: true });
  console.log(`📊 Total registros en ventas_historicas: ${count}`);
  if (countErr) console.log('   Error:', countErr.message);

  // 2. Verificar esquema
  const { data: sample, error: sampleErr } = await supabase.from('ventas_historicas').select('*').limit(3);
  if (sampleErr) console.log('Error de lectura:', sampleErr.message);
  console.log(`\n📋 Registros obtenidos: ${sample?.length || 0}`);
  if (sample && sample.length > 0) {
    console.log('Columnas:', Object.keys(sample[0]).join(', '));
    sample.forEach((r, i) => {
      console.log(`\n  [${i+1}] ${r.product_name}`);
      console.log(`      order_ref: ${r.order_ref}`);
      console.log(`      date: ${r.date}`);
      console.log(`      unit_price: ${r.unit_price}, quantity: ${r.quantity}`);
      console.log(`      total_cost: ${r.total_cost}, margin: ${r.margin}`);
      console.log(`      marca: ${r.marca}, category: ${r.category}`);
    });
  }
}

audit().catch(console.error);
