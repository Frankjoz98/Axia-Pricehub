import { useState } from 'react';
import { Search, X, ShieldCheck, Download, AlertTriangle } from 'lucide-react';
import type { VentaHistorica } from '../types';
import * as XLSX from 'xlsx';

interface DataAuditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  ventas: VentaHistorica[];
}

export default function DataAuditorModal({ isOpen, onClose, ventas }: DataAuditorModalProps) {
  const [searchTerm, setSearchTerm] = useState('');

  if (!isOpen) return null;

  const filteredVentas = searchTerm.length > 2 
    ? ventas.filter(v => 
        v.product_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        v.order_ref.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : [];

  const handleExport = () => {
    if (filteredVentas.length === 0) return;
    const exportData = filteredVentas.map(v => ({
      'Ref. Odoo': v.order_ref,
      'Fecha': new Date(v.date).toLocaleString(),
      'Producto': v.product_name,
      'Cantidad': v.quantity,
      'Precio Unit.': v.unit_price,
      'Costo Total': v.total_cost,
      'Vendedor': v.vendedor,
      'Cajero': v.cajero
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Auditoria");
    XLSX.writeFile(wb, `Auditoria_Ventas_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const totalQty = filteredVentas.reduce((a, b) => a + b.quantity, 0);
  const totalRevenue = filteredVentas.reduce((a, b) => a + (b.quantity * b.unit_price), 0);

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 border-b flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Auditoría de Datos (Traceability)</h2>
              <p className="text-sm text-slate-500">Compara los registros crudos de Axia con Odoo.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-lg transition-colors">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex-1 flex flex-col gap-4 overflow-hidden">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar producto o referencia de orden..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl border-slate-200 bg-slate-50 border outline-hidden focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
              />
            </div>
            <button 
              onClick={handleExport}
              disabled={filteredVentas.length === 0}
              className="px-4 py-2 bg-slate-900 text-white rounded-xl font-medium hover:bg-slate-800 disabled:opacity-50 flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Exportar CSV
            </button>
          </div>

          {searchTerm.length <= 2 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8 text-center border-2 border-dashed border-slate-200 rounded-xl">
              <Search className="w-12 h-12 mb-4 opacity-20" />
              <p>Escribe al menos 3 letras para buscar el registro de auditoría.</p>
            </div>
          ) : filteredVentas.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8 text-center border-2 border-dashed border-slate-200 rounded-xl">
              <AlertTriangle className="w-12 h-12 mb-4 opacity-20 text-orange-500" />
              <p>No se encontraron registros para "{searchTerm}".</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl">
                  <p className="text-xs font-semibold text-blue-600 mb-1">CANTIDAD TOTAL ENCONTRADA</p>
                  <p className="text-2xl font-black text-slate-900">{totalQty} u.</p>
                </div>
                <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl">
                  <p className="text-xs font-semibold text-emerald-600 mb-1">FACTURADO TOTAL</p>
                  <p className="text-2xl font-black text-slate-900">C$ {totalRevenue.toLocaleString()}</p>
                </div>
              </div>

              <div className="flex-1 overflow-auto border border-slate-200 rounded-xl">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 sticky top-0 border-b border-slate-200 shadow-xs">
                    <tr>
                      <th className="px-4 py-3 font-semibold text-slate-600">Referencia (Odoo)</th>
                      <th className="px-4 py-3 font-semibold text-slate-600">Fecha</th>
                      <th className="px-4 py-3 font-semibold text-slate-600">Producto</th>
                      <th className="px-4 py-3 font-semibold text-slate-600 text-right">Cant.</th>
                      <th className="px-4 py-3 font-semibold text-slate-600 text-right">Precio U.</th>
                      <th className="px-4 py-3 font-semibold text-slate-600 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredVentas.map((v, i) => (
                      <tr key={i} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 py-3 font-mono text-xs text-slate-500">{v.order_ref}</td>
                        <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{new Date(v.date).toLocaleDateString()}</td>
                        <td className="px-4 py-3 font-medium text-slate-900">{v.product_name}</td>
                        <td className="px-4 py-3 text-right font-bold text-slate-700">{v.quantity}</td>
                        <td className="px-4 py-3 text-right text-slate-600">C$ {v.unit_price.toLocaleString()}</td>
                        <td className="px-4 py-3 text-right font-semibold text-slate-900">C$ {(v.quantity * v.unit_price).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
