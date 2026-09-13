import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://svylytekfqhzuiouzral.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN2eWx5dGVrZnFoenVpb3V6cmFsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc5NzE1NjgsImV4cCI6MjEwMzU0NzU2OH0.XwObTR46eJViuNycNGZkfFdwLLdVaFkysu-sa851-WY';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function run() {
  // Distinct sessions
  const { data: allVentas } = await supabase.from('ventas_historicas')
    .select('sesion')
    .not('sesion', 'is', null)
    .limit(5000);
    
  const sessions = [...new Set(allVentas?.map(v => v.sesion).filter(Boolean))];
  console.log(`Sesiones unicas: ${sessions.length}`);
  console.log('Ejemplos:', sessions.slice(0, 20));
  
  // buscar sesiones que contengan "106"
  const matching = sessions.filter(s => s.includes('106'));
  console.log(`\nSesiones con "106": ${matching}`);
  
  // Total de registros en ventas_historicas
  const { count } = await supabase.from('ventas_historicas').select('*', { count: 'exact', head: true });
  console.log(`\nTotal registros en ventas_historicas: ${count}`);
}

run();
