import { useState } from 'react';
import { Search, ChevronDown, ChevronUp, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { cn } from '../../lib/utils';

interface ProductLine {
  name: string;
  qty: number;
  price: number;
  total: number;
}

interface SessionSummary {
  sesion: string;
  cajero: string;
  minDate: string;
  maxDate: string;
  turno: string;
  revenue: number;
  cost: number;
  margin: number;
  orders: Set<string>;
  products: ProductLine[];
}

interface CierresTabProps {
  sessionSummaries: SessionSummary[];
}

export default function CierresTab({ sessionSummaries }: CierresTabProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [turnoFilter, setTurnoFilter] = useState<string>('all');
  const [expandedSession, setExpandedSession] = useState<string | null>(null);
  const [comparisons, setComparisons] = useState<Record<string, string>>({});

  const formatCurrency = (val: number) => `C$ ${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const filteredSessions = sessionSummaries.filter(s => {
    const matchesSearch = s.sesion.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          s.cajero.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTurno = turnoFilter === 'all' || s.turno === turnoFilter;
    return matchesSearch && matchesTurno;
  });

  const getTurnoLabel = (turno: string) => {
    switch (turno) {
      case 'turno1': return 'Mañana';
      case 'turno2': return 'Tarde';
      case 'turno3': return 'Noche';
      default: return 'Desconocido';
    }
  };

  const getTurnoColor = (turno: string) => {
    switch (turno) {
      case 'turno1': return 'bg-emerald-100 text-emerald-800';
      case 'turno2': return 'bg-orange-100 text-orange-800';
      case 'turno3': return 'bg-blue-100 text-blue-800';
      default: return 'bg-slate-100 text-slate-800';
    }
  };

  const handleCompareChange = (sesion: string, val: string) => {
    setComparisons(prev => ({ ...prev, [sesion]: val }));
  };

  return (
    <div className="space-y-6">
      {/* Header & Filters */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por código de sesión o cajero..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-emerald-500 transition-all text-slate-700 placeholder:text-slate-400 font-medium"
          />
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <select
            value={turnoFilter}
            onChange={(e) => setTurnoFilter(e.target.value)}
            className="px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-emerald-500 font-medium text-slate-700 min-w-37.5"
          >
            <option value="all">Todos los turnos</option>
            <option value="turno1">Mañana</option>
            <option value="turno2">Tarde</option>
            <option value="turno3">Noche</option>
          </select>
        </div>
      </div>

      {/* Sessions Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {filteredSessions.map(session => {
          const isExpanded = expandedSession === session.sesion;
          const compareVal = parseFloat(comparisons[session.sesion] || '0');
          const isCompared = comparisons[session.sesion] && comparisons[session.sesion].trim() !== '';
          const diff = session.revenue - compareVal;
          const isExactMatch = isCompared && Math.abs(diff) < 0.05;

          return (
            <div key={session.sesion} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
              {/* Card Header */}
              <div className="p-5 border-b border-slate-100 flex-1">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-lg font-black text-slate-900">{session.sesion}</h3>
                      <span className={cn("px-2 py-0.5 rounded-md text-xs font-bold", getTurnoColor(session.turno))}>
                        {getTurnoLabel(session.turno)}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-slate-500">Cajero: <span className="text-slate-700">{session.cajero}</span></p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-black text-emerald-600">{formatCurrency(session.revenue)}</p>
                    <p className="text-xs font-bold text-slate-400">{session.orders.size} órdenes</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="bg-slate-50 p-3 rounded-xl flex items-center gap-2">
                    <Clock className="w-4 h-4 text-slate-400" />
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Apertura</p>
                      <p className="text-xs font-bold text-slate-700">
                        {new Date(session.minDate).toLocaleString('es-NI', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' })}
                      </p>
                    </div>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl flex items-center gap-2">
                    <Clock className="w-4 h-4 text-slate-400" />
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Cierre</p>
                      <p className="text-xs font-bold text-slate-700">
                        {new Date(session.maxDate).toLocaleString('es-NI', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' })}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Compare Tool */}
                <div className="bg-slate-50 rounded-xl p-3">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Auditoría contra Z-Report</label>
                  <div className="flex gap-2 items-center">
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">C$</span>
                      <input
                        type="number"
                        placeholder="Total impreso..."
                        value={comparisons[session.sesion] || ''}
                        onChange={(e) => handleCompareChange(session.sesion, e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none"
                      />
                    </div>
                    {isCompared && (
                      <div className={cn("px-3 py-2 rounded-lg text-sm font-bold flex items-center gap-1", isExactMatch ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700")}>
                        {isExactMatch ? (
                          <><CheckCircle2 className="w-4 h-4" /> Cuadra</>
                        ) : (
                          <><AlertCircle className="w-4 h-4" /> Dif: {formatCurrency(diff)}</>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Card Footer / Expand */}
              <button 
                onClick={() => setExpandedSession(isExpanded ? null : session.sesion)}
                className="w-full p-3 bg-slate-50 border-t border-slate-100 flex justify-center items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-700 transition-colors"
              >
                {isExpanded ? <><ChevronUp className="w-4 h-4" /> Ocultar productos</> : <><ChevronDown className="w-4 h-4" /> Ver {session.products.length} productos</>}
              </button>

              {/* Expanded Products List */}
              {isExpanded && (
                <div className="bg-slate-900 border-t border-slate-800">
                  <div className="max-h-75 overflow-y-auto p-4">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr>
                          <th className="pb-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-800">Producto</th>
                          <th className="pb-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-800 text-right">Cant</th>
                          <th className="pb-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-800 text-right">Precio</th>
                          <th className="pb-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-800 text-right">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/50">
                        {session.products.sort((a,b) => b.total - a.total).map((p, idx) => (
                          <tr key={idx} className="hover:bg-white/5 transition-colors group">
                            <td className="py-2.5 text-xs font-medium text-slate-300 group-hover:text-white transition-colors">{p.name}</td>
                            <td className="py-2.5 text-xs text-slate-400 text-right">{p.qty}</td>
                            <td className="py-2.5 text-xs text-slate-400 text-right">C$ {p.price.toFixed(2)}</td>
                            <td className="py-2.5 text-xs font-bold text-slate-200 text-right">C$ {p.total.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      
      {filteredSessions.length === 0 && (
        <div className="text-center py-20 bg-white rounded-2xl border border-slate-200 border-dashed">
          <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">No se encontraron cierres de caja con esos filtros.</p>
        </div>
      )}
    </div>
  );
}
