import { useMemo } from 'react';
import type { VentaHistorica, OdooInventario, PurchaseOrder } from '../types';

interface UseBusinessMetricsProps {
  ventas: VentaHistorica[];
  inventario?: OdooInventario[];
  ordenes?: PurchaseOrder[];
  timeGrouping?: 'daily' | 'weekly' | 'monthly' | 'shift';
  weeklySales?: number;
}

export function useBusinessMetrics({ ventas, inventario = [], ordenes = [], timeGrouping = 'monthly', weeklySales = 0 }: UseBusinessMetricsProps) {
  return useMemo(() => {
    let totalRevenue = 0;
    let totalCost = 0;
    let totalMargin = 0;
    let totalTransactions = new Set<string>();
    
    const productStats: Record<string, { qty: number; margin: number; revenue: number; category: string; brand: string }> = {};
    const categoryStats: Record<string, { revenue: number; margin: number }> = {};
    const brandStats: Record<string, { revenue: number; margin: number; qty: number }> = {};
    const hourlyStats: Record<string, { revenue: number; count: number }> = {};
    const dayOfWeekStats: Record<string, { revenue: number; count: number }> = {};
    const staffStats: Record<string, { revenue: number; margin: number; txs: number }> = {};
    const brandCatalogStats: Record<string, { totalPrecio: number; totalCosto: number; totalProducts: number; products: typeof inventario }> = {};
    const timeStats: Record<string, { revenue: number; margin: number; cost: number; dateForSort: string; turno1: number; turno2: number; turno3: number; posRevenue: number; backendRevenue: number }> = {};

    const getWeekNumber = (d: Date) => {
      const date = new Date(d.getTime());
      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
      const week1 = new Date(date.getFullYear(), 0, 4);
      return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
    };

    if (inventario) {
      inventario.forEach(inv => {
        const b = inv.marca || 'Sin Especificar';
        if (!brandStats[b]) brandStats[b] = { revenue: 0, margin: 0, qty: 0 };
        if (!brandCatalogStats[b]) brandCatalogStats[b] = { totalPrecio: 0, totalCosto: 0, totalProducts: 0, products: [] };
        brandCatalogStats[b].products.push(inv);
        if (inv.precio > 0) {
          brandCatalogStats[b].totalPrecio += inv.precio;
          brandCatalogStats[b].totalCosto += inv.costo;
          brandCatalogStats[b].totalProducts += 1;
        }
      });
    }

    const inventarioMapById = new Map<string, OdooInventario>();
    if (inventario) {
      inventario.forEach(i => {
        if (i.odoo_id) {
          inventarioMapById.set(i.odoo_id, i);
          if (i.odoo_id.includes('__export__')) {
            const num = i.odoo_id.split('_').find(p => /^\d+$/.test(p));
            if (num) inventarioMapById.set(num, i);
          }
        }
      });
    }
    const inventarioMapByName = new Map((inventario || []).map(i => [i.product_name.toLowerCase(), i]));

    // PASO 1: Mapeo de Sesiones (Regla de Oro con Midpoint)
    const sessionMeta: Record<string, { minDate: Date; maxDate: Date; turno: 'turno1' | 'turno2' | 'turno3'; businessDate: Date }> = {};
    ventas.forEach(v => {
      if (v.sesion) {
        const d = new Date(v.date);
        if (!sessionMeta[v.sesion]) {
          sessionMeta[v.sesion] = { minDate: d, maxDate: d, turno: 'turno1', businessDate: d }; // Placeholder
        } else {
          if (d < sessionMeta[v.sesion].minDate) sessionMeta[v.sesion].minDate = d;
          if (d > sessionMeta[v.sesion].maxDate) sessionMeta[v.sesion].maxDate = d;
        }
      }
    });

    // Calcular Turno y Día Operativo evaluando el punto medio (midpoint) de la sesión
    Object.keys(sessionMeta).forEach(sesion => {
      const meta = sessionMeta[sesion];
      const midpointTime = meta.minDate.getTime() + (meta.maxDate.getTime() - meta.minDate.getTime()) / 2;
      const midpointDate = new Date(midpointTime);
      const hour = midpointDate.getHours();
      
      // Asignación de Turnos (heurística para Farmacia 24/7 basada en Midpoint)
      // Mañana: 06:00 a 13:59 
      // Tarde:  14:00 a 21:59 
      // Noche:  22:00 a 05:59 
      if (hour >= 6 && hour < 14) meta.turno = 'turno1'; // Mañana
      else if (hour >= 14 && hour < 22) meta.turno = 'turno2'; // Tarde
      else meta.turno = 'turno3'; // Noche

      // Asignación de Día Operativo (offset solo para Turno Noche post-medianoche)
      const bd = new Date(midpointDate.getTime());
      if (meta.turno === 'turno3' && hour < 12) {
        bd.setDate(bd.getDate() - 1);
      }
      meta.businessDate = bd;
    });

    // PASO 2: Procesar Ventas usando el Mapeo
    const sessionSummaries: Record<string, {
      sesion: string;
      cajero: string;
      minDate: string;
      maxDate: string;
      turno: string;
      revenue: number;
      cost: number;
      margin: number;
      orders: Set<string>;
      products: { name: string; qty: number; price: number; total: number; }[];
    }> = {};

    Object.keys(sessionMeta).forEach(s => {
      sessionSummaries[s] = {
        sesion: s,
        cajero: 'Desconocido',
        minDate: sessionMeta[s].minDate.toISOString(),
        maxDate: sessionMeta[s].maxDate.toISOString(),
        turno: sessionMeta[s].turno,
        revenue: 0,
        cost: 0,
        margin: 0,
        orders: new Set<string>(),
        products: []
      };
    });

    const resolveProductName = (v: VentaHistorica): string => {
      if (v.odoo_id) {
        const invItem = inventarioMapById.get(v.odoo_id);
        if (invItem) return invItem.product_name;
      }
      return v.product_name;
    };

    ventas.forEach(v => {
      const revenue = v.quantity * v.unit_price;
      const invItem = (v.odoo_id ? inventarioMapById.get(v.odoo_id) : undefined) || inventarioMapByName.get(v.product_name.toLowerCase());
      const cost = v.total_cost > 0 ? v.total_cost : (invItem && invItem.costo > 0 ? (v.quantity * invItem.costo) : 0);
      const margin = revenue - cost;
      
      const resolvedName = resolveProductName(v);

      totalRevenue += revenue;
      totalCost += cost;
      totalMargin += margin;
      if (v.order_ref) totalTransactions.add(v.order_ref);

      const staffName = v.cajero && v.cajero !== 'Sin Asignar' ? v.cajero : (v.vendedor && v.vendedor !== 'Sin Asignar' ? v.vendedor : 'Desconocido');

      if (v.sesion && sessionSummaries[v.sesion]) {
        sessionSummaries[v.sesion].revenue += revenue;
        sessionSummaries[v.sesion].cost += cost;
        sessionSummaries[v.sesion].margin += margin;
        if (v.order_ref) sessionSummaries[v.sesion].orders.add(v.order_ref);
        if (staffName !== 'Desconocido') sessionSummaries[v.sesion].cajero = staffName;
        
        const existingProd = sessionSummaries[v.sesion].products.find(p => p.name === resolvedName && p.price === v.unit_price);
        if (existingProd) {
          existingProd.qty += v.quantity;
          existingProd.total += revenue;
        } else {
          sessionSummaries[v.sesion].products.push({
            name: resolvedName,
            qty: v.quantity,
            price: v.unit_price,
            total: revenue
          });
        }
      }

      const brand = v.marca && v.marca !== 'Sin Marca' ? v.marca : 'Sin Especificar';
      
      if (!productStats[resolvedName]) productStats[resolvedName] = { qty: 0, margin: 0, revenue: 0, category: v.category || 'Sin categoría', brand };
      productStats[resolvedName].qty += v.quantity;
      productStats[resolvedName].margin += margin;
      productStats[resolvedName].revenue += revenue;

      const cat = v.category || 'Sin categoría';
      if (!categoryStats[cat]) categoryStats[cat] = { revenue: 0, margin: 0 };
      categoryStats[cat].revenue += revenue;
      categoryStats[cat].margin += margin;

      if (!brandStats[brand]) brandStats[brand] = { revenue: 0, margin: 0, qty: 0 };
      brandStats[brand].revenue += revenue;
      brandStats[brand].margin += margin;
      brandStats[brand].qty += v.quantity;


      if (!staffStats[staffName]) staffStats[staffName] = { revenue: 0, margin: 0, txs: 0 };
      staffStats[staffName].revenue += revenue;
      staffStats[staffName].margin += margin;
      staffStats[staffName].txs += 1;

      if (v.date) {
        const dateObj = new Date(v.date);
        const hour = dateObj.getHours().toString().padStart(2, '0') + ':00';
        if (!hourlyStats[hour]) hourlyStats[hour] = { revenue: 0, count: 0 };
        hourlyStats[hour].revenue += revenue;
        hourlyStats[hour].count += 1;

        const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
        const day = dayNames[dateObj.getDay()];
        if (!dayOfWeekStats[day]) dayOfWeekStats[day] = { revenue: 0, count: 0 };
        dayOfWeekStats[day].revenue += revenue;
        dayOfWeekStats[day].count += 1;

        let timeKey = '';
        const sessionInfo = v.sesion ? sessionMeta[v.sesion] : null;
        let businessDate: Date;
        let saleTurno: 'turno1' | 'turno2' | 'turno3';

        if (sessionInfo) {
          // Si tiene sesión, mandan las reglas de la sesión
          businessDate = sessionInfo.businessDate;
          saleTurno = sessionInfo.turno;
        } else {
          // Si no tiene sesión (legacy), aplicamos offset individual
          businessDate = new Date(dateObj.getTime());
          const rawHour = dateObj.getHours();
          
          if (rawHour >= 4 && rawHour < 12) saleTurno = 'turno1';
          else if (rawHour >= 12 && rawHour < 20) saleTurno = 'turno2';
          else saleTurno = 'turno3';
          
          if (saleTurno === 'turno3' && rawHour < 12) {
            businessDate.setDate(businessDate.getDate() - 1);
          }
        }

        const y = businessDate.getFullYear();
        const m = String(businessDate.getMonth() + 1).padStart(2, '0');
        const d = String(businessDate.getDate()).padStart(2, '0');
        
        if (timeGrouping === 'daily') timeKey = `${y}-${m}-${d}`;
        else if (timeGrouping === 'monthly') timeKey = `${y}-${m}`;
        else if (timeGrouping === 'weekly') timeKey = `${y}-W${getWeekNumber(businessDate).toString().padStart(2, '0')}`;
        else if (timeGrouping === 'shift') timeKey = v.sesion || `${y}-${m}-${d} (Sin Sesión)`;

        if (!timeStats[timeKey]) timeStats[timeKey] = { revenue: 0, margin: 0, cost: 0, dateForSort: businessDate.toISOString(), turno1: 0, turno2: 0, turno3: 0, posRevenue: 0, backendRevenue: 0 };
        timeStats[timeKey].revenue += revenue;
        timeStats[timeKey].margin += margin;
        timeStats[timeKey].cost += cost;
        timeStats[timeKey][saleTurno] += revenue;
        if (v.sesion) {
          timeStats[timeKey].posRevenue += revenue;
        } else {
          timeStats[timeKey].backendRevenue += revenue;
        }
      }
    });

    const topMovers = Object.entries(productStats).map(([name, s]) => ({ name: name.length > 25 ? name.substring(0, 25) + '...' : name, fullName: name, ...s })).sort((a, b) => b.qty - a.qty).slice(0, 10);
    const topMargin = Object.entries(productStats).map(([name, s]) => ({ name: name.length > 25 ? name.substring(0, 25) + '...' : name, fullName: name, ...s })).sort((a, b) => b.margin - a.margin).slice(0, 10);
    const categoryData = Object.entries(categoryStats).map(([name, s]) => ({ name: name.length > 15 ? name.substring(0, 15) + '...' : name, ...s })).sort((a, b) => b.margin - a.margin).slice(0, 8);
    
    const allBrandsData = Object.entries(brandStats).map(([name, s]) => ({ 
      name, fullName: name, ...s, 
      percentOfRevenue: totalRevenue > 0 ? (s.revenue / totalRevenue) * 100 : 0,
      marginPercent: s.revenue > 0 ? (s.margin / s.revenue) * 100 : 0
    })).sort((a, b) => b.qty - a.qty);
    const brandData = allBrandsData.slice(0, 10);
    
    const allProductsData = Object.entries(productStats).map(([name, s]) => ({ fullName: name, ...s })).sort((a, b) => b.qty - a.qty);
    
    let minDate = new Date().getTime();
    let maxDate = new Date(0).getTime();
    if (ventas.length > 0) {
      ventas.forEach(v => {
        const d = new Date(v.date).getTime();
        if (d < minDate) minDate = d;
        if (d > maxDate) maxDate = d;
      });
    }
    const daysRange = Math.max(1, Math.ceil((maxDate - minDate) / (1000 * 60 * 60 * 24)));
    
    const inventoryDays = inventario
      .map(inv => {
        const productStat = productStats[inv.product_name] || { qty: 0 };
        const avgDailySales = productStat.qty / daysRange;
        const daysLeft = avgDailySales > 0 ? inv.stock / avgDailySales : 9999;
        return { 
          name: inv.product_name.length > 25 ? inv.product_name.substring(0, 25) + '...' : inv.product_name, 
          fullName: inv.product_name, 
          stock: inv.stock, 
          daysLeft, 
          avgDailySales 
        };
      })
      .filter(i => i.daysLeft < 9999 && i.stock > 0)
      .sort((a, b) => a.daysLeft - b.daysLeft)
      .slice(0, 10);

    const deadStock = inventario
      .filter(inv => inv.stock > 0 && (!productStats[inv.product_name] || productStats[inv.product_name].qty === 0))
      .map(inv => ({
        name: inv.product_name.length > 30 ? inv.product_name.substring(0, 30) + '...' : inv.product_name,
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
        if (precio > 0 && costo > 0) {
           const margin = ((precio - costo) / precio) * 100;
           if (margin < 5 || margin > 85) return true;
        }
        return false;
      })
      .map(inv => {
        const precio = Number(inv.precio) || 0;
        const costo = Number(inv.costo) || 0;
        const margin = precio > 0 ? ((precio - costo) / precio) * 100 : 0;
        let reason = '';
        let severity = 'warning';
        if (precio < costo) { reason = 'Precio menor al costo (Pérdida)'; severity = 'critical'; }
        else if (costo === 0) { reason = 'Costo en cero'; severity = 'warning'; }
        else if (margin > 85) { reason = 'Margen inusualmente alto (>85%)'; severity = 'info'; }
        else if (margin < 5) { reason = 'Margen inusualmente bajo (<5%)'; severity = 'warning'; }
        return {
          name: inv.product_name,
          precio,
          costo,
          margin,
          reason,
          severity
        };
      })
      .sort((a, b) => {
        if (a.severity === 'critical' && b.severity !== 'critical') return -1;
        if (b.severity === 'critical' && a.severity !== 'critical') return 1;
        return b.margin - a.margin;
      });

    // Empty line to keep the same block structure
    
    const hourlyData = [];
    for(let i=0; i<24; i++) {
      const h = i.toString().padStart(2, '0') + ':00';
      hourlyData.push({ hour: h, revenue: hourlyStats[h]?.revenue || 0, txs: hourlyStats[h]?.count || 0 });
    }

    const dayNames = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
    const daysData = dayNames.map(day => ({
      day,
      revenue: dayOfWeekStats[day]?.revenue || 0,
      txs: dayOfWeekStats[day]?.count || 0
    }));

    const staffData = Object.entries(staffStats).map(([name, s]) => ({ name, ...s })).sort((a, b) => b.revenue - a.revenue);

    // Ordenar timeData cronológicamente si es por turno
    let sortedTimeData = Object.entries(timeStats).map(([time, s]) => ({ time, ...s }));
    if (timeGrouping === 'shift') {
      sortedTimeData.sort((a, b) => new Date(a.dateForSort).getTime() - new Date(b.dateForSort).getTime());
    } else {
      sortedTimeData.sort((a, b) => a.time.localeCompare(b.time));
    }

    let posRevenue = 0;
    let backendRevenue = 0;
    Object.values(timeStats).forEach(s => {
      posRevenue += s.posRevenue;
      backendRevenue += s.backendRevenue;
    });

    const trendData = sortedTimeData.slice(-30).map(s => ({ 
      ...s,
      time: timeGrouping === 'monthly' ? s.time.substring(5) : s.time
    }));

    const marginPercent = totalRevenue > 0 ? (totalMargin / totalRevenue) * 100 : 0;
    const ticketAvg = totalTransactions.size > 0 ? totalRevenue / totalTransactions.size : 0;
    
    const brandCatalogData = Object.entries(brandCatalogStats)
      .filter(([_, s]) => s.totalPrecio > 0)
      .map(([name, s]) => ({
        name: name.length > 20 ? name.substring(0, 20) + '...' : name,
        fullName: name,
        catalogMarginPercent: ((s.totalPrecio - s.totalCosto) / s.totalPrecio) * 100,
        totalProducts: s.totalProducts,
        products: s.products.sort((a, b) => {
          const m1 = a.precio > 0 ? ((a.precio - a.costo) / a.precio) * 100 : 0;
          const m2 = b.precio > 0 ? ((b.precio - b.costo) / b.precio) * 100 : 0;
          return m2 - m1;
        }),
        revenue: brandStats[name]?.revenue || 0
      }))
      .sort((a, b) => b.catalogMarginPercent - a.catalogMarginPercent);

    const calculatedWeeklySales = (() => {
      if (ventas.length === 0) return weeklySales;
      const sortedVentas = [...ventas].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      const latestDate = new Date(sortedVentas[0].date);
      const fourWeeksAgo = new Date(latestDate);
      fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);
      const recentVentas = sortedVentas.filter(v => new Date(v.date) >= fourWeeksAgo);
      const totalRecentRevenue = recentVentas.reduce((sum, v) => sum + (v.quantity * v.unit_price), 0);
      return totalRecentRevenue / 4;
    })();

    const flujoComercial = (() => {
      const today = new Date();
      const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const ventasMes = ventas.filter(v => new Date(v.date) >= firstDayOfMonth);
      const vendido = ventasMes.reduce((sum, v) => sum + (v.quantity * v.unit_price), 0);
      const ordenesMes = ordenes.filter(o => new Date(o.created_at) >= firstDayOfMonth && o.status !== 'Pendiente');
      
      let comprado = 0;
      let estimado = 0;
      ordenesMes.forEach(o => {
        estimado += (o as any).total || 0;
        const real = (o as any).monto_factura_real;
        comprado += (real !== undefined && real !== null) ? Number(real) : ((o as any).total || 0);
      });
      
      return {
        vendido,
        comprado,
        estimado,
        varianza: comprado - estimado,
        ratio: vendido > 0 ? (comprado / vendido) * 100 : 0
      };
    })();

    return {
      totalRevenue, totalCost, totalMargin, marginPercent, ticketAvg, totalTransactions: totalTransactions.size,
      productStats, categoryStats, brandStats, hourlyStats, dayOfWeekStats, staffStats, brandCatalogStats, timeStats,
      topMovers, topMargin, categoryData, allBrandsData, brandData, allProductsData, brandCatalogData,
      trendData, hourlyData, daysData, staffData, inventoryDays, deadStock, pricingAnomalies,
      calculatedWeeklySales, flujoComercial, posRevenue, backendRevenue,
      sessionSummaries: Object.values(sessionSummaries).sort((a, b) => new Date(b.maxDate).getTime() - new Date(a.maxDate).getTime())
    };
  }, [ventas, inventario, ordenes, timeGrouping, weeklySales]);
}
