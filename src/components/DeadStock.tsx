import { useMemo, useState } from 'react';
import type { OdooInventario, VentaHistorica } from '../types';
import { Ghost, PackageX, Search, TrendingDown, AlertOctagon, Star } from 'lucide-react';
import { supabase } from '../supabase';
import { cn } from '../lib/utils';

interface DeadStockProps {
  inventario?: OdooInventario[];
  ventas: VentaHistorica[];
}

export default function DeadStock({ inventario = [], ventas }: DeadStockProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const deadStock = useMemo(() => {
    if (!inventario || inventario.length === 0) return [];
    
    const soldNames = new Set<string>();
    const soldRefs = new Set<string>();
    
    const allSalesText = ventas.map(v => v.product_name?.toLowerCase().trim() || '').join(' | ');

    ventas.forEach(v => {
      if (!v.product_name) return;
      const lowerProduct = v.product_name.toLowerCase().trim();
      soldNames.add(lowerProduct);
      
      // Fast check for starting reference
      if (lowerProduct.startsWith('[')) {
        const endIdx = lowerProduct.indexOf(']');
        if (endIdx > 1) {
          soldRefs.add(lowerProduct.substring(1, endIdx).trim());
        }
      }
    });

    const results = inventario.filter(item => {
       if (item.stock <= 0) return false;
       const nameMatch = item.product_name.toLowerCase().trim();
       const refMatch = item.referencia ? item.referencia.toLowerCase().trim() : '';
       
       // Si el nombre exacto se vendió o la referencia se vendió
       let hasSold = soldNames.has(nameMatch) || (refMatch && soldRefs.has(refMatch));
       
       // Fuzzy match extra: rápida búsqueda en el string combinado
       if (!hasSold && refMatch) {
         if (allSalesText.includes(`[${refMatch}]`) || allSalesText.includes(`${refMatch} `)) {
           hasSold = true;
         }
       }

       return !hasSold;
    });

    return results.sort((a, b) => b.stock - a.stock);
  }, [inventario, ventas]);

  const filtered = deadStock.filter(item => 
    item.product_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (item.referencia && item.referencia.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const [toggling, setToggling] = useState<string | null>(null);
  const handleToggleImpulso = async (item: OdooInventario) => {
    if (!item.id) return;
    setToggling(item.id);
    const newValue = !item.impulso_medico;
    
    // Optimistic update mutating the prop (React might not re-render immediately if we don't update state, but this is a simple local mutation just for visual feedback until next fetch)
    item.impulso_medico = newValue;
    
    await supabase.from('inventario_local').update({ impulso_medico: newValue }).eq('id', item.id);
    setToggling(null);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-rose-100 relative overflow-hidden flex items-center justify-between">
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-rose-50 rounded-full text-xs font-bold tracking-wider mb-2 text-rose-600 uppercase border border-rose-100">
            <AlertOctagon className="w-3.5 h-3.5" /> Dinero Estancado
          </div>
          <h2 className="text-2xl font-black text-slate-900 mb-1">Inventario de Lento Movimiento</h2>
          <p className="text-slate-500 text-sm">
            Hay <strong className="text-rose-500">{deadStock.length} productos</strong> ocupando espacio físico sin generar ventas.
          </p>
        </div>
        <div className="hidden sm:block text-rose-100 mr-4">
          <Ghost className="w-20 h-20" />
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="relative w-72">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Buscar producto estancado..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          {filtered.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              <PackageX className="w-12 h-12 mx-auto opacity-20 mb-3" />
              <p className="font-medium">No se encontraron productos estancados con ese nombre.</p>
            </div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-100 text-slate-600 font-bold uppercase text-xs tracking-wider">
                <tr>
                  <th className="p-4">Referencia</th>
                  <th className="p-4">Producto</th>
                  <th className="p-4 text-center">Unidades Físicas (A Mano)</th>
                  <th className="p-4 text-center">Impulso Médico</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((item, idx) => (
                  <tr key={item.id || idx} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 font-mono text-slate-500">{item.referencia || '-'}</td>
                    <td className="p-4 font-bold text-slate-900">{item.product_name}</td>
                    <td className="p-4 text-center">
                      <span className="inline-flex items-center gap-1.5 bg-rose-50 text-rose-700 px-3 py-1 rounded-full font-black text-sm border border-rose-100">
                        <TrendingDown className="w-4 h-4" /> {item.stock}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <button 
                        onClick={() => handleToggleImpulso(item)}
                        disabled={toggling === item.id}
                        className={cn("p-2 rounded-full transition-colors", 
                          item.impulso_medico 
                            ? "text-amber-500 bg-amber-50 hover:bg-amber-100" 
                            : "text-slate-300 hover:text-amber-500 hover:bg-slate-50",
                          toggling === item.id && "opacity-50 cursor-not-allowed"
                        )}
                        title="Marcar para Impulso Médico"
                      >
                        <Star className={cn("w-5 h-5", item.impulso_medico && "fill-amber-500")} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
