import { useState, useMemo } from 'react';
import { Plus, LogOut, Search, ClipboardList, CheckCircle2, Inbox, User } from 'lucide-react';
import { supabase } from '../../supabase';
import { usePedidos } from '../../hooks/usePedidos';
import PedidoCard from './PedidoCard';
import PedidoForm from './PedidoForm';

interface PedidosTerminalProps {
  isEmbedded?: boolean;
}

export default function PedidosTerminal({ isEmbedded = false }: PedidosTerminalProps) {
  const { pedidos, isLoading, addPedido, updateEstado, deletePedido } = usePedidos();
  const [activeTab, setActiveTab] = useState<'pendientes' | 'encargos' | 'procesados'>('pendientes');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filteredPedidos = useMemo(() => {
    let filtered = pedidos.filter(p => {
      if (activeTab === 'pendientes') return p.estado === 'pendiente' && p.tipo_pedido !== 'encargo_cliente';
      if (activeTab === 'encargos') return p.tipo_pedido === 'encargo_cliente' && p.estado !== 'archivado';
      if (activeTab === 'procesados') return (p.estado === 'pedido' || p.estado === 'recibido') && p.tipo_pedido !== 'encargo_cliente';
      return false;
    });

    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(p => 
        p.producto_nombre.toLowerCase().includes(q) || 
        (p.laboratorio && p.laboratorio.toLowerCase().includes(q)) ||
        (p.nombre_cliente && p.nombre_cliente.toLowerCase().includes(q))
      );
    }
    
    return filtered;
  }, [pedidos, activeTab, search]);

  const handleLogout = async () => {
    if (window.confirm('¿Seguro que deseas salir de la terminal?')) {
      await supabase.auth.signOut();
    }
  };

  return (
    <div className={isEmbedded ? "w-full" : "min-h-screen bg-slate-50 flex flex-col font-sans"}>
      
      {/* Header Terminal */}
      {!isEmbedded && (
        <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
          <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src="/axia_logo.png" alt="Axia Logo" className="h-8 w-auto object-contain" />
              <h1 className="text-xl font-black text-slate-300 hidden sm:block">|<span className="text-blue-600 ml-2">Terminal Pedidos</span></h1>
            </div>
            
            <div className="flex items-center gap-3">
              <button onClick={handleLogout} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-full transition-colors flex items-center gap-2">
                <span className="text-sm font-bold hidden sm:block">Salir</span>
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </header>
      )}

      {/* Main Content */}
      <main className={`flex-1 w-full mx-auto ${isEmbedded ? 'max-w-full pb-6' : 'max-w-4xl p-4 sm:p-6 pb-32'}`}>
        
        {/* Acciones superiores */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input 
              type="text" 
              placeholder="Buscar por producto, lab o cliente..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none shadow-sm"
            />
          </div>
          {isEmbedded && (
            <button 
              onClick={() => setIsModalOpen(true)}
              className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl font-bold transition-colors shadow-sm"
            >
              <Plus className="w-5 h-5" /> Agregar
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap sm:flex-nowrap bg-slate-200/50 p-1 rounded-2xl mb-6 gap-1">
          <button 
            onClick={() => setActiveTab('pendientes')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all min-w-30 ${
              activeTab === 'pendientes' 
                ? 'bg-white text-blue-600 shadow-sm' 
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
            }`}
          >
            <ClipboardList className="w-4 h-4" /> Pendientes
            <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-lg text-xs">{pedidos.filter(p => p.estado === 'pendiente' && p.tipo_pedido !== 'encargo_cliente').length}</span>
          </button>
          
          <button 
            onClick={() => setActiveTab('encargos')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all min-w-30 ${
              activeTab === 'encargos' 
                ? 'bg-blue-600 text-white shadow-sm' 
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
            }`}
          >
            <User className="w-4 h-4" /> Encargos
            <span className={activeTab === 'encargos' ? "bg-blue-700 text-white px-2 py-0.5 rounded-lg text-xs" : "bg-slate-100 text-slate-600 px-2 py-0.5 rounded-lg text-xs"}>
              {pedidos.filter(p => p.tipo_pedido === 'encargo_cliente' && p.estado !== 'archivado').length}
            </span>
          </button>

          <button 
            onClick={() => setActiveTab('procesados')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all min-w-30 ${
              activeTab === 'procesados' 
                ? 'bg-white text-emerald-600 shadow-sm' 
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" /> En Proceso
            <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-lg text-xs">{pedidos.filter(p => (p.estado === 'pedido' || p.estado === 'recibido') && p.tipo_pedido !== 'encargo_cliente').length}</span>
          </button>
        </div>

        {/* Listado */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : filteredPedidos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center bg-white rounded-3xl border border-slate-200 border-dashed">
            <Inbox className="w-16 h-16 text-slate-200 mb-4" />
            <h3 className="text-xl font-bold text-slate-800 mb-2">Bandeja Vacía</h3>
            <p className="text-slate-500 max-w-sm">
              {activeTab === 'pendientes' 
                ? 'No hay requerimientos pendientes de solicitud en este momento.'
                : 'No hay pedidos en proceso.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredPedidos.map(pedido => (
              <PedidoCard 
                key={pedido.id} 
                pedido={pedido} 
                onAction={(n) => updateEstado(pedido.id, n)}
                onDelete={() => deletePedido(pedido.id)}
              />
            ))}
          </div>
        )}
      </main>

      {/* FAB (Floating Action Button) - Solo si no está embedido */}
      {!isEmbedded && (
        <div className="fixed bottom-6 right-6 z-40">
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center justify-center w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg shadow-blue-500/40 hover:bg-blue-700 hover:scale-105 transition-all focus:ring-4 focus:ring-blue-500/20 active:scale-95"
          >
            <Plus className="w-6 h-6" />
          </button>
        </div>
      )}

      {isModalOpen && (
        <PedidoForm 
          onClose={() => setIsModalOpen(false)}
          onSave={addPedido}
        />
      )}
    </div>
  );
}
