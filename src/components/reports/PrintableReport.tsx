import { useMemo } from 'react';
import { XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell, BarChart, Bar, Legend } from 'recharts';
import type { VentaHistorica, OdooInventario } from '../../types';

interface PrintableReportProps {
  ventas: VentaHistorica[];
  inventario?: OdooInventario[];
  startDate: string;
  endDate: string;
}

const COLORS = ['#10b981', '#f59e0b', '#3b82f6', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

export default function PrintableReport({ ventas, inventario = [], startDate, endDate }: PrintableReportProps) {
  const metrics = useMemo(() => {
    const start = new Date(startDate);
    start.setHours(0,0,0,0);
    const end = new Date(endDate);
    end.setHours(23,59,59,999);

    const filteredVentas = ventas.filter(v => {
      const d = new Date(v.date);
      return d >= start && d <= end;
    });

    let totalRevenue = 0;
    let totalCost = 0;
    let totalPosRevenue = 0;
    let totalBackendRevenue = 0;
    const uniqueTickets = new Set();
    
    const revenueByHour: Record<string, number> = {};
    const revenueByDay: Record<string, { revenue: number, turno1: number, turno2: number, turno3: number }> = {};
    const revenueByStaff: Record<string, number> = {};
    const brandStats: Record<string, { revenue: number, cost: number, qty: number }> = {};
    const productStats: Record<string, { revenue: number, margin: number, qty: number }> = {};

    // PASO 1: Mapeo de Sesiones (Regla de Oro con Midpoint)
    const sessionMeta: Record<string, { minDate: Date; maxDate: Date; turno: 'turno1' | 'turno2' | 'turno3'; businessDate: Date }> = {};
    filteredVentas.forEach(v => {
      if (v.sesion) {
        const d = new Date(v.date);
        if (!sessionMeta[v.sesion]) {
          sessionMeta[v.sesion] = { minDate: d, maxDate: d, turno: 'turno1', businessDate: d }; 
        } else {
          if (d < sessionMeta[v.sesion].minDate) sessionMeta[v.sesion].minDate = d;
          if (d > sessionMeta[v.sesion].maxDate) sessionMeta[v.sesion].maxDate = d;
        }
      }
    });

    Object.keys(sessionMeta).forEach(sesion => {
      const meta = sessionMeta[sesion];
      const midpointTime = meta.minDate.getTime() + (meta.maxDate.getTime() - meta.minDate.getTime()) / 2;
      const midpointDate = new Date(midpointTime);
      const hour = midpointDate.getHours();
      
      if (hour >= 6 && hour < 14) meta.turno = 'turno1'; 
      else if (hour >= 14 && hour < 22) meta.turno = 'turno2'; 
      else meta.turno = 'turno3'; 

      const bd = new Date(midpointDate.getTime());
      if (meta.turno === 'turno3' && hour < 12) bd.setDate(bd.getDate() - 1);
      meta.businessDate = bd;
    });

    filteredVentas.forEach(v => {
      const revenue = v.quantity * v.unit_price;
      const cost = v.total_cost || 0;
      const margin = revenue - cost;
      
      totalRevenue += revenue;
      totalCost += cost;
      if (v.order_ref) {
        const ticketKey = v.sesion ? `${v.sesion}_${v.order_ref}` : v.order_ref;
        uniqueTickets.add(ticketKey);
      }
      
      if (v.sesion) {
        totalPosRevenue += revenue;
      } else {
        totalBackendRevenue += revenue;
      }
      
      const dateObj = new Date(v.date);
      const hour = dateObj.getHours().toString().padStart(2, '0') + ':00';
      const staff = v.cajero || v.vendedor || 'Desconocido';
      const brand = v.marca || 'Sin Marca';
      const prodName = v.product_name || 'Desconocido';

      const sessionInfo = v.sesion ? sessionMeta[v.sesion] : null;
      let businessDate: Date;
      let saleTurno: 'turno1' | 'turno2' | 'turno3';

      if (sessionInfo) {
        businessDate = sessionInfo.businessDate;
        saleTurno = sessionInfo.turno;
      } else {
        businessDate = new Date(dateObj.getTime());
        const rawHour = dateObj.getHours();
        
        if (rawHour >= 4 && rawHour < 12) saleTurno = 'turno1';
        else if (rawHour >= 12 && rawHour < 20) saleTurno = 'turno2';
        else saleTurno = 'turno3';
        
        if (saleTurno === 'turno3' && rawHour < 12) businessDate.setDate(businessDate.getDate() - 1);
      }

      const day = businessDate.toISOString().split('T')[0];
      
      revenueByHour[hour] = (revenueByHour[hour] || 0) + revenue;
      if (!revenueByDay[day]) revenueByDay[day] = { revenue: 0, turno1: 0, turno2: 0, turno3: 0 };
      revenueByDay[day].revenue += revenue;
      revenueByDay[day][saleTurno] += revenue;
      
      revenueByStaff[staff] = (revenueByStaff[staff] || 0) + revenue;
      
      if (!brandStats[brand]) brandStats[brand] = { revenue: 0, cost: 0, qty: 0 };
      brandStats[brand].revenue += revenue;
      brandStats[brand].cost += cost;
      brandStats[brand].qty += v.quantity;

      if (!productStats[prodName]) productStats[prodName] = { revenue: 0, margin: 0, qty: 0 };
      productStats[prodName].revenue += revenue;
      productStats[prodName].margin += margin;
      productStats[prodName].qty += v.quantity;
    });

    const totalMargin = totalRevenue - totalCost;
    const marginPercent = totalRevenue > 0 ? (totalMargin / totalRevenue) * 100 : 0;
    const avgTicket = uniqueTickets.size > 0 ? totalRevenue / uniqueTickets.size : 0;
    
    const globalCatalogMarginPercent = (() => {
      let sumOfMarginPercents = 0;
      let count = 0;
      if (inventario) {
        inventario.forEach(inv => {
          if (inv.precio > 0) {
            const m = ((inv.precio - inv.costo) / inv.precio) * 100;
            sumOfMarginPercents += m;
            count++;
          }
        });
      }
      return count > 0 ? sumOfMarginPercents / count : 0;
    })();

    const topStaff = Object.entries(revenueByStaff).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const topHours = Object.entries(revenueByHour).sort((a, b) => b[1] - a[1]).slice(0, 5);
    
    const dailyData = Object.entries(revenueByDay).sort((a, b) => a[0].localeCompare(b[0])).map(([date, data]) => ({
      date: date.substring(5), // MM-DD
      revenue: data.revenue,
      turno1: data.turno1,
      turno2: data.turno2,
      turno3: data.turno3
    }));

    const brandCatalogStats: Record<string, { sum: number, count: number }> = {};
    if (inventario) {
      inventario.forEach(inv => {
        const b = inv.marca || 'Sin Especificar';
        if (inv.precio > 0) {
          if (!brandCatalogStats[b]) brandCatalogStats[b] = { sum: 0, count: 0 };
          brandCatalogStats[b].sum += ((inv.precio - inv.costo) / inv.precio) * 100;
          brandCatalogStats[b].count += 1;
        }
      });
    }

    const brandData = Object.entries(brandStats)
      .sort((a, b) => b[1].revenue - a[1].revenue)
      .map(([name, stats]) => {
        const catStats = brandCatalogStats[name];
        const catalogMarginPercent = catStats && catStats.count > 0 ? (catStats.sum / catStats.count) : null;
        return {
          name,
          value: stats.revenue,
          margin: stats.revenue - stats.cost,
          marginPercent: stats.revenue > 0 ? ((stats.revenue - stats.cost) / stats.revenue) * 100 : 0,
          catalogMarginPercent,
          qty: stats.qty
        };
      });
      
    const topBrands = brandData.slice(0, 6); // For PieChart
    const topProducts = Object.entries(productStats)
      .sort((a, b) => b[1].revenue - a[1].revenue)
      .slice(0, 5);

    const bestDay = dailyData.reduce((max, d) => d.revenue > max.revenue ? d : max, {date: '', revenue: 0});
    const bestBrand = brandData.length > 0 ? brandData[0] : {name: 'N/A', value: 0, marginPercent: 0};
    
    const mostProfitableBrand = brandData.length > 0 
      ? brandData.reduce((max, b) => b.marginPercent > max.marginPercent && b.value > 1000 ? b : max, brandData[0]) 
      : {name: 'N/A', marginPercent: 0};

    const bestStaff = topStaff.length > 0 ? topStaff[0] : ['N/A', 0];
    const bestHour = topHours.length > 0 ? topHours[0] : ['N/A', 0];

    const totalT1 = dailyData.reduce((acc, d) => acc + d.turno1, 0);
    const totalT2 = dailyData.reduce((acc, d) => acc + d.turno2, 0);
    const totalT3 = dailyData.reduce((acc, d) => acc + d.turno3, 0);

    return {
      totalRevenue, totalCost, totalMargin, marginPercent, avgTicket, totalTickets: uniqueTickets.size,
      totalPosRevenue, totalBackendRevenue,
      topStaff, topHours, dailyData, brandData, topBrands, topProducts, bestDay, bestBrand, mostProfitableBrand, bestStaff, bestHour,
      totalT1, totalT2, totalT3,
      globalCatalogMarginPercent
    };
  }, [ventas, inventario, startDate, endDate]);

  const formatter = new Intl.NumberFormat('es-NI', { style: 'currency', currency: 'NIO', minimumFractionDigits: 0, maximumFractionDigits: 0 });

  return (
    <div className="hidden print:block bg-white text-slate-900 absolute top-0 left-0 w-full min-h-screen z-9999" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
      <style>
        {`
          @page { margin: 10mm; size: A4 portrait; }
          body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; background: white !important; }
          .page-break { page-break-before: always; }
          .no-break { page-break-inside: avoid; }
        `}
      </style>
      
      <div className="p-4 max-w-200 mx-auto">
        {/* HEADER */}
        <div className="flex justify-between items-end border-b-4 border-slate-900 pb-6 mb-10">
          <div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tighter leading-tight">Análisis Ejecutivo de Rendimiento</h1>
            <p className="text-slate-500 font-bold mt-2 text-sm uppercase tracking-widest">Período Fiscal: {startDate} al {endDate}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Generado por</p>
            <div className="flex items-center justify-end">
              <span className="font-black text-3xl text-slate-900 tracking-tighter">Axia <span className="text-indigo-600">PriceHub</span></span>
            </div>
          </div>
        </div>

        {/* METRICAS PRINCIPALES */}
        <div className="grid grid-cols-4 gap-6 mb-12">
          <div className="border-l-4 border-slate-900 pl-4 py-1">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Volumen Facturado</p>
            <p className="text-3xl font-black tracking-tight">{formatter.format(metrics.totalRevenue)}</p>
            <div className="flex gap-3 mt-1 text-[9px] font-bold uppercase tracking-wider">
              <span className="text-slate-500">POS: {formatter.format(metrics.totalPosRevenue)}</span>
              <span className="text-amber-500">Backend: {formatter.format(metrics.totalBackendRevenue)}</span>
            </div>
          </div>
          <div className="border-l-4 border-emerald-500 pl-4 py-1">
            <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Ganancia Neta (Bruta)</p>
            <p className="text-3xl font-black text-emerald-700 tracking-tight">{formatter.format(metrics.totalMargin)}</p>
          </div>
          <div className="border-l-4 border-amber-400 pl-4 py-1">
            <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-1">Margen de Rentabilidad</p>
            <div className="flex items-end gap-2">
              <p className="text-3xl font-black text-amber-600 tracking-tight">{metrics.marginPercent.toFixed(1)}%</p>
              {metrics.globalCatalogMarginPercent > 0 && (
                <span className="text-sm font-bold text-indigo-500 mb-1 leading-none tracking-tight">({metrics.globalCatalogMarginPercent.toFixed(1)}% Catálogo)</span>
              )}
            </div>
          </div>
          <div className="border-l-4 border-indigo-500 pl-4 py-1">
            <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-1">Flujo de Tickets (Promedio)</p>
            <p className="text-3xl font-black text-indigo-700 tracking-tight">{metrics.totalTickets} <span className="text-base text-indigo-400 font-bold">({formatter.format(metrics.avgTicket)})</span></p>
          </div>
        </div>

        {/* SECCION 1: TENDENCIA DE VENTAS POR TURNO */}
        <div className="mb-12 no-break border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
          <div className="bg-slate-50 px-8 py-5 border-b border-slate-200 flex justify-between items-center">
            <h2 className="text-xl font-black text-slate-800 tracking-tight">1. Análisis de Tendencia Comercial (Aporte por Turno)</h2>
            <div className="flex gap-4">
              <div className="flex flex-col items-end"><span className="text-[10px] uppercase font-bold text-emerald-600">Mañana (06-14)</span><span className="font-black text-sm">{formatter.format(metrics.totalT1)}</span></div>
              <div className="flex flex-col items-end"><span className="text-[10px] uppercase font-bold text-amber-500">Tarde (14-22)</span><span className="font-black text-sm">{formatter.format(metrics.totalT2)}</span></div>
              <div className="flex flex-col items-end"><span className="text-[10px] uppercase font-bold text-blue-500">Noche (22-06)</span><span className="font-black text-sm">{formatter.format(metrics.totalT3)}</span></div>
            </div>
          </div>
          <div className="p-8 pb-4">
            <div className="w-full flex justify-center mb-6">
              <BarChart width={700} height={260} data={metrics.dailyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 11, fill: '#64748b', fontWeight: 'bold'}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 11, fill: '#64748b', fontWeight: 'bold'}} tickFormatter={(v) => `${v/1000}k`} width={50} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', fontWeight: 'bold' }} />
                <Bar dataKey="turno1" stackId="a" fill="#10b981" name="Mañana" maxBarSize={50} isAnimationActive={false} />
                <Bar dataKey="turno2" stackId="a" fill="#f59e0b" name="Tarde" maxBarSize={50} isAnimationActive={false} />
                <Bar dataKey="turno3" stackId="a" fill="#3b82f6" name="Noche" maxBarSize={50} isAnimationActive={false} radius={[4, 4, 0, 0]} />
              </BarChart>
            </div>
            <div className="bg-indigo-50/50 rounded-2xl p-5 border border-indigo-100">
              <h4 className="text-xs font-black text-indigo-800 uppercase tracking-widest mb-2">Nota Gerencial / Insights</h4>
              <p className="text-sm text-slate-700 leading-relaxed font-medium">
                Esta gráfica ilustra el comportamiento de la demanda y el aporte exacto de cada turno operativo. El pico máximo de facturación se registró el día <strong className="text-indigo-700">{metrics.bestDay.date}</strong> con un total de <strong className="text-indigo-700">{formatter.format(metrics.bestDay.revenue)}</strong>.
              </p>
            </div>
          </div>
        </div>

        {/* SECCION 2: CUOTA DE MERCADO Y RENTABILIDAD POR LABORATORIO */}
        <div className="mb-12 no-break border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
          <div className="bg-slate-50 px-8 py-5 border-b border-slate-200">
            <h2 className="text-xl font-black text-slate-800 tracking-tight">2. Rentabilidad y Desempeño por Laboratorio</h2>
          </div>
          <div className="p-8 pb-4">
            
            {/* GRAFICO Y TOP 6 */}
            <div className="flex flex-col md:flex-row items-center gap-8 mb-8">
              <div className="shrink-0 relative">
                <PieChart width={280} height={280}>
                  <Pie data={metrics.topBrands} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={80} outerRadius={120} isAnimationActive={false} stroke="#fff" strokeWidth={3}>
                    {metrics.topBrands.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                  </Pie>
                </PieChart>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Top Marca</span>
                  <span className="text-lg font-black text-slate-800 text-center w-32 truncate">{metrics.bestBrand.name}</span>
                </div>
              </div>
              
              <div className="flex-1 w-full">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="pb-3 text-xs font-black text-slate-400 uppercase tracking-widest">Laboratorio</th>
                      <th className="pb-3 text-xs font-black text-slate-400 uppercase tracking-widest text-right">Facturado</th>
                      <th className="pb-3 text-xs font-black text-slate-400 uppercase tracking-widest text-right">Ganancia</th>
                      <th className="pb-3 text-xs font-black text-slate-400 uppercase tracking-widest text-right">Margen Real</th>
                      <th className="pb-3 text-xs font-black text-slate-400 uppercase tracking-widest text-right">Catálogo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {metrics.brandData.slice(0, 8).map((brand, index) => (
                      <tr key={brand.name} className="group">
                        <td className="py-3">
                          <div className="flex items-center gap-2">
                            {index < COLORS.length ? (
                              <div className="w-3 h-3 rounded-full shrink-0" style={{backgroundColor: COLORS[index]}} />
                            ) : (
                              <div className="w-3 h-3 rounded-full shrink-0 bg-slate-200" />
                            )}
                            <span className="text-sm font-bold text-slate-800 truncate max-w-30">{brand.name}</span>
                          </div>
                        </td>
                        <td className="py-3 text-right font-black text-slate-900">{formatter.format(brand.value)}</td>
                        <td className="py-3 text-right font-bold text-emerald-600">{formatter.format(brand.margin)}</td>
                        <td className="py-3 text-right">
                          <span className={`text-[11px] font-black px-2.5 py-1 rounded-full ${brand.marginPercent >= 30 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                            {brand.marginPercent.toFixed(1)}%
                          </span>
                        </td>
                        <td className="py-3 text-right">
                          {brand.catalogMarginPercent !== null ? (
                            <span className="text-[11px] font-black text-indigo-500 bg-indigo-50 px-2.5 py-1 rounded-full">
                              {brand.catalogMarginPercent.toFixed(1)}%
                            </span>
                          ) : (
                            <span className="text-[11px] text-slate-300">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-amber-50/50 rounded-2xl p-5 border border-amber-100 break-inside-avoid shadow-sm mt-4">
              <h4 className="text-xs font-black text-amber-800 uppercase tracking-widest mb-2">Nota Gerencial / Insights</h4>
              <p className="text-sm text-slate-700 leading-relaxed font-medium">
                Aunque <strong className="text-amber-700">{metrics.bestBrand.name}</strong> genera el mayor volumen de facturación bruta ({formatter.format(metrics.bestBrand.value)}), el laboratorio más rentable para el negocio actualmente es <strong className="text-emerald-700">{metrics.mostProfitableBrand.name}</strong>, el cual deja un espectacular margen neto del <strong className="text-emerald-700">{metrics.mostProfitableBrand.marginPercent.toFixed(1)}%</strong>. Debería considerarse incentivar a los asesores a priorizar esta línea de alta rentabilidad.
              </p>
            </div>
          </div>
        </div>

        {/* SECCION 3: PRODUCTOS Y OPERACIONES */}
        <div className="no-break border border-slate-200 rounded-3xl overflow-hidden shadow-sm mb-12">
          <div className="bg-slate-50 px-8 py-5 border-b border-slate-200">
            <h2 className="text-xl font-black text-slate-800 tracking-tight">3. Operaciones: Productos Estrella y Recursos Humanos</h2>
          </div>
          <div className="p-8">
            
            {/* PRODUCTOS */}
            <div className="mb-10">
              <h3 className="font-black text-xs text-slate-400 mb-5 uppercase tracking-widest border-b-2 border-slate-100 pb-3">
                Top 5 Productos Más Vendidos (Facturación)
              </h3>
              <div className="grid grid-cols-1 gap-3">
                {metrics.topProducts.map(([name, stats], i) => (
                  <div key={name} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="flex items-center gap-3 mb-2 sm:mb-0">
                      <span className="flex items-center justify-center w-6 h-6 rounded-full text-xs font-black shadow-sm bg-slate-800 text-white shrink-0">{i + 1}</span>
                      <span className="font-bold text-slate-800 text-sm truncate max-w-87.5">{name}</span>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="text-[10px] text-slate-400 font-bold uppercase">Unidades</p>
                        <p className="font-black text-slate-700">{stats.qty} u</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-emerald-500 font-bold uppercase">Ganancia</p>
                        <p className="font-bold text-emerald-600">{formatter.format(stats.margin)}</p>
                      </div>
                      <div className="text-right min-w-20">
                        <p className="text-[10px] text-slate-400 font-bold uppercase">Facturado</p>
                        <p className="font-black text-slate-900">{formatter.format(stats.revenue)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-12">
              {/* VENDEDORES */}
              <div>
                <h3 className="font-black text-xs text-slate-400 mb-6 uppercase tracking-widest flex justify-between items-end border-b-2 border-slate-100 pb-3">
                  Top Asesores <span>Volumen C$</span>
                </h3>
                <div className="space-y-4">
                  {metrics.topStaff.map(([name, rev], i) => (
                    <div key={name} className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <span className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-black shadow-sm ${i === 0 ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'}`}>{i + 1}</span>
                        <span className="font-bold text-slate-800 text-sm">{name}</span>
                      </div>
                      <span className="font-black text-slate-900 text-sm">{formatter.format(rev as number)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* HORAS PICO */}
              <div>
                <h3 className="font-black text-xs text-slate-400 mb-6 uppercase tracking-widest flex justify-between items-end border-b-2 border-slate-100 pb-3">
                  Horas de Mayor Demanda <span>Volumen C$</span>
                </h3>
                <div className="space-y-4">
                  {metrics.topHours.map(([hour, rev], i) => (
                    <div key={hour} className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <span className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-black shadow-sm ${i === 0 ? 'bg-rose-500 text-white' : 'bg-slate-100 text-slate-500'}`}>{i + 1}</span>
                        <span className="font-bold text-slate-800 text-sm">{hour}</span>
                      </div>
                      <span className="font-black text-slate-900 text-sm">{formatter.format(rev as number)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
          </div>
        </div>

        {/* FOOTER */}
        <div className="text-center border-t border-slate-200 pt-6 mt-4 pb-10">
          <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Documento corporativo estrictamente confidencial. Prohibida su distribución no autorizada.</p>
          <p className="text-[10px] text-slate-300 font-medium mt-2">Axia PriceHub Analytics Engine • Emitido el {new Date().toLocaleString('es-NI')}</p>
        </div>

      </div>
    </div>
  );
}
