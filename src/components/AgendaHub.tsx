import { useState, useMemo } from 'react';
import { Plus, Calendar, NotebookPen, Target, Clock, Menu, X, Trash2 } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { useAgenda } from '../hooks/useAgenda';
import { useBitacora } from '../hooks/useBitacora';
import { useMetas } from '../hooks/useMetas';
import { generateSuggestedEvents } from '../lib/agendaRules';
import { cn } from '../lib/utils';
import type { AgendaEvento } from '../types';

import MiniCalendar from './agenda/MiniCalendar';
import EventList from './agenda/EventList';
import EventFormModal from './agenda/EventFormModal';
import BitacoraTab from './agenda/BitacoraTab';
import MetasTab from './agenda/MetasTab';
import VencimientosTab from './agenda/VencimientosTab';

export default function AgendaHub() {
  const { proveedores, facturas, ventas, inventario } = useAppContext();
  
  const { eventos, isLoading: loadingEvents, addEvento, updateEvento, deleteEvento } = useAgenda();
  const { addEntrada, entradas, deleteEntrada } = useBitacora();
  const { metas } = useMetas();
  
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<AgendaEvento | null>(null);
  const [activeTab, setActiveTab] = useState<'eventos' | 'bitacora' | 'metas' | 'vencimientos'>('eventos');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [quickNote, setQuickNote] = useState('');

  const mainMeta = useMemo(() => {
    return metas.find(m => !m.completada);
  }, [metas]);

  const mainMetaProgress = useMemo(() => {
    if (!mainMeta || !mainMeta.checklist) return 0;
    const total = mainMeta.checklist.length;
    const completados = mainMeta.checklist.filter(i => i.completado).length;
    return total === 0 ? (mainMeta.completada ? 100 : 0) : Math.round((completados / total) * 100);
  }, [mainMeta]);

  const recentNotes = useMemo(() => {
    const todayStr = new Date().toLocaleDateString('en-CA'); // Local ISO format YYYY-MM-DD
    return entradas
      .filter(e => {
        const localDate = new Date(new Date(e.created_at).getTime() - (new Date().getTimezoneOffset() * 60000)).toISOString().slice(0, 10);
        return localDate === todayStr;
      })
      .slice(0, 3);
  }, [entradas]);

  const formatYMD = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dd}`;
  };

  const selectedDateStr = formatYMD(selectedDate);
  const todayStr = formatYMD(new Date());

  const allEventsForSelectedDate = useMemo(() => {
    const dbEvents = eventos.filter(e => e.fecha === selectedDateStr);
    const suggestions = generateSuggestedEvents(proveedores, facturas, ventas, inventario, selectedDateStr);
    const combined = [...dbEvents, ...suggestions];
    
    const priorityWeight: Record<string, number> = { urgente: 4, alta: 3, media: 2, baja: 1 };
    
    return combined.sort((a, b) => {
      if (a.completado !== b.completado) return a.completado ? 1 : -1;
      return priorityWeight[b.prioridad] - priorityWeight[a.prioridad];
    });
  }, [eventos, selectedDateStr, proveedores, facturas, ventas, inventario]);

  const datesWithEvents = useMemo(() => {
    const dates = new Set<string>();
    eventos.forEach(e => dates.add(e.fecha));
    
    // Check suggestions for the next 30 days so they show on the mini calendar
    for (let i = 0; i < 30; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      const dStr = formatYMD(d);
      const suggs = generateSuggestedEvents(proveedores, facturas, ventas, inventario, dStr);
      if (suggs.length > 0) dates.add(dStr);
    }
    return Array.from(dates);
  }, [eventos, proveedores, facturas, ventas, inventario]);

  const handleToggleComplete = async (id: string, currentStatus: boolean) => {
    if (id.startsWith('auto-')) {
      alert('Las sugerencias automáticas desaparecen cuando resuelves el problema subyacente (ej. pagas la factura o pides inventario).');
      return;
    }
    await updateEvento(id, { completado: !currentStatus });
  };

  const handleSaveEvent = async (eventoData: Partial<AgendaEvento>) => {
    if (editingEvent) {
      await updateEvento(editingEvent.id, eventoData);
    } else {
      await addEvento(eventoData);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('¿Seguro que deseas eliminar este evento?')) {
      await deleteEvento(id);
    }
  };

  const NavTabs = [
    { id: 'eventos', label: 'Agenda del Día', icon: Calendar },
    { id: 'bitacora', label: 'Bitácora Gerencial', icon: NotebookPen },
    { id: 'metas', label: 'Metas Semanales', icon: Target },
    { id: 'vencimientos', label: 'Vencimientos', icon: Clock },
  ] as const;

  return (
    // Contenedor edge-to-edge estricto para evitar scroll de ventana
    <div className="relative flex w-full h-[calc(100vh-10.5rem)] animate-in fade-in duration-500 overflow-hidden bg-slate-50">
      
      {/* Drawer Overlay (clic para cerrar) */}
      {isSidebarOpen && (
        <div 
          className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm z-30" 
          onClick={() => setIsSidebarOpen(false)} 
        />
      )}

      {/* Drawer Sidebar (Menu Desplegable) */}
      <div className={cn(
        "absolute top-0 left-0 h-full bg-white z-40 transition-transform duration-300 w-72 flex flex-col p-4 shadow-2xl border-r border-slate-200",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex items-center justify-between mb-8 mt-2 px-2">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider">Centro Operativo</h3>
          <button 
            onClick={() => setIsSidebarOpen(false)} 
            className="p-1.5 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <nav className="flex flex-col gap-2">
          {NavTabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as any);
                  setIsSidebarOpen(false); // Ocultar al seleccionar
                }}
                className={cn(
                  "flex items-center gap-3 px-4 py-4 rounded-2xl text-sm font-bold transition-all text-left group",
                  isActive 
                    ? "bg-violet-600 text-white shadow-md shadow-violet-600/20" 
                    : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                )}
              >
                <tab.icon className={cn("w-5 h-5 transition-transform group-hover:scale-110", isActive ? "text-violet-200" : "text-slate-400")} />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 w-full flex flex-col h-full overflow-hidden">
        
        {/* Universal Top Bar for the Module */}
        <div className="flex items-center justify-between p-4 bg-white border-b border-slate-200 shrink-0 z-10">
           <div className="flex items-center gap-4">
             <button 
               onClick={() => setIsSidebarOpen(true)}
               className="p-2.5 bg-white border border-slate-200 shadow-sm hover:bg-slate-50 rounded-xl text-slate-700 transition-colors active:scale-95"
               title="Abrir Menú (Centro Operativo)"
             >
               <Menu className="w-5 h-5" />
             </button>
             <h1 className="text-lg md:text-xl font-black text-slate-800 flex items-center gap-2">
                {NavTabs.find(t => t.id === activeTab)?.label}
             </h1>
           </div>

           {/* Call to Actions if needed per tab */}
           {activeTab === 'eventos' && (
             <button 
               onClick={() => { setEditingEvent(null); setIsModalOpen(true); }}
               className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800 shadow-md transition-all active:scale-95"
             >
               <Plus className="w-4 h-4" />
               <span className="hidden sm:inline">Nuevo Evento</span>
             </button>
           )}
        </div>

        {/* Scrollable Tab Content */}
        <div className="flex-1 flex flex-col overflow-y-auto no-scrollbar relative">
          
          {activeTab === 'eventos' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full w-full bg-slate-50 p-6">
              
              {/* Left Column: Timeline (70%) */}
              <div className="lg:col-span-2 flex flex-col overflow-y-auto no-scrollbar">
                <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-2xl md:text-3xl font-black text-slate-900 leading-tight">
                      {selectedDateStr === todayStr 
                        ? 'Agenda de Hoy' 
                        : `Agenda: ${new Date(selectedDate + 'T12:00:00').toLocaleDateString('es-NI', { weekday: 'long', day: 'numeric', month: 'long' }).replace(/^\w/, c => c.toUpperCase())}`}
                    </h2>
                    <p className="text-slate-500 font-medium text-sm mt-1">
                      {allEventsForSelectedDate.length} {allEventsForSelectedDate.length === 1 ? 'evento programado' : 'eventos programados'}
                    </p>
                  </div>
                </div>

                {loadingEvents ? (
                  <div className="flex justify-center py-12">
                     <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900" />
                  </div>
                ) : (
                  <EventList 
                    eventos={allEventsForSelectedDate} 
                    onToggleComplete={handleToggleComplete}
                    onEdit={(e) => { setEditingEvent(e); setIsModalOpen(true); }}
                    onDelete={handleDelete}
                  />
                )}
              </div>

              {/* Right Column: Sidebar (30%) */}
              <div className="lg:col-span-1 flex flex-col gap-6 overflow-y-auto no-scrollbar">
                
                {/* Mini Calendar */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
                  <MiniCalendar 
                    selectedDate={selectedDate} 
                    onSelectDate={setSelectedDate} 
                    eventDates={datesWithEvents} 
                  />
                </div>

                {/* Focus / Meta Principal */}
                {mainMeta && (
                  <div className="bg-purple-50/50 border border-purple-100/80 rounded-xl p-4 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                      <Target className="w-16 h-16 text-purple-600" />
                    </div>
                    <div className="relative z-10 flex flex-col gap-3">
                      <div>
                        <h3 className="text-[10px] font-black uppercase tracking-wider text-purple-600 mb-1">Foco Semanal</h3>
                        <p className="text-sm font-semibold text-slate-900 leading-snug line-clamp-2">{mainMeta.titulo}</p>
                      </div>
                      
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center text-[10px] font-bold">
                          <span className="text-purple-600/70">Progreso</span>
                          <span className="text-purple-700">{mainMetaProgress}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-purple-100 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-purple-600 rounded-full transition-all duration-500 ease-out" 
                            style={{ width: `${mainMetaProgress}%` }} 
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Quick Drop (Captura Rápida) */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col">
                  <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                    <NotebookPen className="w-4 h-4 text-violet-500" />
                    Captura Rápida
                  </h3>
                  <input
                    type="text"
                    value={quickNote}
                    onChange={(e) => setQuickNote(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && quickNote.trim()) {
                        addEntrada({
                          titulo: quickNote.trim(),
                          contenido: 'Capturado rápidamente desde la Agenda.',
                          categoria: 'general'
                        }).then(() => setQuickNote(''));
                      }
                    }}
                    placeholder="Anota algo para la bitácora... (Enter)"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all placeholder:text-slate-400"
                  />

                  {/* Feedback visual: Notas recientes */}
                  {recentNotes.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-slate-100">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Capturas de Hoy</h4>
                      <div className="space-y-1.5">
                        {recentNotes.map(nota => (
                          <div key={nota.id} className="group flex items-center justify-between text-xs text-slate-600 bg-slate-50/50 p-2 rounded-lg border border-slate-100 transition-colors hover:bg-slate-50">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-[10px] text-slate-400 font-mono shrink-0">
                                {new Date(nota.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
                              </span>
                              <span className="truncate">{nota.titulo}</span>
                            </div>
                            <button 
                              onClick={() => { if(confirm('¿Descartar esta nota rápida?')) deleteEntrada(nota.id); }}
                              className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-500 transition-all"
                              title="Descartar"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                
              </div>
            </div>
          )}

          {activeTab === 'bitacora' && <BitacoraTab />}
          {activeTab === 'metas' && <MetasTab />}
          {activeTab === 'vencimientos' && <div className="p-6"><VencimientosTab /></div>}
        </div>
      </div>

      <EventFormModal 
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingEvent(null); }}
        onSave={handleSaveEvent}
        initialData={editingEvent}
        selectedDate={selectedDate}
        proveedores={proveedores}
      />
    </div>
  );
}
