import { Sparkles, Loader2, ArrowRight, TrendingUp, AlertTriangle } from 'lucide-react';
import type { DailyBriefing } from '../../types';

interface AIBriefingProps {
  briefing: DailyBriefing | null;
  isLoading: boolean;
  onRefresh: () => void;
}

export default function AIBriefing({ briefing, isLoading, onRefresh }: AIBriefingProps) {
  if (isLoading) {
    return (
      <div className="bg-linear-to-r from-violet-600 to-indigo-700 rounded-3xl p-4 sm:p-6 text-white shadow-md relative overflow-hidden flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Loader2 className="w-6 h-6 animate-spin text-white/50" />
          <p className="text-violet-100 font-medium text-sm">Analizando datos y priorizando agenda...</p>
        </div>
      </div>
    );
  }

  if (!briefing) {
    return (
      <div className="bg-slate-50 rounded-3xl p-4 border border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Sparkles className="w-5 h-5 text-slate-400" />
          <span className="text-slate-600 text-sm font-medium">Sin Briefing IA para hoy.</span>
        </div>
        <button onClick={onRefresh} className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors">
          Analizar ahora
        </button>
      </div>
    );
  }

  return (
    <div className="bg-linear-to-r from-violet-600 to-indigo-700 rounded-3xl p-5 sm:p-6 text-white shadow-sm relative overflow-hidden">
      <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
        <Sparkles className="w-32 h-32 transform -rotate-12" />
      </div>

      <div className="relative z-10">
        <div className="flex justify-between items-start mb-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white/10 rounded-full text-[10px] font-bold tracking-wider mb-2 border border-white/20 backdrop-blur-md text-violet-200">
              <Sparkles className="w-3 h-3 text-emerald-400" />
              AXIA AI
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight leading-tight">
              {briefing.greeting}
            </h2>
          </div>
          <button onClick={onRefresh} className="text-[10px] font-bold text-violet-300 hover:text-white transition-colors bg-white/5 px-2 py-1 rounded-lg border border-white/10 flex items-center gap-1">
            <Sparkles className="w-3 h-3" /> Refrescar
          </button>
        </div>

        <div className="flex flex-col gap-3">
          {/* Priorities */}
          <div className="bg-white/10 p-3 rounded-2xl border border-white/10 backdrop-blur-sm">
            <h3 className="text-[10px] font-bold text-violet-200 uppercase tracking-wider flex items-center gap-1.5 mb-2">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-300" /> Prioridades
            </h3>
            <ul className="space-y-1.5">
              {briefing.topPriorities.slice(0, 2).map((p, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-white/50 text-[10px] font-black mt-0.5">{i + 1}.</span>
                  <span className="text-xs font-medium leading-snug">{p}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Insights */}
          <div className="bg-white/10 p-3 rounded-2xl border border-white/10 backdrop-blur-sm">
            <h3 className="text-[10px] font-bold text-violet-200 uppercase tracking-wider flex items-center gap-1.5 mb-2">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" /> Insights
            </h3>
            <ul className="space-y-1.5">
              {briefing.insights.slice(0, 2).map((ins, i) => (
                <li key={i} className="text-xs font-medium leading-snug flex items-start gap-1.5">
                  <span className="text-emerald-400 mt-0.5">•</span>
                  <span>{ins}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Actions */}
          <div className="bg-white/10 p-3 rounded-2xl border border-white/10 backdrop-blur-sm">
            <h3 className="text-[10px] font-bold text-violet-200 uppercase tracking-wider flex items-center gap-1.5 mb-2">
              <ArrowRight className="w-3.5 h-3.5 text-violet-300" /> Acciones
            </h3>
            <ul className="space-y-1.5">
              {briefing.suggestedActions.slice(0, 2).map((act, i) => (
                <li key={i} className="text-xs font-medium leading-snug flex items-start gap-1.5">
                  <ArrowRight className="w-3 h-3 text-violet-300 shrink-0 mt-0.5" />
                  <span>{act}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
