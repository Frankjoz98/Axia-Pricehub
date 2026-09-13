import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

// Read UTF-16LE .env file
const envContent = fs.readFileSync('.env.local', 'utf-8');
const lines = envContent.split('\n');
let supabaseUrl = '';
let supabaseAnonKey = '';

for (const line of lines) {
  if (line.includes('VITE_SUPABASE_URL=')) {
    supabaseUrl = line.split('=')[1].trim();
  }
  if (line.includes('VITE_SUPABASE_ANON_KEY=')) {
    supabaseAnonKey = line.split('=')[1].trim();
  }
}

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("No se encontraron las credenciales de Supabase.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  console.log("Consultando ventas desde el 1 de septiembre de 2026...");
  
  let allVentas = [];
  let from = 0;
  const step = 1000;
  
  while (true) {
    const { data, error } = await supabase
      .from('ventas_historicas')
      .select('*')
      .gte('date', '2026-09-01T00:00:00Z')
      .order('date', { ascending: true })
      .range(from, from + step - 1);
      
    if (error) {
      console.error("Error al consultar Supabase:", error);
      process.exit(1);
    }
    if (!data || data.length === 0) break;
    
    allVentas = allVentas.concat(data);
    if (data.length < step) break;
    from += step;
  }
  
  console.log(`Se obtuvieron ${allVentas.length} registros de ventas.`);

  let totalRevenue = 0;
  let totalCost = 0;
  const uniqueTickets = new Set();
  
  const revenueByHour = {};
  const revenueByDay = {};
  const revenueByStaff = {};
  
  for (const v of allVentas) {
    const revenue = v.quantity * v.unit_price;
    const cost = v.total_cost || 0; // If missing, assumes 0 for this calculation
    
    totalRevenue += revenue;
    totalCost += cost;
    if (v.order_ref) uniqueTickets.add(v.order_ref);
    
    // Parse date (Assuming UTC in DB, adjusting if necessary, but we'll stick to local time of the string)
    const dateObj = new Date(v.date);
    const hour = dateObj.getHours().toString().padStart(2, '0') + ":00";
    const day = dateObj.toISOString().split('T')[0];
    const staff = v.cajero || v.vendedor || 'Desconocido';
    
    revenueByHour[hour] = (revenueByHour[hour] || 0) + revenue;
    revenueByDay[day] = (revenueByDay[day] || 0) + revenue;
    revenueByStaff[staff] = (revenueByStaff[staff] || 0) + revenue;
  }
  
  const totalMargin = totalRevenue - totalCost;
  const marginPercent = totalRevenue > 0 ? (totalMargin / totalRevenue) * 100 : 0;
  const avgTicket = uniqueTickets.size > 0 ? totalRevenue / uniqueTickets.size : 0;
  
  const topHours = Object.entries(revenueByHour).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const topDays = Object.entries(revenueByDay).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const topStaff = Object.entries(revenueByStaff).sort((a, b) => b[1] - a[1]).slice(0, 5);
  
  const formatter = new Intl.NumberFormat('es-NI', { style: 'currency', currency: 'NIO' });
  
  const report = `# Reporte de Rendimiento - Axia PriceHub
*Generado para: Jordan*
*Período: Desde el 01 de Septiembre de 2026 hasta la fecha*

## 1. Resumen Financiero Global
- **Ventas Totales (Facturado):** ${formatter.format(totalRevenue)}
- **Costo Total:** ${formatter.format(totalCost)}
- **Ganancia Neta (Margen en C$):** ${formatter.format(totalMargin)}
- **Margen Porcentual:** ${marginPercent.toFixed(2)}%

## 2. Métricas Operativas
- **Total de Tickets Generados:** ${uniqueTickets.size}
- **Promedio de Ticket de Venta:** ${formatter.format(avgTicket)}

## 3. Top Rendimiento de Personal
${topStaff.map(([staff, rev], i) => `${i+1}. **${staff}**: ${formatter.format(rev)} facturados`).join('\n')}

## 4. Mejores Días de Venta
${topDays.map(([day, rev], i) => `${i+1}. **${day}**: ${formatter.format(rev)}`).join('\n')}

## 5. Horas Calientes (Mayor Venta)
${topHours.map(([hour, rev], i) => `${i+1}. **${hour}**: ${formatter.format(rev)}`).join('\n')}

---
*Reporte autogenerado por Antigravity System basado en ventas_historicas.*
`;
  
  fs.writeFileSync('reporte_jordan.md', report, 'utf-8');
  console.log("Reporte generado en reporte_jordan.md");
}

run();
