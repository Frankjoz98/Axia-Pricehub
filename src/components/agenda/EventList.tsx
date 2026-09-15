import { CheckCircle2, Circle, Sparkles, Clock, Trash2, Edit2 } from 'lucide-react';
import type { AgendaEvento } from '../../types';
import { cn } from '../../lib/utils';
import { isToday, isTomorrow, isThisWeek, parseISO, isPast } from 'date-fns';

interface EventListProps {
  eventos: AgendaEvento[];
  onToggleComplete: (id: string, currentStatus: boolean) => void;
  onEdit?: (evento: AgendaEvento) => void;
  onDelete?: (id: string) => void;
}

export default function EventList({ eventos, onToggleComplete, onEdit, onDelete }: EventListProps) {
  if (eventos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white rounded-xl border border-slate-200 border-dashed text-center">
        <Clock className="w-10 h-10 text-slate-300 mb-4" />
        <h3 className="text-base font-semibold text-slate-700">Día Libre</h3>
        <p className="text-sm text-slate-500">No hay eventos programados para este día.</p>
      </div>
    );
  }

  // Agrupar eventos
  const groupedEvents = {
    hoy: [] as AgendaEvento[],
    manana: [] as AgendaEvento[],
    estaSemana: [] as AgendaEvento[],
    futuros: [] as AgendaEvento[],
    pasados: [] as AgendaEvento[]
  };

  eventos.forEach(evento => {
    const date = parseISO(evento.fecha);
    // Para evitar desfases de zona horaria, usamos la fecha local
    const localDate = new Date(date.getTime() + date.getTimezoneOffset() * 60000);
    
    if (isPast(localDate) && !isToday(localDate)) {
       groupedEvents.pasados.push(evento);
    } else if (isToday(localDate)) {
       groupedEvents.hoy.push(evento);
    } else if (isTomorrow(localDate)) {
       groupedEvents.manana.push(evento);
    } else if (isThisWeek(localDate)) {
       groupedEvents.estaSemana.push(evento);
    } else {
       groupedEvents.futuros.push(evento);
    }
  });

  const renderGroup = (title: string, groupEvents: AgendaEvento[]) => {
    if (groupEvents.length === 0) return null;

    return (
      <div className="mb-8 last:mb-0">
        <h3 className="text-sm font-semibold text-slate-500 mb-4 tracking-wide uppercase">{title}</h3>
        <div className="space-y-3">
          {groupEvents.map(evento => (
            <div 
              key={evento.id} 
              className={cn(
                "group flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200/80 rounded-xl p-4 shadow-sm transition-all hover:shadow-md",
                evento.completado && "opacity-60 bg-slate-50"
              )}
            >
              {/* Lado Izquierdo */}
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <button 
                  onClick={() => onToggleComplete(evento.id, evento.completado)}
                  className="shrink-0 transition-transform active:scale-90"
                >
                  {evento.completado ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  ) : (
                    <Circle className="w-5 h-5 text-slate-300 hover:text-slate-400" />
                  )}
                </button>
                
                {/* Prioridad Indicator */}
                {!evento.completado && (
                   <div className={cn(
                     "w-2 h-2 shrink-0 rounded-full",
                     evento.prioridad === 'urgente' ? 'bg-rose-500' : 
                     evento.prioridad === 'alta' ? 'bg-amber-500' : 'bg-slate-300'
                   )} />
                )}

                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className={cn("text-sm font-semibold text-slate-900 truncate", evento.completado && "line-through text-slate-500")}>
                      {evento.titulo}
                    </h4>
                    {evento.tipo === 'ai_sugerencia' && !evento.completado && (
                      <Sparkles className="w-3 h-3 text-violet-400 shrink-0" />
                    )}
                  </div>
                  {evento.descripcion && (
                    <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">
                      {evento.descripcion}
                    </p>
                  )}
                </div>
              </div>

              {/* Lado Derecho */}
              <div className="flex items-center gap-3 shrink-0 ml-7 sm:ml-0">
                <span className="px-2.5 py-0.5 text-[10px] sm:text-xs font-medium rounded-full bg-slate-100 text-slate-600 border border-slate-200/60 capitalize whitespace-nowrap">
                  {evento.tipo.replace('_', ' ')}
                </span>
                
                {evento.hora_inicio && (
                  <span className="text-xs font-mono text-slate-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {evento.hora_inicio.slice(0,5)}
                  </span>
                )}

                {/* Acciones Hover */}
                {!evento.id.startsWith('auto-') && (
                  <div className="flex items-center gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                    {onEdit && (
                      <button onClick={() => onEdit(evento)} className="p-1.5 text-slate-400 hover:text-blue-600 rounded-md transition-colors">
                        <Edit2 className="w-4 h-4" />
                      </button>
                    )}
                    {onDelete && (
                      <button onClick={() => onDelete(evento.id)} className="p-1.5 text-slate-400 hover:text-rose-600 rounded-md transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="relative">
      {renderGroup('Atrasados / Pasados', groupedEvents.pasados)}
      {renderGroup('Hoy', groupedEvents.hoy)}
      {renderGroup('Mañana', groupedEvents.manana)}
      {renderGroup('Esta Semana', groupedEvents.estaSemana)}
      {renderGroup('Futuros', groupedEvents.futuros)}
    </div>
  );
}
