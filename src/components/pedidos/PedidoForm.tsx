import { useState } from 'react';
import { X, Search, User, Stethoscope, AlertTriangle, type LucideIcon } from 'lucide-react';
import type { TipoPedido } from '../../types';
import { cn } from '../../lib/utils';

interface PedidoFormProps {
  onClose: () => void;
  onSave: (pedido: {
    producto_nombre: string;
    laboratorio?: string;
    cantidad_sugerida: number;
    tipo_pedido: TipoPedido;
    nombre_cliente?: string;
    comentarios?: string;
    registrado_por: string;
  }) => Promise<void>;
}

const TIPOS: { id: TipoPedido, label: string, icon: LucideIcon, color: string }[] = [
  { id: 'sugerencia', label: 'Sugerencia', icon: Search, color: 'text-violet-600 bg-violet-100 border-violet-200 hover:bg-violet-50' },
  { id: 'encargo_cliente', label: 'Encargo', icon: User, color: 'text-blue-600 bg-blue-100 border-blue-200 hover:bg-blue-50' },
  { id: 'esencial', label: 'Esencial', icon: Stethoscope, color: 'text-emerald-600 bg-emerald-100 border-emerald-200 hover:bg-emerald-50' },
  { id: 'quiebre_stock', label: 'Quiebre Stock', icon: AlertTriangle, color: 'text-rose-600 bg-rose-100 border-rose-200 hover:bg-rose-50' },
];

export default function PedidoForm({ onClose, onSave }: PedidoFormProps) {
  const [producto, setProducto] = useState('');
  const [laboratorio, setLaboratorio] = useState('');
  const [cantidad, setCantidad] = useState(1);
  const [tipo, setTipo] = useState<TipoPedido>('sugerencia');
  const [cliente, setCliente] = useState('');
  const [comentarios, setComentarios] = useState('');
  const [dependiente, setDependiente] = useState(localStorage.getItem('axia_ultimo_dependiente') || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    localStorage.setItem('axia_ultimo_dependiente', dependiente);

    try {
      await onSave({
        producto_nombre: producto,
        laboratorio: laboratorio || undefined,
        cantidad_sugerida: cantidad,
        tipo_pedido: tipo,
        nombre_cliente: tipo === 'encargo_cliente' ? cliente : undefined,
        comentarios: comentarios || undefined,
        registrado_por: dependiente
      });
      onClose();
    } catch (error) {
      console.error(error);
      alert('Error al guardar el pedido');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-3xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50">
          <h2 className="text-xl font-black text-slate-800">Nuevo Requerimiento</h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-200 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="flex-1 overflow-y-auto p-6">
          <form id="pedido-form" onSubmit={handleSubmit} className="space-y-6">

            {/* Tipo de Pedido */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Categoría del Pedido</label>
              <div className="grid grid-cols-2 gap-2">
                {TIPOS.map(t => {
                  const Icon = t.icon;
                  const isSelected = tipo === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setTipo(t.id)}
                      className={cn(
                        "flex items-center gap-2 p-3 rounded-xl border transition-all text-left",
                        isSelected ? t.color : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                      )}
                    >
                      <Icon className={cn("w-5 h-5", isSelected ? "" : "text-slate-400")} />
                      <span className="font-bold text-sm leading-tight">{t.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-3">
                <label className="block text-sm font-bold text-slate-700 mb-1">Nombre del Medicamento *</label>
                <input required type="text" value={producto} onChange={e => setProducto(e.target.value)}
                  placeholder="Ej. Fixim 400mg"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-violet-500 outline-none" />
              </div>
              <div className="md:col-span-1">
                <label className="block text-sm font-bold text-slate-700 mb-1">Cant *</label>
                <input required type="number" min="1" value={cantidad} onChange={e => setCantidad(Number(e.target.value))}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-violet-500 outline-none font-bold text-center" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Laboratorio (Opcional)</label>
                <input type="text" value={laboratorio} onChange={e => setLaboratorio(e.target.value)}
                  placeholder="Ej. Leterago"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-violet-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Tu Nombre (Dependiente) *</label>
                <input required type="text" value={dependiente} onChange={e => setDependiente(e.target.value)}
                  placeholder="Ej. Juan Pérez"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-violet-500 outline-none font-medium" />
              </div>
            </div>

            {tipo === 'encargo_cliente' && (
              <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl">
                <label className="block text-sm font-bold text-blue-900 mb-1">Nombre del Cliente *</label>
                <input required type="text" value={cliente} onChange={e => setCliente(e.target.value)}
                  placeholder="Ej. María López"
                  className="w-full px-4 py-2.5 bg-white border border-blue-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
            )}

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Comentarios Adicionales (Opcional)</label>
              <textarea value={comentarios} onChange={e => setComentarios(e.target.value)} rows={2}
                placeholder="Ej. El cliente lo necesita para el martes..."
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-violet-500 outline-none resize-none" />
            </div>

          </form>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="px-6 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors">
            Cancelar
          </button>
          <button type="submit" form="pedido-form" disabled={isSubmitting}
            className="px-6 py-2.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white font-bold rounded-xl shadow-lg shadow-violet-500/30 transition-all">
            {isSubmitting ? 'Guardando...' : 'Registrar Pedido'}
          </button>
        </div>

      </div>
    </div>
  );
}
