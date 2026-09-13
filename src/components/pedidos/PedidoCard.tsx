import { Clock, Check, CheckCircle2, Archive, User, Search, Stethoscope, AlertTriangle } from 'lucide-react';
import type { PedidoSugerido, TipoPedido, EstadoPedido } from '../../types';
import { cn } from '../../lib/utils';

interface PedidoCardProps {
  pedido: PedidoSugerido;
  onAction?: (nuevoEstado: EstadoPedido) => void;
  onDelete?: () => void;
}

export default function PedidoCard({ pedido, onAction, onDelete }: PedidoCardProps) {
  
  const getConfig = (tipo: TipoPedido) => {
    switch (tipo) {
      case 'encargo_cliente':
        return { color: 'text-blue-600', bg: 'bg-blue-100', border: 'border-blue-200', icon: User, label: 'Encargo de Cliente' };
      case 'esencial':
        return { color: 'text-emerald-600', bg: 'bg-emerald-100', border: 'border-emerald-200', icon: Stethoscope, label: 'Medicamento Esencial' };
      case 'quiebre_stock':
        return { color: 'text-rose-600', bg: 'bg-rose-100', border: 'border-rose-200', icon: AlertTriangle, label: 'Quiebre de Stock' };
      case 'sugerencia':
      default:
        return { color: 'text-violet-600', bg: 'bg-violet-100', border: 'border-violet-200', icon: Search, label: 'Sugerencia' };
    }
  };

  const conf = getConfig(pedido.tipo_pedido);
  const Icon = conf.icon;

  const formatDate = (d: string) => {
    return new Date(d).toLocaleDateString('es-NI', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  return (
    <div className={cn("p-5 rounded-2xl border bg-white transition-all hover:shadow-md", conf.border)}>
      <div className="flex justify-between items-start gap-4 mb-3">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className={cn("inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider", conf.bg, conf.color)}>
              <Icon className="w-3 h-3" />
              {conf.label}
            </span>
            {pedido.estado === 'pedido' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-600">
                <Clock className="w-3 h-3" /> Ya se pidió
              </span>
            )}
            {pedido.estado === 'recibido' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-600">
                <CheckCircle2 className="w-3 h-3" /> Recibido
              </span>
            )}
          </div>
          
          <h3 className="text-lg font-black text-slate-800 leading-tight">
            {pedido.producto_nombre}
            <span className="ml-2 text-sm font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-lg">x{pedido.cantidad_sugerida}</span>
          </h3>
          {pedido.laboratorio && (
            <p className="text-sm font-bold text-slate-500 mt-1">Lab: {pedido.laboratorio}</p>
          )}
        </div>
      </div>

      {(pedido.nombre_cliente || pedido.comentarios) && (
        <div className="mt-3 bg-slate-50 p-3 rounded-xl border border-slate-100 text-sm">
          {pedido.nombre_cliente && (
            <div className="flex gap-2 text-slate-700 font-medium mb-1">
              <User className="w-4 h-4 text-slate-400 shrink-0" />
              <span>Para: <strong>{pedido.nombre_cliente}</strong></span>
            </div>
          )}
          {pedido.comentarios && (
            <div className="text-slate-600 italic mt-1">
              "{pedido.comentarios}"
            </div>
          )}
        </div>
      )}

      <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
        <div className="text-xs font-medium text-slate-400">
          Por <strong>{pedido.registrado_por}</strong> • {formatDate(pedido.created_at)}
        </div>

        {onAction && (
          <div className="flex gap-2">
            {pedido.estado === 'pendiente' && (
              <button onClick={() => onAction('pedido')} className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-600 rounded-xl text-xs font-bold border border-amber-200 transition-colors flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5" /> Ya se pidió
              </button>
            )}
            {pedido.estado === 'pedido' && (
              <button onClick={() => onAction('recibido')} className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded-xl text-xs font-bold border border-emerald-200 transition-colors flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" /> Ya llegó
              </button>
            )}
            {pedido.estado === 'recibido' && (
              <button onClick={() => onAction('archivado')} className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold border border-slate-200 transition-colors flex items-center gap-1.5">
                <Archive className="w-3.5 h-3.5" /> Archivar
              </button>
            )}
            {pedido.estado === 'archivado' && onDelete && (
              <button onClick={onDelete} className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-xs font-bold border border-rose-200 transition-colors">
                Eliminar
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
