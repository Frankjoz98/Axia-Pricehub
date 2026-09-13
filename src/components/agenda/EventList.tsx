import { CheckCircle2, Circle, Truck, AlertTriangle, Sparkles, Clock, Trash2, Edit2 } from 'lucide-react';
import type { AgendaEvento } from '../../types';
import { cn } from '../../lib/utils';

interface EventListProps {
  eventos: AgendaEvento[];
  onToggleComplete: (id: string, currentStatus: boolean) => void;
  onEdit?: (evento: AgendaEvento) => void;
  onDelete?: (id: string) => void;
}

export default function EventList({ eventos, onToggleComplete, onEdit, onDelete }: EventListProps) {
  if (eventos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white rounded-3xl border border-slate-200 border-dashed text-center">
        <Clock className="w-12 h-12 text-slate-300 mb-4" />
        <h3 className="text-lg font-bold text-slate-700">Día Libre</h3>
        <p className="text-slate-500">No hay eventos programados para este día.</p>
      </div>
    );
  }

  const getPriorityStyles = (prioridad: string, completado: boolean) => {
    if (completado) return 'bg-slate-50 border-slate-200 opacity-60';
    switch (prioridad) {
      case 'urgente': return 'bg-rose-50 border-rose-200 shadow-sm shadow-rose-100';
      case 'alta': return 'bg-amber-50 border-amber-200';
      case 'baja': return 'bg-slate-50 border-slate-200';
      default: return 'bg-white border-slate-200';
    }
  };

  const getIcon = (tipo: string, completado: boolean, prioridad: string) => {
    if (completado) return <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
    
    switch (tipo) {
      case 'visita_proveedor': return <Truck className="w-5 h-5 text-blue-500" />;
      case 'pago': return prioridad === 'urgente' ? <AlertTriangle className="w-5 h-5 text-rose-500" /> : <Clock className="w-5 h-5 text-amber-500" />;
      case 'ai_sugerencia': return <Sparkles className="w-5 h-5 text-violet-500" />;
      default: return <Circle className="w-5 h-5 text-slate-400" />;
    }
  };

  const getPriorityBadge = (prioridad: string) => {
    switch (prioridad) {
      case 'urgente': return <span className="text-[10px] uppercase font-black tracking-wider text-rose-600 bg-rose-100 px-2 py-0.5 rounded-full">Urgente</span>;
      case 'alta': return <span className="text-[10px] uppercase font-black tracking-wider text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">Alta</span>;
      default: return null;
    }
  };

  return (
    <div className="relative space-y-6 before:absolute before:top-4 before:bottom-4 before:ml-[1.1rem] before:w-0.5 before:-translate-x-px before:bg-slate-200">
      {eventos.map((evento) => (
        <div 
          key={evento.id} 
          className="relative flex items-start gap-4 sm:gap-6 group"
        >
          {/* Timeline Node */}
          <div className="relative z-10 flex items-center justify-center bg-slate-50 py-1">
            <button 
              onClick={() => onToggleComplete(evento.id, evento.completado)}
              className="shrink-0 transition-transform active:scale-90 hover:scale-110 bg-white rounded-full"
            >
              {getIcon(evento.tipo, evento.completado, evento.prioridad)}
            </button>
          </div>
          
          {/* Card Content */}
          <div className={cn(
            "flex-1 p-5 rounded-2xl border transition-all hover:shadow-lg hover:-translate-y-0.5",
            getPriorityStyles(evento.prioridad, evento.completado)
          )}>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <h4 className={cn("font-bold text-slate-800 text-lg", evento.completado && "line-through text-slate-500")}>
                  {evento.titulo}
                </h4>
                {!evento.completado && getPriorityBadge(evento.prioridad)}
                {evento.tipo === 'ai_sugerencia' && !evento.completado && (
                  <span className="text-[10px] uppercase font-black tracking-wider text-violet-600 bg-violet-100 px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm shadow-violet-200/50 border border-violet-200">
                    <Sparkles className="w-3 h-3" /> IA
                  </span>
                )}
              </div>
              
              {evento.descripcion && (
                <p className={cn("text-sm text-slate-600 leading-relaxed max-w-3xl", evento.completado && "text-slate-400 line-through")}>
                  {evento.descripcion}
                </p>
              )}

              <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-900/5">
                {(evento.hora_inicio || evento.hora_fin) && !evento.completado ? (
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
                    <Clock className="w-3.5 h-3.5" />
                    {evento.hora_inicio?.slice(0,5) || ''} {evento.hora_fin ? `- ${evento.hora_fin.slice(0,5)}` : ''}
                  </div>
                ) : <div />}

                {!evento.id.startsWith('auto-') && (
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {onEdit && (
                      <button onClick={() => onEdit(evento)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                        <Edit2 className="w-4 h-4" />
                      </button>
                    )}
                    {onDelete && (
                      <button onClick={() => onDelete(evento.id)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
