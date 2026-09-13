import { useState, useEffect } from 'react';
import { X, Clock, Tag, AlignLeft } from 'lucide-react';
import type { AgendaEvento, Proveedor } from '../../types';

interface EventFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (evento: Partial<AgendaEvento>) => void;
  initialData?: AgendaEvento | null;
  selectedDate: Date;
  proveedores: Proveedor[];
}

export default function EventFormModal({ isOpen, onClose, onSave, initialData, selectedDate, proveedores }: EventFormModalProps) {
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [tipo, setTipo] = useState<AgendaEvento['tipo']>('tarea');
  const [prioridad, setPrioridad] = useState<AgendaEvento['prioridad']>('media');
  const [horaInicio, setHoraInicio] = useState('');
  const [horaFin, setHoraFin] = useState('');
  const [proveedorId, setProveedorId] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setTitulo(initialData.titulo);
        setDescripcion(initialData.descripcion || '');
        setTipo(initialData.tipo);
        setPrioridad(initialData.prioridad);
        setHoraInicio(initialData.hora_inicio || '');
        setHoraFin(initialData.hora_fin || '');
        setProveedorId(initialData.proveedor_id || '');
      } else {
        setTitulo('');
        setDescripcion('');
        setTipo('tarea');
        setPrioridad('media');
        setHoraInicio('');
        setHoraFin('');
        setProveedorId('');
      }
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo.trim()) return;

    const y = selectedDate.getFullYear();
    const m = String(selectedDate.getMonth() + 1).padStart(2, '0');
    const d = String(selectedDate.getDate()).padStart(2, '0');
    const fecha = `${y}-${m}-${d}`;

    onSave({
      titulo: titulo.trim(),
      descripcion: descripcion.trim() || undefined,
      tipo,
      prioridad,
      fecha,
      hora_inicio: horaInicio || undefined,
      hora_fin: horaFin || undefined,
      proveedor_id: proveedorId || undefined,
      completado: initialData?.completado || false,
      recurrente: false
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <h2 className="text-xl font-black text-slate-800">
            {initialData ? 'Editar Evento' : 'Nuevo Evento'}
          </h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Título del evento</label>
            <div className="relative">
              <Tag className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                required
                value={titulo}
                onChange={e => setTitulo(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none transition-all font-medium text-slate-700"
                placeholder="Ej. Revisar inventario físico"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Tipo</label>
              <select
                value={tipo}
                onChange={e => setTipo(e.target.value as any)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none transition-all font-medium text-slate-700 appearance-none"
              >
                <option value="tarea">Tarea</option>
                <option value="visita_proveedor">Visita de Proveedor</option>
                <option value="pago">Pago</option>
                <option value="recordatorio">Recordatorio</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Prioridad</label>
              <select
                value={prioridad}
                onChange={e => setPrioridad(e.target.value as any)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none transition-all font-medium text-slate-700 appearance-none"
              >
                <option value="baja">Baja</option>
                <option value="media">Media</option>
                <option value="alta">Alta</option>
                <option value="urgente">Urgente</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Hora Inicio (Opcional)</label>
              <div className="relative">
                <Clock className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="time"
                  value={horaInicio}
                  onChange={e => setHoraInicio(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none transition-all font-medium text-slate-700"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Hora Fin (Opcional)</label>
              <div className="relative">
                <Clock className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="time"
                  value={horaFin}
                  onChange={e => setHoraFin(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none transition-all font-medium text-slate-700"
                />
              </div>
            </div>
          </div>

          {(tipo === 'visita_proveedor' || tipo === 'pago') && (
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Proveedor Vinculado (Opcional)</label>
              <select
                value={proveedorId}
                onChange={e => setProveedorId(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none transition-all font-medium text-slate-700 appearance-none"
              >
                <option value="">Seleccione un proveedor...</option>
                {proveedores.map(p => (
                  <option key={p.id} value={p.id}>{p.nombre}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Descripción (Opcional)</label>
            <div className="relative">
              <AlignLeft className="w-5 h-5 absolute left-3 top-4 text-slate-400" />
              <textarea
                rows={3}
                value={descripcion}
                onChange={e => setDescripcion(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none transition-all font-medium text-slate-700 resize-none"
                placeholder="Detalles adicionales..."
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 py-3.5 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-colors">
              Cancelar
            </button>
            <button type="submit" className="flex-1 py-3.5 bg-violet-600 text-white rounded-xl font-bold hover:bg-violet-700 shadow-lg shadow-violet-600/30 transition-all active:scale-[0.98]">
              {initialData ? 'Guardar Cambios' : 'Crear Evento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
