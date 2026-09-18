import { useMemo } from 'react';
import type { VentaHistorica, OdooInventario, PurchaseOrder } from '../types';
import { buildInventarioIndex, lineCost } from '../lib/odoo';
import { toLocalYMD, endOfLocalDay, isoWeekNumber, addLocalDays } from '../lib/dates';

export type Turno = 'turno1' | 'turno2' | 'turno3';
export type TimeGrouping = 'daily' | 'weekly' | 'monthly' | 'shift';

interface UseBusinessMetricsProps {
  ventas: VentaHistorica[];
  inventario?: OdooInventario[];
  ordenes?: PurchaseOrder[];
  timeGrouping?: TimeGrouping;
  weeklySales?: number;
  dateRange?: { start: Date | null, end: Date | null };
}

export interface SessionMeta {
  minDate: Date;
  maxDate: Date;
  turno: Turno;
  /** Día operativo: las sesiones nocturnas que cruzan medianoche cuentan para el día en que abrieron. */
  businessDate: Date;
}

export interface SessionSummary {
  sesion: string;
  cajero: string;
  minDate: string;
  maxDate: string;
  turno: Turno;
  revenue: number;
  cost: number;
  margin: number;
  orders: Set<string>;
  products: { name: string; qty: number; price: number; total: number }[];
}

export interface TrendPoint {
  time: string;
  revenue: number;
  margin: number;
  cost: number;
  turno1: number;
  turno2: number;
  turno3: number;
  posRevenue: number;
  backendRevenue: number;
  dateForSort: string;
  sessionIds: string[];
}

// Turnos de una farmacia 24/7 (heurística única para sesiones y ventas sin sesión):
//   Mañana 06:00–13:59 · Tarde 14:00–21:59 · Noche 22:00–05:59
export function turnoForHour(hour: number): Turno {
  if (hour >= 6 && hour < 14) return 'turno1';
  if (hour >= 14 && hour < 22) return 'turno2';
  return 'turno3';
}

/** Día operativo de una hora dada: la madrugada (turno noche antes de las 12) pertenece al día anterior. */
export function businessDateFor(date: Date): { turno: Turno; businessDate: Date } {
  const hour = date.getHours();
  const turno = turnoForHour(hour);
  const businessDate = turno === 'turno3' && hour < 12 ? addLocalDays(date, -1) : new Date(date.getTime());
  return { turno, businessDate };
}

/** Mapa sesión → metadatos, evaluando turno y día operativo en el punto medio de la sesión. */
export function buildSessionMeta(ventas: VentaHistorica[]): Record<string, SessionMeta> {
  const meta: Record<string, SessionMeta> = {};
  ventas.forEach(v => {
    if (!v.sesion || !v.date) return;
    const d = new Date(v.date);
    if (Number.isNaN(d.getTime())) return;
    const m = meta[v.sesion];
    if (!m) meta[v.sesion] = { minDate: d, maxDate: d, turno: 'turno1', businessDate: d };
    else {
      if (d < m.minDate) m.minDate = d;
      if (d > m.maxDate) m.maxDate = d;
    }
  });
  Object.values(meta).forEach(m => {
    const midpoint = new Date(m.minDate.getTime() + (m.maxDate.getTime() - m.minDate.getTime()) / 2);
    const { turno, businessDate } = businessDateFor(midpoint);
    m.turno = turno;
    m.businessDate = businessDate;
  });
  return meta;
}

const truncate = (name: string, max: number) => (name.length > max ? name.substring(0, max) + '...' : name);

