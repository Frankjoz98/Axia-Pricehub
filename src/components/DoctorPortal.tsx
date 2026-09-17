import { useState, useEffect } from 'react';
import { Search, Stethoscope, CheckCircle, Flame } from 'lucide-react';
import { supabase } from '../supabase';
import { useCitas } from '../hooks/useCitas';
import { cn } from '../lib/utils';

export default function DoctorPortal() {
  const [activeTab, setActiveTab] = useState<'citas' | 'catalogo'>('citas');
  const [searchTerm, setSearchTerm] = useState('');
  const [medicamentos, setMedicamentos] = useState<any[]>([]);
  const [soldProducts, setSoldProducts] = useState<Set<string>>(new Set());
  
  const todayString = new Date().toISOString().split('T')[0];
  const { citas, updateEstado } = useCitas(todayString);

  useEffect(() => {
    // Read-only query to fetch public data for the impulse catalog
    const fetchCatalogAndSales = async () => {
      // Calcular fecha límite: últimos 60 días
      const limitDate = new Date();
      limitDate.setDate(limitDate.getDate() - 60);
      const limitDateString = limitDate.toISOString().split('T')[0];

      const [invRes, ventasRes] = await Promise.all([
        supabase
          .from('inventario_local')
          .select('odoo_id, product_name, stock, precio, marca')
          .gt('stock', 0)
          .order('stock', { ascending: false })
          .limit(3000),
        supabase
          .from('ventas_historicas')
          .select('product_name')
          .gte('date', limitDateString)
      ]);
      
      if (ventasRes.data) {
        setSoldProducts(new Set(ventasRes.data.map(v => v.product_name)));
      }
      
      if (invRes.data) {
        setMedicamentos(invRes.data);
      }
    };
    fetchCatalogAndSales();
  }, []);

  const blacklistedBrands = ['cdn', 'coca cola', 'pepsi', 'diana', 'frito-lay', 'frito lay', 'eskimo', 'kerns', 'kern\'s', 'gatorade', 'powerade', 'monster', 'red bull'];

  const filteredMedicamentos = medicamentos.filter(m => {
    const searchString = `${m.marca || ''} ${m.laboratorio || ''} ${m.proveedor || ''} ${m.product_name || ''}`.toLowerCase();
    const isExcluded = blacklistedBrands.some(brand => searchString.includes(brand));
    const matchesSearch = (m.product_name || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    return !isExcluded && matchesSearch;
  }).map(m => {
    return { ...m, isDeadStock: !soldProducts.has(m.product_name) };
  }).sort((a, b) => {
    if (a.isDeadStock && !b.isDeadStock) return -1;
    if (!a.isDeadStock && b.isDeadStock) return 1;
    return b.stock - a.stock;
  });

  return (
    <div className="max-w-md mx-auto bg-slate-50 min-h-screen pb-20 font-sans">
      <div className="bg-blue-600 text-white p-6 rounded-b-3xl shadow-md">
        <div className="flex items-center gap-3 mb-2">
          <Stethoscope className="w-8 h-8 opacity-80" />
          <h1 className="text-2xl font-black">Portal Médico</h1>
        </div>
        <p className="opacity-90 font-medium">Bienvenido, Dr. - Jornada Médica</p>
        <p className="text-xs font-bold opacity-75 mt-1">{new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }).toUpperCase()}</p>
      </div>

      <div className="flex px-4 mt-6 gap-2">
        <button 
          onClick={() => setActiveTab('citas')}
          className={cn("flex-1 py-2.5 rounded-full font-bold text-sm transition-all", activeTab === 'citas' ? "bg-blue-600 text-white shadow-md" : "bg-white text-slate-500 border border-slate-200")}
        >
          Mis Citas de Hoy
        </button>
        <button 
          onClick={() => setActiveTab('catalogo')}
          className={cn("flex-1 py-2.5 rounded-full font-bold text-sm transition-all", activeTab === 'catalogo' ? "bg-amber-500 text-white shadow-md" : "bg-white text-slate-500 border border-slate-200")}
        >
          Catálogo Impulso
        </button>
      </div>

      <div className="px-4 mt-6">
        {activeTab === 'citas' ? (
          <div className="space-y-3">
            {citas.map(cita => (
              <div key={cita.id} className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 flex items-center justify-between">
                <div>
                  <p className="font-bold text-slate-900">{cita.paciente}</p>
                  <p className="text-sm text-slate-500 font-medium mt-0.5">{cita.hora}</p>
                </div>
                {cita.estado === 'pendiente' ? (
                  <button 
                    onClick={() => updateEstado(cita.id, 'atendido')}
                    className="flex items-center gap-1.5 text-xs font-bold bg-emerald-50 text-emerald-600 px-3 py-2 rounded-full hover:bg-emerald-100 transition-colors"
                  >
                    <CheckCircle className="w-4 h-4" /> Atendido
                  </button>
                ) : (
                  <button 
                    onClick={() => updateEstado(cita.id, 'pendiente')}
                    className="text-xs font-bold text-slate-400 flex items-center gap-1.5 px-3 py-2 hover:text-slate-600 transition-colors"
                  >
                    <CheckCircle className="w-4 h-4" /> Finalizado
                  </button>
                )}
              </div>
            ))}
            {citas.length === 0 && (
              <div className="text-center py-12 text-slate-400">
                <p className="font-medium">No tienes citas programadas para hoy.</p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="sticky top-4 z-10">
              <div className="relative">
                <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Buscar medicamentos sugeridos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-11 pr-4 py-3.5 rounded-2xl border-none shadow-[0_4px_20px_-4px_rgba(0,0,0,0.1)] focus:ring-2 focus:ring-amber-500 outline-none text-slate-900 font-medium"
                />
              </div>
            </div>

            <div className="space-y-3 pt-2">
              {filteredMedicamentos.map((med, i) => (
                <div key={med.odoo_id || i} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col gap-2 relative overflow-hidden">
                  <div className={cn("absolute top-0 left-0 w-1.5 h-full", med.isDeadStock ? "bg-rose-500" : "bg-amber-400")} />
                  <div className="flex justify-between items-start">
                    <h3 className="font-black text-slate-800 pr-26 leading-snug">{med.product_name}</h3>
                    <span className={cn(
                      "absolute top-4 right-4 text-[10px] font-black uppercase px-2.5 py-1 rounded-full flex items-center gap-1",
                      med.isDeadStock ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700"
                    )}>
                      <Flame className="w-3 h-3" /> {med.isDeadStock ? 'ALTA PRIORIDAD' : 'Sugerido'}
                    </span>
                  </div>
                  <div className="flex justify-between items-end mt-2">
                    <p className="text-xs text-slate-500 font-bold bg-slate-50 px-2 py-1 rounded">Stock: {med.stock || 0} u.</p>
                    <p className="text-amber-600 font-black text-lg">C$ {(med.precio || 0).toFixed(2)}</p>
                  </div>
                </div>
              ))}
              {filteredMedicamentos.length === 0 && (
                <div className="text-center py-12 text-slate-400">
                  <p className="font-medium">No se encontraron medicamentos sugeridos.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
