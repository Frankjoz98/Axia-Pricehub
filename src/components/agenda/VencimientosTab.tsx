import { useMemo } from 'react';
import { AlertTriangle, Download, Clock, PackageX } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { downloadFile, cn } from '../../lib/utils';
import { daysUntil, todayYMD } from '../../lib/dates';

export default function VencimientosTab() {
  const { inventario } = useAppContext();

  const vencimientos = useMemo(() => {
    const items = inventario.filter(i => i.fecha_vencimiento && i.stock != null && i.stock > 0);

    return items.map(item => {
      const diffDays = daysUntil(item.fecha_vencimiento!);
      return { ...item, diffDays };
    }).sort((a, b) => a.diffDays - b.diffDays);
  }, [inventario]);

  const stats = useMemo(() => {
    let vencidos = 0;
    let treintaDias = 0;
    let noventaDias = 0;

    vencimientos.forEach(v => {
      if (v.diffDays < 0) vencidos++;
      else if (v.diffDays <= 30) treintaDias++;
      else if (v.diffDays <= 90) noventaDias++;
    });
    return { vencidos, treintaDias, noventaDias };
  }, [vencimientos]);

  const handleExport = () => {
    if (vencimientos.length === 0) return;

    const rows = vencimientos.map(v => [
      v.product_name,
      v.referencia || '',
      v.marca || '',
      v.stock.toString(),
      v.fecha_vencimiento || '',
      v.diffDays.toString()
    ]);

    const csvContent = "Producto,Referencia,Marca,Stock,Fecha Vencimiento,Dias Restantes\n"
      + rows.map(e => e.map(cell => `"${cell}"`).join(",")).join("\n");

    downloadFile(csvContent, `reporte_vencimientos_${todayYMD()}.csv`, 'text/csv');
  };

  const getStatusColor = (days: number) => {
    if (days < 0) return 'text-rose-600 bg-rose-50 border-rose-200';
    if (days <= 30) return 'text-orange-600 bg-orange-50 border-orange-200';
    if (days <= 90) return 'text-amber-600 bg-amber-50 border-amber-200';
    return 'text-emerald-600 bg-emerald-50 border-emerald-200';
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-rose-200 flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">Vencidos</p>
            <p className="text-2xl font-black text-rose-600">{stats.vencidos}</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center text-rose-500">
            <PackageX className="w-5 h-5" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-orange-200 flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">A 30 días</p>
            <p className="text-2xl font-black text-orange-600">{stats.treintaDias}</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center text-orange-500">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-amber-200 flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">A 90 días</p>
            <p className="text-2xl font-black text-amber-600">{stats.noventaDias}</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center text-amber-500">
            <Clock className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-rose-500" /> Monitoreo de Caducidad
          </h2>
          <button onClick={handleExport} disabled={vencimientos.length === 0} className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-bold transition-colors disabled:opacity-50">
            <Download className="w-4 h-4" /> Exportar
          </button>
        </div>

        {vencimientos.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <PackageX className="w-12 h-12 mx-auto text-slate-300 mb-3" />
            <p>No hay productos con fecha de caducidad registrada.</p>
            <p className="text-sm">Ve a Ajustes para sincronizar el CSV de Lotes desde Odoo.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-xs">
                <tr>
                  <th className="px-6 py-4">Producto</th>
                  <th className="px-6 py-4">Ref.</th>
                  <th className="px-6 py-4">Marca</th>
                  <th className="px-6 py-4 text-center">Stock</th>
                  <th className="px-6 py-4">F. Caducidad</th>
                  <th className="px-6 py-4">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {vencimientos.map((v, i) => (
                  <tr key={i} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-bold text-slate-800 whitespace-normal min-w-50">{v.product_name}</td>
                    <td className="px-6 py-4 text-slate-500">{v.referencia || '-'}</td>
                    <td className="px-6 py-4 text-slate-600">{v.marca || '-'}</td>
                    <td className="px-6 py-4 text-center font-bold text-slate-700">{v.stock}</td>
                    <td className="px-6 py-4 font-medium">{v.fecha_vencimiento}</td>
                    <td className="px-6 py-4">
                      <span className={cn("px-2.5 py-1 rounded-md text-xs font-black uppercase tracking-wider border", getStatusColor(v.diffDays))}>
                        {v.diffDays < 0 ? 'VENCIDO' : `${v.diffDays} días`}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
