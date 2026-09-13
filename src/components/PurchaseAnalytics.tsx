import { useMemo } from 'react';
import { Package, TrendingUp, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { cn } from '../lib/utils';
import type { PurchaseOrder, VentaHistorica } from '../types';

interface PurchaseAnalyticsProps {
  ordenes: PurchaseOrder[];
  ventas: VentaHistorica[];
}

export default function PurchaseAnalytics({ ordenes, ventas }: PurchaseAnalyticsProps) {
  const stats = useMemo(() => {
    if (!ordenes.length) return null;

    const conciliadas = ordenes.filter(o => o.conciliado);
    
    let totalComprado = 0;
    let totalEstimado = 0;
    const providerStats: Record<string, { total: number; estimado: number; count: number }> = {};

    conciliadas.forEach(o => {
      const real = o.monto_factura_real || o.total;
      totalComprado += real;
      totalEstimado += o.total;

      if (!providerStats[o.provider]) {
        providerStats[o.provider] = { total: 0, estimado: 0, count: 0 };
      }
      providerStats[o.provider].total += real;
      providerStats[o.provider].estimado += o.total;
      providerStats[o.provider].count += 1;
    });

    const providerData = Object.entries(providerStats)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.total - a.total);

    const varianzaTotal = totalComprado - totalEstimado;

    // Calcular ratio compras/ventas total
    const totalVendido = ventas.reduce((sum, v) => sum + (v.quantity * v.unit_price), 0);
    const ratio = totalVendido > 0 ? (totalComprado / totalVendido) * 100 : 0;

    return {
      totalComprado,
      totalEstimado,
      varianzaTotal,
      providerData,
      totalVendido,
      ratio,
      conciliadasCount: conciliadas.length
    };
  }, [ordenes, ventas]);

  if (!stats) {
    return (
      <div className="text-center py-12 text-slate-400 bg-white rounded-2xl border border-slate-200 border-dashed">
        <Package className="w-12 h-12 mx-auto mb-3 opacity-20" />
        <p className="font-bold">No hay suficientes datos.</p>
        <p className="text-sm">Empieza a conciliar órdenes de compra para ver analíticas.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Órdenes Conciliadas
          </p>
          <p className="text-3xl font-black text-slate-800">{stats.conciliadasCount}</p>
          <p className="text-xs text-slate-500 mt-2">Monto total: C$ {stats.totalComprado.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits:2})}</p>
        </div>

        <div className={cn("p-5 rounded-2xl border shadow-sm", stats.varianzaTotal > 0 ? "bg-rose-50 border-rose-100" : stats.varianzaTotal < 0 ? "bg-emerald-50 border-emerald-100" : "bg-slate-50 border-slate-200")}>
          <p className={cn("text-xs font-bold uppercase tracking-wider mb-1 flex items-center gap-1", stats.varianzaTotal > 0 ? "text-rose-500" : stats.varianzaTotal < 0 ? "text-emerald-600" : "text-slate-500")}>
            <AlertTriangle className="w-3 h-3" /> Varianza Histórica
          </p>
          <p className={cn("text-3xl font-black", stats.varianzaTotal > 0 ? "text-rose-700" : stats.varianzaTotal < 0 ? "text-emerald-700" : "text-slate-700")}>
            {stats.varianzaTotal > 0 ? "+" : ""}C$ {stats.varianzaTotal.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits:2})}
          </p>
          <p className={cn("text-xs mt-2", stats.varianzaTotal > 0 ? "text-rose-600" : stats.varianzaTotal < 0 ? "text-emerald-600" : "text-slate-500")}>
            {stats.varianzaTotal > 0 ? "Pagaste más de lo estimado." : stats.varianzaTotal < 0 ? "Ahorraste respecto a lo estimado." : "Exactamente igual a lo estimado."}
          </p>
        </div>

        <div className="bg-indigo-900 text-white p-5 rounded-2xl border border-indigo-800 shadow-sm relative overflow-hidden">
          <TrendingUp className="w-24 h-24 absolute -bottom-4 -right-4 opacity-10" />
          <div className="relative z-10">
            <p className="text-indigo-300 text-xs font-bold uppercase tracking-wider mb-1">Ratio Histórico</p>
            <p className="text-3xl font-black">{stats.ratio.toFixed(1)}%</p>
            <p className="text-xs text-indigo-200 mt-2">Gasto en compras vs Ventas totales</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <h3 className="font-black text-slate-800 mb-6 text-lg">Distribución de Gasto por Proveedor</h3>
        <div className="space-y-4">
          {stats.providerData.map(provider => {
            const varianza = provider.total - provider.estimado;
            const percent = (provider.total / stats.totalComprado) * 100;
            return (
              <div key={provider.name}>
                <div className="flex justify-between items-end mb-2">
                  <div>
                    <p className="font-bold text-slate-700">{provider.name}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">{provider.count} {provider.count === 1 ? 'orden' : 'órdenes'}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-slate-800">C$ {provider.total.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits:2})}</p>
                    {varianza !== 0 && (
                      <p className={cn("text-[10px] font-bold", varianza > 0 ? "text-rose-500" : "text-emerald-500")}>
                        {varianza > 0 ? "+" : ""}C$ {varianza.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits:2})} varianza
                      </p>
                    )}
                  </div>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2">
                  <div className="bg-indigo-500 h-2 rounded-full" style={{ width: `${percent}%` }}></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
