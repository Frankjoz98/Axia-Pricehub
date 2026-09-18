import { useState, useMemo } from 'react';
import { useAppContext } from '../../context/AppContext';
import { Building2, Search, Plus, Filter, LayoutGrid } from 'lucide-react';
import { SupplierCard } from './SupplierCard';
import { SupplierProfile } from './SupplierProfile';
import { SupplierForm } from './SupplierForm';
import { isFacturaVencida, isFacturaPendienteVigente } from '../../lib/facturas';

export function SupplierHub() {
  const { proveedores, facturas } = useAppContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  // Global KPIs
  const kpis = useMemo(() => {
    const activos = proveedores.filter(p => p.activo).length;
    const totalComprado = facturas.reduce((acc, f) => acc + f.monto_total, 0);
    const pendientes = facturas.filter(f => isFacturaPendienteVigente(f));
    const vencidas = facturas.filter(f => isFacturaVencida(f));

    return {
      activos,
      totalComprado,
      facturasPendientes: pendientes.length,
      facturasVencidas: vencidas.length
    };
  }, [proveedores, facturas]);

  // Filtered Suppliers
  const filteredProveedores = useMemo(() => {
    if (!searchTerm) return proveedores;
    const lower = searchTerm.toLowerCase();
    return proveedores.filter(p =>
      p.nombre.toLowerCase().includes(lower) ||
      (p.numero_cliente && p.numero_cliente.toLowerCase().includes(lower))
    );
  }, [proveedores, searchTerm]);

  if (selectedSupplierId) {
    const selected = proveedores.find(p => p.id === selectedSupplierId);
    if (selected) {
      return <SupplierProfile proveedor={selected} onBack={() => setSelectedSupplierId(null)} />;
    }
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Header & Title */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
            <Building2 className="w-8 h-8 text-violet-600" />
            Centro de Proveedores
          </h1>
          <p className="text-slate-500 mt-1">Control administrativo y facturas de compras.</p>
        </div>
        <button
          onClick={() => setIsFormOpen(true)}
          className="bg-violet-600 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-violet-700 transition-colors flex items-center gap-2 shadow-lg shadow-violet-200"
        >
          <Plus className="w-5 h-5" />
          <span className="hidden sm:inline">Nuevo Proveedor</span>
          <span className="sm:hidden">Nuevo</span>
        </button>
      </div>

      {/* KPIs Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col justify-center">
          <span className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Proveedores Activos</span>
          <span className="text-2xl font-black text-slate-800">{kpis.activos}</span>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col justify-center">
          <span className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Total Comprado</span>
          <span className="text-2xl font-black text-slate-800">C$ {(kpis.totalComprado / 1000).toFixed(1)}k</span>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col justify-center">
          <span className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Facturas Ptes</span>
          <span className="text-2xl font-black text-amber-600">{kpis.facturasPendientes}</span>
        </div>
        <div className="bg-white rounded-2xl border border-rose-200 p-4 shadow-sm flex flex-col justify-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 bg-rose-50 rounded-bl-full -z-10" />
          <span className="text-rose-600 text-xs font-bold uppercase tracking-wider mb-1">Vencidas</span>
          <span className="text-2xl font-black text-rose-600">{kpis.facturasVencidas}</span>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-white p-2 rounded-2xl border border-slate-200 shadow-sm">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar proveedor..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border-transparent rounded-xl focus:bg-white focus:border-violet-500 focus:ring-2 focus:ring-violet-200 transition-all"
          />
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <button className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-xl font-medium transition-colors border border-transparent hover:border-slate-200">
            <Filter className="w-4 h-4" />
            <span>Filtros</span>
          </button>
        </div>
      </div>

      {/* List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredProveedores.length > 0 ? (
          filteredProveedores.map(p => (
            <SupplierCard
              key={p.id}
              proveedor={p}
              facturas={facturas.filter(f => f.proveedor_id === p.id)}
              onClick={() => setSelectedSupplierId(p.id)}
            />
          ))
        ) : (
          <div className="col-span-full py-20 flex flex-col items-center justify-center text-center">
            <LayoutGrid className="w-16 h-16 text-slate-200 mb-4" />
            <h3 className="text-xl font-bold text-slate-700">No se encontraron proveedores</h3>
            <p className="text-slate-500 mt-2 max-w-sm">Intenta con otro término de búsqueda o registra un nuevo proveedor.</p>
          </div>
        )}
      </div>

      {/* Form Modal */}
      {isFormOpen && <SupplierForm onClose={() => setIsFormOpen(false)} />}
    </div>
  );
}
