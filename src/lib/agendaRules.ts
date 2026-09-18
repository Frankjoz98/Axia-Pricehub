import type { AgendaEvento, Proveedor, FacturaCompra, VentaHistorica, OdooInventario } from '../types';
import { parseLocalYMD, daysUntil } from './dates';
import { buildInventarioIndex } from './odoo';

export function generateSuggestedEvents(
  proveedores: Proveedor[],
  facturas: FacturaCompra[],
  ventas: VentaHistorica[],
  inventario: OdooInventario[],
  targetDate: string // YYYY-MM-DD
): AgendaEvento[] {
  const suggested: AgendaEvento[] = [];
  const today = parseLocalYMD(targetDate);
  const dayNames = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  const dayName = dayNames[today.getDay()];
  const nowStr = new Date().toISOString();

  // 1. Visitas de proveedores
  proveedores.forEach(p => {
    if (p.activo && p.dia_entrega && p.dia_entrega.toLowerCase() === dayName) {
      suggested.push({
        id: `auto-visita-${p.id}-${targetDate}`,
        user_id: 'system',
        titulo: `Visita de ${p.nombre}`,
        descripcion: `Día de entrega programado para ${p.nombre}. Preparar pedido si es necesario.`,
        tipo: 'visita_proveedor',
        prioridad: 'media',
        fecha: targetDate,
        completado: false,
        recurrente: false,
        proveedor_id: p.id,
        created_at: nowStr
      });
    }
  });

  // 2. Facturas por vencer (dentro de 3 días) y vencidas
  facturas.forEach(f => {
    if (f.estado !== 'pagada' && f.fecha_vencimiento) {
      const diffDays = daysUntil(f.fecha_vencimiento, today);

      const prov = proveedores.find(p => p.id === f.proveedor_id);
      const provName = prov ? prov.nombre : 'Proveedor';

      if (diffDays < 0) {
        // Vencida
        suggested.push({
          id: `auto-vencida-${f.id}-${targetDate}`,
          user_id: 'system',
          titulo: `PAGO VENCIDO: Factura ${f.numero_factura}`,
          descripcion: `La factura de ${provName} por C$ ${f.monto_total} venció hace ${Math.abs(diffDays)} días.`,
          tipo: 'pago',
          prioridad: 'urgente',
          fecha: targetDate,
          completado: false,
          recurrente: false,
          factura_id: f.id,
          proveedor_id: f.proveedor_id,
          created_at: nowStr
        });
      } else if (diffDays <= 3) {
        // Por vencer
        suggested.push({
          id: `auto-vence-${f.id}-${targetDate}`,
          user_id: 'system',
          titulo: `Pago próximo: Factura ${f.numero_factura}`,
          descripcion: `La factura de ${provName} por C$ ${f.monto_total} vence en ${diffDays} días.`,
          tipo: 'pago',
          prioridad: 'alta',
          fecha: targetDate,
          completado: false,
          recurrente: false,
          factura_id: f.id,
          proveedor_id: f.proveedor_id,
          created_at: nowStr
        });
      }
    }
  });

  // 3. Stock crítico de alta rotación (Top 20 más vendidos en últimos 30 días con stock < 5)
  const invIndex = buildInventarioIndex(inventario);
  const salesByInvId = new Map<string, number>();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  ventas.forEach(v => {
    if (new Date(v.date) < thirtyDaysAgo) return;
    const inv = invIndex.find(v);
    if (inv) salesByInvId.set(inv.id, (salesByInvId.get(inv.id) || 0) + v.quantity);
  });

  const topSellerIds = new Set(
    Array.from(salesByInvId.entries()).sort((a, b) => b[1] - a[1]).slice(0, 20).map(([id]) => id)
  );

  // Buscar esos productos en inventario y verificar si el stock es bajo
  const criticalStockItems = inventario.filter(i => topSellerIds.has(i.id) && i.stock < 5);

  if (criticalStockItems.length > 0) {
    const pNames = criticalStockItems.map(i => `${i.product_name} (${i.stock} un.)`).join(', ');
    suggested.push({
      id: `auto-stock-${targetDate}`,
      user_id: 'system',
      titulo: `Sugerencia de Reabastecimiento`,
      descripcion: `Tienes ${criticalStockItems.length} productos de alta rotación con stock crítico: ${pNames}.`,
      tipo: 'ai_sugerencia',
      prioridad: 'alta',
      fecha: targetDate,
      completado: false,
      recurrente: false,
      created_at: nowStr,
      metadata: { items: criticalStockItems.map(i => i.id) }
    });
  }

  // 4. Vencimientos a 5 meses (150 días)
  inventario.forEach(item => {
    if (item.fecha_vencimiento && item.stock != null && item.stock > 0) {
      const diffDays = daysUntil(item.fecha_vencimiento, today);

      // Mostrar si vence en los próximos 150 días (aprox 5 meses)
      if (diffDays >= 0 && diffDays <= 150) {
        let prio: 'urgente' | 'alta' | 'media' = 'media';
        if (diffDays <= 30) prio = 'urgente';
        else if (diffDays <= 90) prio = 'alta';

        suggested.push({
          id: `auto-vence-${item.id}-${targetDate}`,
          user_id: 'system',
          titulo: `ALERTA VENCIMIENTO: ${item.product_name}`,
          descripcion: `Vence en ${diffDays} días (${item.fecha_vencimiento}). Stock actual: ${item.stock}.`,
          tipo: 'recordatorio',
          prioridad: prio,
          fecha: targetDate,
          completado: false,
          recurrente: false,
          created_at: nowStr
        });
      }
    }
  });

  return suggested;
}
