import type { OdooInventario, VentaHistorica } from '../types';

// Cruce ventas ↔ inventario (RF-7). Único punto de verdad para todos los módulos:
// useBusinessMetrics, DeadStock, AlertsContext, agendaRules, SmartRestock.
//
// ⚠️ Odoo exporta el inventario con IDs externos tipo `__export__.product_template_5626_xxxx`
// (id de plantilla) y las líneas de venta con `Líneas de la orden/Producto/ID` (id de variante
// `product_product`). Cuando el producto no tiene variantes ambos números suelen coincidir, pero
// NO es una garantía de Odoo. Si aparecen cruces incorrectos, exportar el inventario con la
// columna `product_variant_ids/id` y usarla como `odoo_id`.

/** Normaliza un odoo_id: extrae el número de un id externo `__export__...` o devuelve el valor limpio. */
export function normalizeOdooId(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const value = String(raw).trim();
  if (!value) return null;
  if (value.includes('__export__')) {
    const num = value.split('_').find(p => /^\d+$/.test(p));
    return num ?? value;
  }
  return value;
}

/** Quita el prefijo `[REF] ` con el que Odoo a veces exporta nombres de producto. */
export function stripOdooRef(name: string): string {
  return name.replace(/^\[.*?\]\s*/, '').trim();
}

/** Clave de nombre para cruces tolerantes (minúsculas, sin `[REF]`, sin espacios extremos). */
export function nameKey(name: string | null | undefined): string {
  return stripOdooRef(String(name ?? '')).toLowerCase();
}

export interface InventarioIndex {
  byId: Map<string, OdooInventario>;
  byName: Map<string, OdooInventario>;
  /** Busca el producto de inventario para una venta: primero por odoo_id normalizado, luego por nombre. */
  find(venta: Pick<VentaHistorica, 'odoo_id' | 'product_name'>): OdooInventario | undefined;
  /** Nombre canónico de una venta (el del inventario si cruza por id, si no el de la venta). */
  resolveName(venta: Pick<VentaHistorica, 'odoo_id' | 'product_name'>): string;
}

export function buildInventarioIndex(inventario: OdooInventario[]): InventarioIndex {
  const byId = new Map<string, OdooInventario>();
  const byName = new Map<string, OdooInventario>();

  inventario.forEach(inv => {
    const normalized = normalizeOdooId(inv.odoo_id);
    if (normalized) byId.set(normalized, inv);
    if (inv.odoo_id) byId.set(inv.odoo_id.trim(), inv);
    const key = nameKey(inv.product_name);
    if (key && !byName.has(key)) byName.set(key, inv);
  });

  const findById = (odooId: string | null | undefined): OdooInventario | undefined => {
    const normalized = normalizeOdooId(odooId);
    if (!normalized) return undefined;
    return byId.get(normalized) ?? (odooId ? byId.get(odooId.trim()) : undefined);
  };

  return {
    byId,
    byName,
    find(venta) {
      return findById(venta.odoo_id) ?? byName.get(nameKey(venta.product_name));
    },
    resolveName(venta) {
      return findById(venta.odoo_id)?.product_name ?? venta.product_name;
    }
  };
}

/** Costo de una línea: el de Odoo si viene, si no `cantidad × costo actual del inventario`. */
export function lineCost(venta: Pick<VentaHistorica, 'total_cost' | 'quantity'>, invItem: OdooInventario | undefined): number {
  if (venta.total_cost > 0) return venta.total_cost;
  if (invItem && invItem.costo > 0) return venta.quantity * invItem.costo;
  return 0;
}
