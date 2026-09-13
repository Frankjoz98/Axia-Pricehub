import { useState, useMemo } from 'react';
import { Search, Package, Download } from 'lucide-react';
import * as XLSX from 'xlsx';

interface LupaTabProps {
  ventas: any[];
  inventario: any[];
}

export default function LupaTab({ ventas, inventario }: LupaTabProps) {
  const [lupaSearch, setLupaSearch] = useState('');

  const lupaResults = useMemo(() => {
    if (lupaSearch.length < 3) return [];
    const lowerSearch = lupaSearch.toLowerCase();
    return ventas.filter(v => 
      v.product_name.toLowerCase().includes(lowerSearch) || 
      (v.order_ref && v.order_ref.toLowerCase().includes(lowerSearch)) ||
      (v.marca && v.marca.toLowerCase().includes(lowerSearch)) ||
      (v.sesion && v.sesion.toLowerCase().includes(lowerSearch))
    ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [lupaSearch, ventas]);

  const lupaInventoryResults = useMemo(() => {
    if (lupaSearch.length < 3) return [];
    const lowerSearch = lupaSearch.toLowerCase();
    return inventario.filter(i => 
      i.product_name.toLowerCase().includes(lowerSearch) || 
      (i.referencia && i.referencia.toLowerCase().includes(lowerSearch)) ||
      (i.marca && i.marca.toLowerCase().includes(lowerSearch))
    );
  }, [lupaSearch, inventario]);

  const lupaTotalQty = lupaResults.reduce((a, b) => a + b.quantity, 0);
  const lupaTotalRevenue = lupaResults.reduce((a, b) => a + (b.quantity * b.unit_price), 0);
  const lupaTotalCost = lupaResults.reduce((a, b) => a + (b.total_cost || 0), 0);
  
  const handleExportLupa = () => {
    if (lupaResults.length === 0) return;
    const exportData = lupaResults.map(v => ({
      'Ref. Odoo': v.order_ref,
      'Fecha': new Date(v.date).toLocaleString(),
      'Producto': v.product_name,
      'Cantidad': v.quantity,
      'Precio Unit.': v.unit_price,
      'Costo Total': v.total_cost,
      'Margen Bruto': (v.quantity * v.unit_price) - (v.total_cost || 0),
      'Vendedor': v.vendedor,
      'Cajero': v.cajero
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Auditoria");
    XLSX.writeFile(wb, `Auditoria_${lupaSearch}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <Search className="w-6 h-6 text-emerald-600" /> Centro de Auditoría (Lupa)
          </h3>
          <p className="text-sm text-slate-500 mt-1">Busca cualquier producto, referencia o marca para ver su historial crudo.</p>
        </div>
        {lupaResults.length > 0 && (
          <button onClick={handleExportLupa} className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-bold flex items-center gap-2 transition-colors">
            <Download className="w-4 h-4" /> Exportar a Excel
          </button>
        )}
      </div>
      
      <div className="relative mb-8">
        <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
        <input type="text" placeholder="Buscar por código Odoo, nombre o marca..." value={lupaSearch} onChange={(e) => setLupaSearch(e.target.value)} className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-xl text-base focus:ring-2 focus:ring-emerald-500 font-medium" />
      </div>

      {lupaSearch.length >= 3 ? (
        <div className="space-y-4">
          
          {/* Inventario Matches */}
          {lupaInventoryResults.length > 0 && (
            <div className="mb-6 p-4 bg-indigo-50 rounded-xl border border-indigo-100">
              <h4 className="font-bold text-indigo-900 mb-3 flex items-center gap-2"><Package className="w-4 h-4" /> Coincidencias en Inventario Local (Odoo)</h4>
              <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                {lupaInventoryResults.map((inv: any) => (
                  <div key={inv.id} className="flex flex-wrap items-center gap-4 bg-white p-3 rounded-lg border border-indigo-50/50 shadow-sm">
                    <div className="flex-1 min-w-50">
                      <p className="font-bold text-slate-800 text-sm">{inv.product_name}</p>
                      <p className="text-xs text-slate-500">{inv.marca || 'Sin Marca'} • Ref: {inv.referencia || 'N/A'}</p>
                    </div>
                    <div className="flex gap-4">
                      <div className="text-right">
                        <p className="text-[10px] uppercase font-bold text-slate-400">Precio</p>
                        <p className="font-black text-slate-700 text-sm">C$ {inv.precio.toFixed(2)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] uppercase font-bold text-slate-400">Costo</p>
                        <p className="font-black text-rose-600 text-sm">C$ {inv.costo.toFixed(2)}</p>
                      </div>
                      <div className="text-right min-w-15 bg-indigo-100/50 px-3 py-1 rounded flex flex-col justify-center">
                        <p className="text-[10px] uppercase font-bold text-indigo-600">A la mano</p>
                        <p className="font-black text-indigo-700 text-base">{inv.stock}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Ventas Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
              <p className="text-xs font-bold text-slate-500 uppercase">Transacciones</p>
              <p className="text-xl font-black text-slate-900">{lupaResults.length}</p>
            </div>
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
              <p className="text-xs font-bold text-slate-500 uppercase">Unidades Vendidas</p>
              <p className="text-xl font-black text-indigo-600">{lupaTotalQty}</p>
            </div>
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
              <p className="text-xs font-bold text-slate-500 uppercase">Facturado</p>
              <p className="text-xl font-black text-slate-900">C$ {lupaTotalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
            <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
              <p className="text-xs font-bold text-emerald-600 uppercase">Margen Bruto</p>
              <p className="text-xl font-black text-emerald-700">C$ {(lupaTotalRevenue - lupaTotalCost).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-xl max-h-125 overflow-y-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-100 text-slate-600 sticky top-0">
                <tr>
                  <th className="px-4 py-3 font-bold">Fecha / Ref</th>
                  <th className="px-4 py-3 font-bold">Producto</th>
                  <th className="px-4 py-3 font-bold text-right">Cant.</th>
                  <th className="px-4 py-3 font-bold text-right">Precio U.</th>
                  <th className="px-4 py-3 font-bold text-right">Costo T.</th>
                  <th className="px-4 py-3 font-bold text-right">Venta T.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {lupaResults.map((v: any, i: number) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <p className="font-bold text-slate-900">{new Date(v.date).toLocaleDateString()}</p>
                      <p className="text-[10px] text-slate-500 font-mono">{v.order_ref}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-bold text-slate-800">{v.product_name}</p>
                      <p className="text-[10px] text-slate-500">{v.marca || 'Sin Marca'} • {v.cajero}</p>
                    </td>
                    <td className="px-4 py-3 text-right font-black text-indigo-600">{v.quantity}</td>
                    <td className="px-4 py-3 text-right font-medium">C$ {v.unit_price.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right font-medium text-rose-600">C$ {v.total_cost?.toFixed(2) || '0.00'}</td>
                    <td className="px-4 py-3 text-right font-black text-emerald-600">C$ {(v.quantity * v.unit_price).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="text-center py-12 text-slate-400">
          <Search className="w-12 h-12 mx-auto mb-4 opacity-20" />
          <p className="font-medium">Ingresa al menos 3 caracteres para iniciar la auditoría profunda.</p>
        </div>
      )}
    </div>
  );
}
