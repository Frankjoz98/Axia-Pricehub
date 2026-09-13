import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://svylytekfqhzuiouzral.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN2eWx5dGVrZnFoenVpb3V6cmFsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc5NzE1NjgsImV4cCI6MjEwMzU0NzU2OH0.XwObTR46eJViuNycNGZkfFdwLLdVaFkysu-sa851-WY';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkProducts() {
  const { count, error } = await supabase.from('productos').select('*', { count: 'exact', head: true });
  console.log('Count of products in Supabase:', count, 'Error:', error);

  const { data: sample } = await supabase.from('productos').select('name, offers').limit(5);
  console.log('Sample products:', JSON.stringify(sample, null, 2));
}

checkProducts();
