import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAnomalies() {
  console.log("Obteniendo inventario de Supabase...");
  const { data, error } = await supabase
    .from('inventario_local')
    .select('product_name, precio, costo, stock')
    .gt('stock', 0); // Solo revisar productos en stock

  if (error) {
    console.error("Error:", error);
    return;
  }

  console.log(`\nRevisando ${data.length} productos en stock...\n`);

  const perdidas = [];
  const margenMuyBajo = [];
  const margenAbsurdo = [];
  const sinCosto = [];

  for (const item of data) {
    const { product_name, precio, costo } = item;
    
    // 1. Pérdidas directas (Precio menor al costo)
    if (precio > 0 && precio < costo) {
      perdidas.push(item);
      continue;
    }
    
    // 2. Sin costo registrado
    if (costo === 0 && precio > 0) {
      sinCosto.push(item);
      continue;
    }

    // 3. Márgenes
    if (precio > 0 && costo > 0) {
      const margen = ((precio - costo) / precio) * 100;
      
      // Menos de 5% de margen
      if (margen > 0 && margen < 5) {
        margenMuyBajo.push({ ...item, margen });
      }
      
      // Más de 85% de margen (sospechoso de error de dedo)
      if (margen > 85) {
        margenAbsurdo.push({ ...item, margen });
      }
    }
  }

  console.log("=========================================");
  console.log(`🚨 PRODUCTOS CON PÉRDIDA (Precio < Costo): ${perdidas.length}`);
  perdidas.forEach(p => console.log(`   - ${p.product_name}: Precio C$ ${p.precio} | Costo C$ ${p.costo}`));

  console.log("\n=========================================");
  console.log(`⚠️ MÁRGENES EXCESIVOS (> 85% ganancia): ${margenAbsurdo.length}`);
  margenAbsurdo.forEach(p => console.log(`   - ${p.product_name}: Precio C$ ${p.precio} | Costo C$ ${p.costo} (${p.margen.toFixed(1)}% margen)`));

  console.log("\n=========================================");
  console.log(`📉 MÁRGENES MUY BAJOS (< 5% ganancia): ${margenMuyBajo.length}`);
  margenMuyBajo.forEach(p => console.log(`   - ${p.product_name}: Precio C$ ${p.precio} | Costo C$ ${p.costo} (${p.margen.toFixed(1)}% margen)`));

  console.log("\n=========================================");
  console.log(`❓ SIN COSTO REGISTRADO (Costo 0): ${sinCosto.length}`);
  sinCosto.slice(0, 15).forEach(p => console.log(`   - ${p.product_name}: Precio C$ ${p.precio}`));
  if (sinCosto.length > 15) console.log(`   ... y ${sinCosto.length - 15} más.`);
}

checkAnomalies();
