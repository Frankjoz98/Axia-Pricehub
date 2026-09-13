import { useState } from 'react';
import { Target, CheckCircle2, Circle, Plus, Trash2, Edit2, Calendar } from 'lucide-react';
import { useMetas } from '../../hooks/useMetas';
import type { Meta, ChecklistItem } from '../../types';
import { cn } from '../../lib/utils';

export default function MetasTab() {
  const { metas, isLoading, addMeta, updateMeta, deleteMeta } = useMetas();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMeta, setEditingMeta] = useState<Meta | null>(null);

  // Form State
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [fechaLimite, setFechaLimite] = useState('');
  const [prioridad, setPrioridad] = useState<Meta['prioridad']>('media');
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [newItemText, setNewItemText] = useState('');

  const openModal = (meta?: Meta) => {
    if (meta) {
      setEditingMeta(meta);
      setTitulo(meta.titulo);
      setDescripcion(meta.descripcion || '');
      setFechaLimite(meta.fecha_limite || '');
      setPrioridad(meta.prioridad);
      setChecklist(meta.checklist || []);
    } else {
      setEditingMeta(null);
      setTitulo('');
      setDescripcion('');
      setFechaLimite('');
      setPrioridad('media');
      setChecklist([]);
    }
    setNewItemText('');
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo.trim()) return;

    const metaData = {
      titulo,
      descripcion,
      fecha_limite: fechaLimite || undefined,
      prioridad,
      checklist,
      completada: editingMeta ? editingMeta.completada : false
    };

    if (editingMeta) {
      await updateMeta(editingMeta.id, metaData);
    } else {
      await addMeta(metaData);
    }
    setIsModalOpen(false);
  };

  const handleToggleChecklistItem = async (meta: Meta, itemId: string) => {
    const updatedChecklist = meta.checklist.map(i => 
      i.id === itemId ? { ...i, completado: !i.completado } : i
    );
    
    const allCompleted = updatedChecklist.length > 0 && updatedChecklist.every(i => i.completado);
    
    await updateMeta(meta.id, { 
      checklist: updatedChecklist,
      completada: allCompleted 
    });
  };

  const addChecklistItem = () => {
    if (!newItemText.trim()) return;
    setChecklist([...checklist, { id: Date.now().toString(), texto: newItemText.trim(), completado: false }]);
    setNewItemText('');
  };

  const removeChecklistItem = (id: string) => {
    setChecklist(checklist.filter(i => i.id !== id));
  };

  if (isLoading) {
    return <div className="flex justify-center p-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
        <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
          <Target className="w-5 h-5 text-indigo-500" /> Metas Activas ({metas.filter(m => !m.completada).length})
        </h2>
        <button 
          onClick={() => openModal()}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-600/30 transition-all"
        >
          <Plus className="w-4 h-4" /> Nueva Meta
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {metas.map(meta => {
          const total = meta.checklist.length;
          const completados = meta.checklist.filter(i => i.completado).length;
          const progress = total === 0 ? (meta.completada ? 100 : 0) : Math.round((completados / total) * 100);

          return (
            <div key={meta.id} className={cn(
              "bg-white rounded-2xl p-5 border shadow-sm flex flex-col transition-all",
              meta.completada ? "border-emerald-200 bg-emerald-50/30" : "border-slate-200 hover:shadow-md"
            )}>
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1 min-w-0 pr-4">
                  <div className="flex items-center gap-2 mb-1">
                    {meta.completada ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <Target className="w-5 h-5 text-indigo-500" />}
                    <h3 className={cn("font-bold truncate text-lg", meta.completada ? "text-emerald-700" : "text-slate-800")}>
                      {meta.titulo}
                    </h3>
                  </div>
                  {meta.descripcion && <p className="text-sm text-slate-500 line-clamp-2">{meta.descripcion}</p>}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => openModal(meta)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => { if(confirm('¿Eliminar meta?')) deleteMeta(meta.id); }} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {meta.fecha_limite && (
                <div className="flex items-center gap-1.5 text-xs font-bold text-rose-500 bg-rose-50 px-2.5 py-1 rounded-md w-max mb-4">
                  <Calendar className="w-3.5 h-3.5" />
                  Límite: {meta.fecha_limite}
                </div>
              )}

              {/* Progress Bar */}
              <div className="mt-auto pt-2">
                <div className="flex justify-between text-xs font-bold mb-1.5">
                  <span className={meta.completada ? "text-emerald-600" : "text-slate-600"}>Progreso</span>
                  <span className={meta.completada ? "text-emerald-600" : "text-indigo-600"}>{progress}%</span>
                </div>
                <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className={cn("h-full rounded-full transition-all duration-500", meta.completada ? "bg-emerald-500" : "bg-indigo-500")}
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              {/* Checklist */}
              {meta.checklist.length > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-100 space-y-2">
                  {meta.checklist.map(item => (
                    <div key={item.id} className="flex items-start gap-2 group">
                      <button 
                        onClick={() => handleToggleChecklistItem(meta, item.id)}
                        className="mt-0.5 shrink-0"
                      >
                        {item.completado ? 
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : 
                          <Circle className="w-4 h-4 text-slate-300 group-hover:text-indigo-400" />
                        }
                      </button>
                      <span className={cn("text-sm transition-colors", item.completado ? "text-slate-400 line-through" : "text-slate-700")}>
                        {item.texto}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-black mb-6">{editingMeta ? 'Editar Meta' : 'Nueva Meta'}</h2>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Título de la meta</label>
                <input type="text" required value={titulo} onChange={e => setTitulo(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-medium" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Descripción (Opcional)</label>
                <textarea rows={2} value={descripcion} onChange={e => setDescripcion(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl resize-none text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Fecha Límite</label>
                  <input type="date" value={fechaLimite} onChange={e => setFechaLimite(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Prioridad</label>
                  <select value={prioridad} onChange={e => setPrioridad(e.target.value as any)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm">
                    <option value="baja">Baja</option>
                    <option value="media">Media</option>
                    <option value="alta">Alta</option>
                  </select>
                </div>
              </div>
              
              <div className="pt-2">
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Checklist de Tareas</label>
                <div className="space-y-2 mb-3">
                  {checklist.map(item => (
                    <div key={item.id} className="flex items-center gap-2 bg-slate-50 p-2 rounded-lg border border-slate-200">
                      <div className="w-4 h-4 rounded-full border-2 border-slate-300" />
                      <span className="flex-1 text-sm">{item.texto}</span>
                      <button type="button" onClick={() => removeChecklistItem(item.id)} className="p-1 text-slate-400 hover:text-rose-500"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={newItemText} 
                    onChange={e => setNewItemText(e.target.value)} 
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addChecklistItem())}
                    className="flex-1 p-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl" 
                    placeholder="Agregar tarea al checklist..." 
                  />
                  <button type="button" onClick={addChecklistItem} className="px-4 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-bold transition-colors">Add</button>
                </div>
              </div>

              <div className="pt-6 flex gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 bg-slate-100 font-bold rounded-xl text-slate-600">Cancelar</button>
                <button type="submit" className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 font-bold rounded-xl text-white shadow-lg shadow-indigo-600/30">Guardar Meta</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
