import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://svylytekfqhzuiouzral.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN2eWx5dGVrZnFoenVpb3V6cmFsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc5NzE1NjgsImV4cCI6MjEwMzU0NzU2OH0.XwObTR46eJViuNycNGZkfFdwLLdVaFkysu-sa851-WY'
);

async function run() {
  await supabase.auth.signInWithPassword({
    email: 'francisco@novarix.com',
    password: 'Axia2024!'
  });
  const { data, error } = await supabase.from('ventas_historicas').select('*').eq('marca', 'VIJOSA').limit(5);
  console.log("Data for VIJOSA:", data);
}
run();
