import { useState } from 'react';
import { Plus, NotebookPen, Calendar, Trash2, ArrowRight, Edit2 } from 'lucide-react';
import { useBitacora } from '../../hooks/useBitacora';
import type { CategoriaBitacora, BitacoraEntry } from '../../types';
import { cn } from '../../lib/utils';

export default function BitacoraTab() {
  const { entradas, isLoading, addEntrada, updateEntrada, deleteEntrada } = useBitacora();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filter, setFilter] = useState<CategoriaBitacora | 'todas'>('todas');
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [titulo, setTitulo] = useState('');
  const [contenido, setContenido] = useState('');
  const [categoria, setCategoria] = useState<CategoriaBitacora>('general');
  const [vinculado, setVinculado] = useState('');

  const filtered = entradas.filter(e => filter === 'todas' || e.categoria === filter);
  const selectedEntry = entradas.find(e => e.id === selectedEntryId);

  const openModal = (entrada?: BitacoraEntry) => {
    if (entrada) {
      setEditingId(entrada.id);
      setTitulo(entrada.titulo);
      setContenido(entrada.contenido);
      setCategoria(entrada.categoria);
      setVinculado(entrada.vinculado_a_reunion || '');
    } else {
      setEditingId(null);
      setTitulo('');
      setContenido('');
      setCategoria('general');
      setVinculado('');
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo.trim() || !contenido.trim()) return;

    if (editingId) {
      await updateEntrada(editingId, {
        titulo,
        contenido,
        categoria,
        vinculado_a_reunion: vinculado || undefined
      });
    } else {
      await addEntrada({
        titulo,
        contenido,
        categoria,
        vinculado_a_reunion: vinculado || undefined
      });
    }

    setTitulo('');
    setContenido('');
    setCategoria('general');
    setVinculado('');
    setEditingId(null);
    setIsModalOpen(false);
  };

  const catColors: Record<CategoriaBitacora, string> = {
    general: 'bg-slate-100 text-slate-700 border-slate-200',
    operativo: 'bg-blue-100 text-blue-700 border-blue-200',
    comercial: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    reunion: 'bg-purple-100 text-purple-700 border-purple-200',
    sistema: 'bg-amber-100 text-amber-700 border-amber-200'
  };

  return (
    <div className="flex flex-col h-full min-h-0 bg-slate-50 overflow-hidden">
      {/* Header Bar */}
      <div className="flex justify-between items-center bg-white p-4 border-b border-slate-200 shrink-0">
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {(['todas', 'general', 'operativo', 'comercial', 'reunion', 'sistema'] as const).map(c => (
            <button
              key={c}
              onClick={() => {
                setFilter(c);
                setSelectedEntryId(null); // Reset selection when filtering
              }}
              className={cn(
                "px-4 py-2 rounded-xl text-sm font-bold capitalize whitespace-nowrap transition-colors border",
                filter === c
                  ? "bg-slate-900 text-white border-slate-900"
                  : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
              )}
            >
              {c}
            </button>
          ))}
        </div>
        <button
          onClick={() => openModal()}
          className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-xl text-sm font-bold hover:bg-violet-700 transition-all shrink-0 shadow-md shadow-violet-600/20 active:scale-95"
        >
          <Plus className="w-4 h-4" /> Nuevo
        </button>
      </div>

      {/* Main Split View */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar: List of Entries */}
        <div className="w-full md:w-[35%] bg-white border-r border-slate-200 overflow-y-auto no-scrollbar flex flex-col">
          {isLoading ? (
            <div className="flex justify-center p-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900" /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center p-12 text-slate-400 m-auto">
              <NotebookPen className="w-8 h-8 mx-auto mb-3 opacity-50" />
              <p className="text-sm font-medium">No hay entradas aquí.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filtered.map(entrada => {
                const isSelected = selectedEntryId === entrada.id;
                return (
                  <button
                    key={entrada.id}
                    onClick={() => setSelectedEntryId(entrada.id)}
                    className={cn(
                      "w-full text-left p-4 transition-all hover:bg-slate-50 relative group",
                      isSelected ? "bg-slate-50" : "bg-white"
                    )}
                  >
                    {isSelected && <div className="absolute left-0 top-0 bottom-0 w-1 bg-violet-600" />}

                    <div className="flex justify-between items-start mb-1.5">
                      <span className={cn("text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border", catColors[entrada.categoria])}>
                        {entrada.categoria}
                      </span>
                      <span className="text-[10px] text-slate-400 font-bold uppercase">
                        {new Date(entrada.created_at).toLocaleDateString('es-NI', { day: '2-digit', month: 'short' })}
                      </span>
                    </div>

                    <h4 className={cn("font-bold text-sm leading-tight line-clamp-2 mb-1", isSelected ? "text-violet-700" : "text-slate-800")}>
                      {entrada.titulo}
                    </h4>

                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                      {entrada.contenido}
                    </p>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Detail View */}
        <div className="hidden md:flex flex-1 flex-col overflow-y-auto bg-slate-50/50">
          {selectedEntry ? (
            <div className="p-8 max-w-3xl mx-auto w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <span className={cn("text-xs font-black uppercase tracking-wider px-3 py-1 rounded-lg border", catColors[selectedEntry.categoria])}>
                      {selectedEntry.categoria}
                    </span>
                    <span className="text-sm font-bold text-slate-400">
                      {new Date(selectedEntry.created_at).toLocaleDateString('es-NI', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <h2 className="text-3xl font-black text-slate-900 leading-tight">{selectedEntry.titulo}</h2>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openModal(selectedEntry)}
                    className="p-2 text-slate-300 hover:text-blue-500 hover:bg-blue-50 rounded-xl transition-colors border border-transparent hover:border-blue-100"
                    title="Editar registro"
                  >
                    <Edit2 className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => {
                      if(confirm('¿Seguro que deseas eliminar este registro?')) {
                        deleteEntrada(selectedEntry.id);
                        setSelectedEntryId(null);
                      }
                    }}
                    className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-colors border border-transparent hover:border-rose-100"
                    title="Eliminar registro"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {selectedEntry.vinculado_a_reunion && (
                <div className="mb-6 flex items-center gap-2 text-sm font-bold text-purple-700 bg-purple-100/50 border border-purple-200 px-4 py-3 rounded-xl w-max">
                  <Calendar className="w-5 h-5" />
                  Vinculado a la reunión del: {selectedEntry.vinculado_a_reunion}
                </div>
              )}

              <div className="prose prose-slate prose-sm sm:prose-base max-w-none">
                <p className="whitespace-pre-wrap text-slate-700 leading-loose">
                  {selectedEntry.contenido}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8">
              <div className="w-20 h-20 bg-white rounded-3xl shadow-sm border border-slate-100 flex items-center justify-center mb-6">
                <NotebookPen className="w-8 h-8 text-violet-300" />
              </div>
              <h3 className="text-xl font-black text-slate-800 mb-2">Bitácora Gerencial</h3>
              <p className="text-slate-500 text-center max-w-sm">
                Selecciona una entrada de la lista para leer los detalles, o crea un nuevo registro para documentar tus hitos.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Modal for New/Edit Entry */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl p-6 md:p-8 animate-in zoom-in-95">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-violet-100 text-violet-600 rounded-2xl">
                <NotebookPen className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-black text-slate-900">{editingId ? 'Editar Avance' : 'Registrar Avance'}</h2>
            </div>

            <form onSubmit={handleSave} className="space-y-5">
              <div>
                <label className="block text-[11px] font-black text-slate-400 uppercase tracking-wider mb-2">Título del Hito</label>
                <input type="text" required value={titulo} onChange={e => setTitulo(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 rounded-2xl transition-all font-bold text-slate-800 outline-none" placeholder="Ej. Se contrataron 2 enfermeras" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-black text-slate-400 uppercase tracking-wider mb-2">Categoría</label>
                  <select value={categoria} onChange={e => setCategoria(e.target.value as CategoriaBitacora)} className="w-full p-4 bg-slate-50 border border-slate-200 focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 rounded-2xl transition-all font-bold text-slate-800 outline-none appearance-none cursor-pointer">
                    <option value="general">General</option>
                    <option value="operativo">Operativo</option>
                    <option value="comercial">Comercial</option>
                    <option value="reunion">Reunión</option>
                    <option value="sistema">Sistema</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-black text-slate-400 uppercase tracking-wider mb-2">Fecha Reunión (Opcional)</label>
                  <input type="date" value={vinculado} onChange={e => setVinculado(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 rounded-2xl transition-all font-bold text-slate-800 outline-none" />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-black text-slate-400 uppercase tracking-wider mb-2">Detalles Completos</label>
                <textarea rows={5} required value={contenido} onChange={e => setContenido(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 rounded-2xl transition-all text-slate-700 outline-none resize-none leading-relaxed" placeholder="Describe los avances, decisiones tomadas, contexto histórico..." />
              </div>

              <div className="pt-2 flex gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-4 bg-white border border-slate-200 hover:bg-slate-50 font-black rounded-2xl text-slate-600 transition-colors">Cancelar</button>
                <button type="submit" className="flex-1 py-4 bg-slate-900 hover:bg-slate-800 shadow-xl shadow-slate-900/20 font-black rounded-2xl text-white transition-all active:scale-95 flex items-center justify-center gap-2">
                  Guardar <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