export function useBusinessMetrics({ ventas, inventario = [], ordenes = [], timeGrouping = 'monthly', weeklySales = 0, dateRange }: UseBusinessMetricsProps) {
  // Las sesiones se calculan SIEMPRE sobre el histórico completo: un filtro de fecha nunca debe
  // partir una sesión nocturna (RF-50, RF-28).
  const sessionMeta = useMemo(() => buildSessionMeta(ventas), [ventas]);

  const filteredVentas = useMemo(() => {
    if (!dateRange || (!dateRange.start && !dateRange.end)) return ventas;
    const start = dateRange.start;
    const end = dateRange.end ? endOfLocalDay(dateRange.end) : null;
    return ventas.filter(v => {
      const raw = new Date(v.date);
      // Se filtra por día operativo: la sesión entera entra o sale del rango
      const d = v.sesion && sessionMeta[v.sesion] ? sessionMeta[v.sesion].businessDate : raw;
      if (start && d < start) return false;
      if (end && d > end) return false;
      return true;
    });
  }, [ventas, sessionMeta, dateRange?.start, dateRange?.end]);

  return useMemo(() => {
    let totalRevenue = 0;
    let totalCost = 0;
    let totalMargin = 0;
    const ticketKeys = new Set<string>();

    const productStats: Record<string, { qty: number; margin: number; revenue: number; category: string; brand: string }> = {};
    const categoryStats: Record<string, { revenue: number; margin: number }> = {};
    const brandStats: Record<string, { revenue: number; margin: number; qty: number }> = {};
    const hourlyStats: Record<string, { revenue: number; tickets: Set<string> }> = {};
    const dayOfWeekStats: Record<string, { revenue: number; tickets: Set<string> }> = {};
    const staffStats: Record<string, { revenue: number; margin: number; tickets: Set<string> }> = {};
    const brandCatalogStats: Record<string, { totalPrecio: number; totalCosto: number; totalProducts: number; sumOfMarginPercents: number; products: OdooInventario[] }> = {};
    const timeStats: Record<string, TrendPoint> = {};
    // Ventas por producto de inventario (id interno) — para rotación y stock muerto sin depender del nombre
    const invSalesQty = new Map<string, number>();

    inventario.forEach(inv => {
      const b = inv.marca || 'Sin Especificar';
      if (!brandStats[b]) brandStats[b] = { revenue: 0, margin: 0, qty: 0 };
      if (!brandCatalogStats[b]) brandCatalogStats[b] = { totalPrecio: 0, totalCosto: 0, totalProducts: 0, sumOfMarginPercents: 0, products: [] };
      brandCatalogStats[b].products.push(inv);
      if (inv.precio > 0) {
        brandCatalogStats[b].totalPrecio += inv.precio;
        brandCatalogStats[b].totalCosto += inv.costo;
        brandCatalogStats[b].totalProducts += 1;
        brandCatalogStats[b].sumOfMarginPercents += ((inv.precio - inv.costo) / inv.precio) * 100;
      }
    });

    const invIndex = buildInventarioIndex(inventario);

    const sessionSummaries: Record<string, SessionSummary> = {};
    const sessionsInRange = new Set<string>();
    filteredVentas.forEach(v => { if (v.sesion && sessionMeta[v.sesion]) sessionsInRange.add(v.sesion); });
    sessionsInRange.forEach(s => {
      sessionSummaries[s] = {
        sesion: s,
        cajero: 'Desconocido',
        minDate: sessionMeta[s].minDate.toISOString(),
        maxDate: sessionMeta[s].maxDate.toISOString(),
        turno: sessionMeta[s].turno,
        revenue: 0, cost: 0, margin: 0,
        orders: new Set<string>(),
        products: []
      };
    });

    const emptyPoint = (time: string, dateForSort: Date): TrendPoint => ({
      time, revenue: 0, margin: 0, cost: 0, turno1: 0, turno2: 0, turno3: 0, posRevenue: 0, backendRevenue: 0,
      dateForSort: dateForSort.toISOString(), sessionIds: []
    });

    filteredVentas.forEach(v => {
      const revenue = v.quantity * v.unit_price;
      const invItem = invIndex.find(v);
      const cost = lineCost(v, invItem);
      const margin = revenue - cost;
      const resolvedName = invIndex.resolveName(v);
      const ticketKey = v.order_ref ? (v.sesion ? `${v.sesion}_${v.order_ref}` : v.order_ref) : null;

      totalRevenue += revenue;
      totalCost += cost;
      totalMargin += margin;
      if (ticketKey) ticketKeys.add(ticketKey);
      if (invItem) invSalesQty.set(invItem.id, (invSalesQty.get(invItem.id) || 0) + v.quantity);

      const staffName = v.cajero && v.cajero !== 'Sin Asignar' ? v.cajero : (v.vendedor && v.vendedor !== 'Sin Asignar' ? v.vendedor : 'Desconocido');

      if (v.sesion && sessionSummaries[v.sesion]) {
        const ss = sessionSummaries[v.sesion];
        ss.revenue += revenue;
        ss.cost += cost;
        ss.margin += margin;
        if (v.order_ref) ss.orders.add(v.order_ref);
        if (staffName !== 'Desconocido') ss.cajero = staffName;
        const existingProd = ss.products.find(p => p.name === resolvedName && p.price === v.unit_price);
        if (existingProd) { existingProd.qty += v.quantity; existingProd.total += revenue; }
        else ss.products.push({ name: resolvedName, qty: v.quantity, price: v.unit_price, total: revenue });
      }

      const brand = v.marca && v.marca !== 'Sin Marca' ? v.marca : 'Sin Especificar';
      const cat = v.category || 'Sin categoría';

      if (!productStats[resolvedName]) productStats[resolvedName] = { qty: 0, margin: 0, revenue: 0, category: cat, brand };
      productStats[resolvedName].qty += v.quantity;
      productStats[resolvedName].margin += margin;
      productStats[resolvedName].revenue += revenue;

      if (!categoryStats[cat]) categoryStats[cat] = { revenue: 0, margin: 0 };
      categoryStats[cat].revenue += revenue;
      categoryStats[cat].margin += margin;

      if (!brandStats[brand]) brandStats[brand] = { revenue: 0, margin: 0, qty: 0 };
      brandStats[brand].revenue += revenue;
      brandStats[brand].margin += margin;
      brandStats[brand].qty += v.quantity;

      if (!staffStats[staffName]) staffStats[staffName] = { revenue: 0, margin: 0, tickets: new Set() };
      staffStats[staffName].revenue += revenue;
      staffStats[staffName].margin += margin;
      if (ticketKey) staffStats[staffName].tickets.add(ticketKey);

      if (!v.date) return;
      const dateObj = new Date(v.date);
      if (Number.isNaN(dateObj.getTime())) return;

      const hourKey = dateObj.getHours().toString().padStart(2, '0') + ':00';
      if (!hourlyStats[hourKey]) hourlyStats[hourKey] = { revenue: 0, tickets: new Set() };
      hourlyStats[hourKey].revenue += revenue;
      if (ticketKey) hourlyStats[hourKey].tickets.add(ticketKey);

      const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
      const day = dayNames[dateObj.getDay()];
      if (!dayOfWeekStats[day]) dayOfWeekStats[day] = { revenue: 0, tickets: new Set() };
      dayOfWeekStats[day].revenue += revenue;
      if (ticketKey) dayOfWeekStats[day].tickets.add(ticketKey);

      // Día operativo y turno: mandan las reglas de la sesión; sin sesión (legacy) se clasifica la línea
      const sessionInfo = v.sesion ? sessionMeta[v.sesion] : undefined;
      const { turno: saleTurno, businessDate } = sessionInfo
        ? { turno: sessionInfo.turno, businessDate: sessionInfo.businessDate }
        : businessDateFor(dateObj);

      const ymd = toLocalYMD(businessDate);
      let timeKey: string;
      if (timeGrouping === 'daily') timeKey = ymd;
      else if (timeGrouping === 'weekly') timeKey = `${businessDate.getFullYear()}-W${String(isoWeekNumber(businessDate)).padStart(2, '0')}`;
      else if (timeGrouping === 'shift') timeKey = v.sesion || `${ymd} (Sin Sesión)`;
      else timeKey = ymd.substring(0, 7);

      if (!timeStats[timeKey]) timeStats[timeKey] = emptyPoint(timeKey, businessDate);
      const tp = timeStats[timeKey];
      tp.revenue += revenue;
      tp.margin += margin;
      tp.cost += cost;
      tp[saleTurno] += revenue;
      if (v.sesion) {
        tp.posRevenue += revenue;
        if (!tp.sessionIds.includes(v.sesion)) tp.sessionIds.push(v.sesion);
      } else {
        tp.backendRevenue += revenue;
      }
    });

    const productEntries = Object.entries(productStats).map(([name, s]) => ({ name: truncate(name, 25), fullName: name, ...s }));
    const topMovers = [...productEntries].sort((a, b) => b.qty - a.qty).slice(0, 10);
    const topMargin = [...productEntries].sort((a, b) => b.margin - a.margin).slice(0, 10);
    const categoryData = Object.entries(categoryStats).map(([name, s]) => ({ name: truncate(name, 15), ...s })).sort((a, b) => b.margin - a.margin).slice(0, 8);

    const allBrandsData = Object.entries(brandStats).map(([name, s]) => {
      const catStat = brandCatalogStats[name];
      const catalogMarginPercent = catStat && catStat.totalProducts > 0 ? (catStat.sumOfMarginPercents / catStat.totalProducts) : 0;
      return {
        name, fullName: name, ...s,
        percentOfRevenue: totalRevenue > 0 ? (s.revenue / totalRevenue) * 100 : 0,
        marginPercent: s.revenue > 0 ? (s.margin / s.revenue) * 100 : 0,
        catalogMarginPercent
      };
    }).sort((a, b) => b.qty - a.qty);
    const brandData = allBrandsData.slice(0, 10);

    const allProductsData = Object.entries(productStats).map(([name, s]) => ({ fullName: name, ...s })).sort((a, b) => b.qty - a.qty);

    // Rango de días cubierto por las ventas filtradas
    let minDate = Number.POSITIVE_INFINITY;
    let maxDate = Number.NEGATIVE_INFINITY;
    filteredVentas.forEach(v => {
      const t = new Date(v.date).getTime();
      if (Number.isNaN(t)) return;
      if (t < minDate) minDate = t;
      if (t > maxDate) maxDate = t;
    });
    const hasDates = Number.isFinite(minDate) && Number.isFinite(maxDate);
    const daysRange = hasDates ? Math.max(1, Math.ceil((maxDate - minDate) / 86_400_000)) : 1;

    const inventoryDays = inventario
      .map(inv => {
        const soldQty = invSalesQty.get(inv.id) || 0;
        const avgDailySales = soldQty / daysRange;
        const daysLeft = avgDailySales > 0 ? inv.stock / avgDailySales : 9999;
        return { name: truncate(inv.product_name, 25), fullName: inv.product_name, stock: inv.stock, daysLeft, avgDailySales };
      })
      .filter(i => i.daysLeft < 9999 && i.stock > 0)
      .sort((a, b) => a.daysLeft - b.daysLeft)
      .slice(0, 10);

    const deadStock = inventario
      .filter(inv => inv.stock > 0 && (invSalesQty.get(inv.id) || 0) <= 0)
      .map(inv => ({
        name: truncate(inv.product_name, 30),
        fullName: inv.product_name,
        stock: inv.stock,
        costoUnitario: inv.costo,
        costoTotal: inv.stock * inv.costo,
        precioTotal: inv.stock * inv.precio,
        marca: inv.marca || 'Sin Marca',
      }))
      .sort((a, b) => b.costoTotal - a.costoTotal);

    const pricingAnomalies = inventario
      .filter(inv => {
        const precio = Number(inv.precio) || 0;
        const costo = Number(inv.costo) || 0;
        if (precio === 0 && costo === 0) return false;
        if (precio < costo) return true;
        if (costo === 0 && precio > 0) return true;
        const margin = ((precio - costo) / precio) * 100;
        return margin < 5 || margin > 85;
      })
      .map(inv => {
        const precio = Number(inv.precio) || 0;
        const costo = Number(inv.costo) || 0;
        const margin = precio > 0 ? ((precio - costo) / precio) * 100 : 0;
        let reason = '';
        let severity: 'critical' | 'warning' | 'info' = 'warning';
        if (precio < costo) { reason = 'Precio menor al costo (Pérdida)'; severity = 'critical'; }
        else if (costo === 0) { reason = 'Costo en cero'; severity = 'warning'; }
        else if (margin > 85) { reason = 'Margen inusualmente alto (>85%)'; severity = 'info'; }
        else if (margin < 5) { reason = 'Margen inusualmente bajo (<5%)'; severity = 'warning'; }
        return { name: inv.product_name, precio, costo, margin, reason, severity };
      })
      .sort((a, b) => {
        if (a.severity === 'critical' && b.severity !== 'critical') return -1;
        if (b.severity === 'critical' && a.severity !== 'critical') return 1;
        return b.margin - a.margin;
      });

    const hourlyData = [];
    for (let i = 0; i < 24; i++) {
      const h = i.toString().padStart(2, '0') + ':00';
      hourlyData.push({ hour: h, revenue: hourlyStats[h]?.revenue || 0, txs: hourlyStats[h]?.tickets.size || 0 });
    }

    const daysData = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'].map(day => ({
      day,
      revenue: dayOfWeekStats[day]?.revenue || 0,
      txs: dayOfWeekStats[day]?.tickets.size || 0
    }));

    const staffData = Object.entries(staffStats)
      .map(([name, s]) => ({ name, revenue: s.revenue, margin: s.margin, txs: s.tickets.size }))
      .sort((a, b) => b.revenue - a.revenue);

    const sortedTimeData = Object.values(timeStats);
    if (timeGrouping === 'shift') sortedTimeData.sort((a, b) => new Date(a.dateForSort).getTime() - new Date(b.dateForSort).getTime());
    else sortedTimeData.sort((a, b) => a.time.localeCompare(b.time));

    let posRevenue = 0;
    let backendRevenue = 0;
    sortedTimeData.forEach(s => { posRevenue += s.posRevenue; backendRevenue += s.backendRevenue; });

    // Un solo origen para el gráfico de tendencias: timeStats ya agrupa por día operativo local
    const trendData: TrendPoint[] = sortedTimeData.slice(-30).map(s => ({
      ...s,
      time: timeGrouping === 'monthly' ? s.time.substring(5) : s.time
    }));

    const marginPercent = totalRevenue > 0 ? (totalMargin / totalRevenue) * 100 : 0;
    const ticketAvg = ticketKeys.size > 0 ? totalRevenue / ticketKeys.size : 0;

    const globalCatalogMarginPercent = (() => {
      let sum = 0;
      let count = 0;
      inventario.forEach(inv => {
        if (inv.precio > 0) { sum += ((inv.precio - inv.costo) / inv.precio) * 100; count++; }
      });
      return count > 0 ? sum / count : 0;
    })();

    const brandCatalogData = Object.entries(brandCatalogStats)
      .filter(([, s]) => s.totalPrecio > 0)
      .map(([name, s]) => ({
        name: truncate(name, 20),
        fullName: name,
        catalogMarginPercent: s.totalProducts > 0 ? (s.sumOfMarginPercents / s.totalProducts) : 0,
        totalProducts: s.totalProducts,
        products: [...s.products].sort((a, b) => {
          const m1 = a.precio > 0 ? ((a.precio - a.costo) / a.precio) * 100 : 0;
          const m2 = b.precio > 0 ? ((b.precio - b.costo) / b.precio) * 100 : 0;
          return m2 - m1;
        }),
        revenue: brandStats[name]?.revenue || 0
      }))
      .sort((a, b) => b.catalogMarginPercent - a.catalogMarginPercent);

    // Venta semanal promedio de las últimas 4 semanas con datos, dividiendo entre las semanas
    // realmente cubiertas (no siempre 4). Sin ventas, se respeta el valor manual.
    const calculatedWeeklySales = (() => {
      if (!hasDates) return weeklySales;
      const fourWeeksAgo = addLocalDays(new Date(maxDate), -28).getTime();
      let recentRevenue = 0;
      let recentMin = maxDate;
      filteredVentas.forEach(v => {
        const t = new Date(v.date).getTime();
        if (Number.isNaN(t) || t < fourWeeksAgo) return;
        recentRevenue += v.quantity * v.unit_price;
        if (t < recentMin) recentMin = t;
      });
      const weeksCovered = Math.max(1, Math.min(4, Math.ceil((maxDate - recentMin) / (7 * 86_400_000))));
      return recentRevenue / weeksCovered;
    })();

    // Flujo comercial del mes calendario en curso. "Comprado" = órdenes conciliadas o con recepción registrada.
    const flujoComercial = (() => {
      const today = new Date();
      const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const vendido = ventas
        .filter(v => new Date(v.date) >= firstDayOfMonth)
        .reduce((sum, v) => sum + (v.quantity * v.unit_price), 0);
      const ordenesMes = ordenes.filter(o => new Date(o.created_at) >= firstDayOfMonth && (o.conciliado || o.status !== 'Pendiente'));

      let comprado = 0;
      let estimado = 0;
      ordenesMes.forEach(o => {
        estimado += o.total || 0;
        comprado += (o.monto_factura_real !== undefined && o.monto_factura_real !== null) ? Number(o.monto_factura_real) : (o.total || 0);
      });

      return { vendido, comprado, estimado, varianza: comprado - estimado, ratio: vendido > 0 ? (comprado / vendido) * 100 : 0 };
    })();

    return {
      totalRevenue, totalCost, totalMargin, marginPercent, globalCatalogMarginPercent, ticketAvg, totalTransactions: ticketKeys.size,
      productStats, categoryStats, brandStats, staffStats, brandCatalogStats, timeStats,
      topMovers, topMargin, categoryData, allBrandsData, brandData, allProductsData, brandCatalogData,
      trendData, hourlyData, daysData, staffData, inventoryDays, deadStock, pricingAnomalies,
      calculatedWeeklySales, flujoComercial, posRevenue, backendRevenue, daysRange,
      sessionSummaries: Object.values(sessionSummaries).sort((a, b) => new Date(b.maxDate).getTime() - new Date(a.maxDate).getTime())
    };
  }, [filteredVentas, ventas, sessionMeta, inventario, ordenes, timeGrouping, weeklySales]);
}

export type BusinessMetrics = ReturnType<typeof useBusinessMetrics>;
