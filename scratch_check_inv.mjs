import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://svylytekfqhzuiouzral.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN2eWx5dGVrZnFoenVpb3V6cmFsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc5NzE1NjgsImV4cCI6MjEwMzU0NzU2OH0.XwObTR46eJViuNycNGZkfFdwLLdVaFkysu-sa851-WY'
);

async function check() {
  const auth = await supabase.auth.signInWithPassword({
    email: 'francisco@novarix.com',
    password: 'Axia2024!'
  });
  if (auth.error) {
    console.error("Auth error:", auth.error.message);
    return;
  }
  
  const { count, error: countErr } = await supabase
    .from('inventario_local')
    .select('*', { count: 'exact', head: true });
    
  console.log("inventario_local total rows:", count, "error:", countErr?.message);

  const { data, error } = await supabase
    .from('inventario_local')
    .select('*')
    .limit(5);

  console.log("Sample 5 items from inventario_local:", data);
}

check();
