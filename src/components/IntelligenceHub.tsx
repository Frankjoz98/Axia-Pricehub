import { useState } from 'react';
import { BarChart3, Search, AlertTriangle, Zap, ShoppingBag, DollarSign, Clock, Package, Hash, Sparkles } from 'lucide-react';
import { cn } from '../lib/utils';
import type { VentaHistorica, OdooInventario, PurchaseOrder, UnifiedProduct, SupplierOffer } from '../types';
import { useBusinessMetrics } from '../hooks/useBusinessMetrics';
import { useAlerts } from '../context/AlertsContext';
import { todayYMD, startOfLocalDay, endOfLocalDay, startOfLocalWeekMonday } from '../lib/dates';

import SmartRestock from './SmartRestock';
import PrintableReport from './reports/PrintableReport';
import OverviewTab from './intelligence/OverviewTab';
import TimeTab from './intelligence/TimeTab';
import LabsTab from './intelligence/LabsTab';
import LupaTab from './intelligence/LupaTab';
import CierresTab from './intelligence/CierresTab';
import ReportExportModal from './intelligence/ReportExportModal';

interface IntelligenceHubProps {
  ventas: VentaHistorica[];
  inventario: OdooInventario[];
  ordenes: PurchaseOrder[];
  productos: UnifiedProduct[];
  onAddToCart: (product: UnifiedProduct, offer: SupplierOffer, qty: number) => void;
}

export default function IntelligenceHub({ ventas, inventario, ordenes, productos, onAddToCart }: IntelligenceHubProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'time' | 'labs' | 'staff' | 'lupa' | 'cierres' | 'alerts' | 'restock'>('overview');
  const [timeGrouping, setTimeGrouping] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportStartDate, setReportStartDate] = useState(todayYMD());
  const [reportEndDate, setReportEndDate] = useState(todayYMD());
  const [cierresComparisons, setCierresComparisons] = useState<Record<string, string>>({});
  const [globalDateRange, setGlobalDateRange] = useState<{ start: Date | null, end: Date | null, filterType: 'today' | 'week' | 'month' | 'all' }>({ start: null, end: null, filterType: 'all' });
  const [lupaPreSearch, setLupaPreSearch] = useState('');

  const { alerts } = useAlerts();
  const metrics = useBusinessMetrics({ 
    ventas, 
    inventario, 
    ordenes, 
    timeGrouping,
    dateRange: globalDateRange.filterType === 'all' ? undefined : { start: globalDateRange.start, end: globalDateRange.end }
  });

  const setQuickFilter = (type: 'today' | 'week' | 'month' | 'all') => {
    const now = new Date();
    const todayStart = startOfLocalDay(now);
    const todayEnd = endOfLocalDay(now);

    if (type === 'today') {
      setGlobalDateRange({ start: todayStart, end: todayEnd, filterType: type });
    } else if (type === 'week') {
      setGlobalDateRange({ start: startOfLocalWeekMonday(now), end: todayEnd, filterType: type });
    } else if (type === 'month') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      setGlobalDateRange({ start: startOfMonth, end: todayEnd, filterType: type });
    } else {
      setGlobalDateRange({ start: null, end: null, filterType: type });
    }
  };

  const handleDrillDown = (dateString: string) => {
    setGlobalDateRange({ start: null, end: null, filterType: 'all' });
    setLupaPreSearch(dateString);
    setActiveTab('lupa');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-20">
      
      <div className="print:hidden space-y-6">
        {/* Header Tabs (Scrollable on mobile) */}
        <div className="bg-white rounded-2xl p-2 shadow-sm border border-slate-200 overflow-x-auto">
          <div className="flex gap-2 min-w-max">
            <button onClick={() => setActiveTab('overview')} className={cn("px-4 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all", activeTab === 'overview' ? "bg-slate-900 text-white shadow-md" : "text-slate-500 hover:bg-slate-50")}>
              <BarChart3 className="w-4 h-4" /> Resumen
            </button>
            <button onClick={() => setActiveTab('time')} className={cn("px-4 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all", activeTab === 'time' ? "bg-orange-500 text-white shadow-md" : "text-slate-500 hover:bg-slate-50")}>
              <Clock className="w-4 h-4" /> Horas y Crecimiento
            </button>
            <button onClick={() => setActiveTab('labs')} className={cn("px-4 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all", activeTab === 'labs' ? "bg-indigo-500 text-white shadow-md" : "text-slate-500 hover:bg-slate-50")}>
              <Package className="w-4 h-4" /> Laboratorios
            </button>
            <button onClick={() => setActiveTab('staff')} className={cn("px-4 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all", activeTab === 'staff' ? "bg-blue-500 text-white shadow-md" : "text-slate-500 hover:bg-slate-50")}>
              <Hash className="w-4 h-4" /> Personal
            </button>
            <div className="w-px bg-slate-200 mx-2" />
            <button onClick={() => setActiveTab('lupa')} className={cn("px-4 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all", activeTab === 'lupa' ? "bg-emerald-600 text-white shadow-md shadow-emerald-500/25" : "text-slate-500 hover:bg-slate-50")}>
              <Search className="w-4 h-4" /> Lupa
            </button>
            <button onClick={() => setActiveTab('cierres')} className={cn("px-4 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all", activeTab === 'cierres' ? "bg-teal-600 text-white shadow-md" : "text-slate-500 hover:bg-slate-50")}>
              <Clock className="w-4 h-4" /> Cierres
            </button>
            <button onClick={() => setActiveTab('alerts')} className={cn("px-4 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all relative", activeTab === 'alerts' ? "bg-amber-500 text-white shadow-md" : "text-slate-500 hover:bg-slate-50")}>
              <AlertTriangle className="w-4 h-4" /> Alertas
              {alerts.length > 0 && <span className="absolute top-2 right-2 flex h-3 w-3 items-center justify-center rounded-full bg-rose-500 animate-pulse" />}
            </button>
            <button onClick={() => setActiveTab('restock')} className={cn("px-4 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all", activeTab === 'restock' ? "bg-indigo-600 text-white shadow-md" : "text-slate-500 hover:bg-slate-50")}>
              <Zap className="w-4 h-4" /> Axia AI
            </button>
          </div>
        </div>

        {/* Global Date Filter Bar */}
        <div className="flex gap-2">
          <button onClick={() => setQuickFilter('today')} className={cn("px-3 py-1.5 rounded-lg text-xs font-bold transition-all", globalDateRange.filterType === 'today' ? "bg-slate-900 text-white" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50")}>Hoy</button>
          <button onClick={() => setQuickFilter('week')} className={cn("px-3 py-1.5 rounded-lg text-xs font-bold transition-all", globalDateRange.filterType === 'week' ? "bg-slate-900 text-white" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50")}>Esta Semana</button>
          <button onClick={() => setQuickFilter('month')} className={cn("px-3 py-1.5 rounded-lg text-xs font-bold transition-all", globalDateRange.filterType === 'month' ? "bg-slate-900 text-white" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50")}>Mes Actual</button>
          <button onClick={() => setQuickFilter('all')} className={cn("px-3 py-1.5 rounded-lg text-xs font-bold transition-all", globalDateRange.filterType === 'all' ? "bg-slate-900 text-white" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50")}>Histórico</button>
        </div>

        {/* Global Metrics Header (Always visible for overview, time, labs, staff) */}
        {['overview', 'time', 'labs', 'staff'].includes(activeTab) && metrics && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-900 p-4 rounded-2xl shadow-lg border border-slate-800">
            <div className="bg-white/10 backdrop-blur-sm p-4 rounded-xl border border-white/10 relative group">
              <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1 flex items-center gap-1">
                <ShoppingBag className="w-3 h-3" />Facturado
              </p>
              <p className="text-xl font-black text-white">C$ {(metrics.totalRevenue / 1000).toFixed(1)}k</p>
              <div className="absolute inset-0 bg-slate-900/95 backdrop-blur-xl rounded-xl border border-slate-700 opacity-0 group-hover:opacity-100 transition-opacity p-3 flex flex-col justify-center pointer-events-none z-10">
                <div className="flex justify-between items-center text-[10px]">
                  <span className="text-slate-400">Sesiones (POS)</span>
                  <span className="font-bold text-white">C$ {(metrics.posRevenue / 1000).toFixed(1)}k</span>
                </div>
                <div className="flex justify-between items-center text-[10px] mt-1">
                  <span className="text-slate-400">Directas (Backend)</span>
                  <span className="font-bold text-amber-400">C$ {(metrics.backendRevenue / 1000).toFixed(1)}k</span>
                </div>
              </div>
            </div>
            <div className="bg-emerald-900/40 p-4 rounded-xl border border-emerald-800/50">
              <p className="text-emerald-400/80 text-[10px] font-bold uppercase tracking-wider mb-1 flex items-center gap-1"><DollarSign className="w-3 h-3" />Margen</p>
              <p className="text-xl font-black text-emerald-400">C$ {(metrics.totalMargin / 1000).toFixed(1)}k</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm p-4 rounded-xl border border-white/10 flex justify-between">
              <div>
                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">Margen Real</p>
                <p className="text-xl font-black text-amber-400">{metrics.marginPercent.toFixed(1)}%</p>
              </div>
              <div className="w-px bg-white/10 mx-3" />
              <div>
                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">Catálogo</p>
                <p className="text-xl font-black text-indigo-400">{metrics.globalCatalogMarginPercent ? metrics.globalCatalogMarginPercent.toFixed(1) + '%' : 'N/A'}</p>
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm p-4 rounded-xl border border-white/10">
              <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1 flex items-center gap-1"><Hash className="w-3 h-3" />Tickets</p>
              <p className="text-xl font-black text-white">{metrics.totalTransactions}</p>
            </div>
          </div>
        )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 space-y-6">
          {activeTab === 'overview' && <OverviewTab metrics={metrics} onOpenReportModal={() => setIsReportModalOpen(true)} />}
          {activeTab === 'time' && <TimeTab key={globalDateRange.filterType} metrics={metrics} timeGrouping={timeGrouping} setTimeGrouping={setTimeGrouping} onDrillDown={handleDrillDown} />}
          {activeTab === 'labs' && <LabsTab metrics={metrics} />}
          {activeTab === 'lupa' && <LupaTab ventas={ventas} inventario={inventario} preSearch={lupaPreSearch} onClearPreSearch={() => setLupaPreSearch('')} />}
          {activeTab === 'cierres' && metrics && <CierresTab sessionSummaries={metrics.sessionSummaries} comparisons={cierresComparisons} setComparisons={setCierresComparisons} />}
          
          {activeTab === 'staff' && metrics && (
            <div className="bg-white rounded-xl p-5 text-slate-900 shadow-sm border border-slate-100">
              <h3 className="font-black text-lg mb-6 flex items-center gap-2"><Hash className="w-5 h-5 text-indigo-500" /> Rendimiento del Personal</h3>
              <div className="space-y-4">
                {metrics.staffData.map((staff, i) => (
                  <div key={staff.name} className="flex flex-col sm:flex-row sm:items-center gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <div className="flex items-center gap-4 min-w-50">
                      <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-black text-lg">{i + 1}</div>
                      <div>
                        <p className="font-black text-slate-800">{staff.name}</p>
                        <p className="text-xs text-slate-500 font-bold">{staff.txs} tickets procesados</p>
                      </div>
                    </div>
                    <div className="flex-1 grid grid-cols-2 gap-4">
                      <div className="bg-white p-3 rounded-lg border border-slate-200">
                        <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Facturación Total</p>
                        <p className="font-black text-lg text-slate-800">C$ {staff.revenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                      </div>
                      <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-100">
                        <p className="text-[10px] uppercase font-bold text-emerald-600 mb-1">Margen Generado</p>
                        <p className="font-black text-lg text-emerald-700">C$ {staff.margin.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'alerts' && (
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div>
                  <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
                    <AlertTriangle className="w-6 h-6 text-rose-500" /> Centro de Anomalías
                  </h3>
                  <p className="text-sm text-slate-500 mt-1">Alertas detectadas en tiempo real en tu inventario local.</p>
                </div>
              </div>
              {alerts.length === 0 ? (
                <div className="text-center py-12 bg-emerald-50 rounded-xl border border-emerald-100">
                  <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <AlertTriangle className="w-6 h-6 text-emerald-600" />
                  </div>
                  <p className="font-bold text-emerald-800">Todo en orden</p>
                  <p className="text-sm text-emerald-600/80">No se detectaron anomalías en costos ni quiebres críticos de stock.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {alerts.map(a => (
                    <div key={a.id} className={cn("p-4 rounded-xl border flex items-start gap-4", a.type === 'error' ? 'bg-rose-50 border-rose-100' : 'bg-amber-50 border-amber-100')}>
                      <div className={cn("p-2 rounded-lg shrink-0", a.type === 'error' ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-600')}>
                        <AlertTriangle className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-slate-900 truncate">{a.title}</p>
                        <p className={cn("text-sm mt-1", a.type === 'error' ? 'text-rose-700' : 'text-amber-700')}>{a.message}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs font-bold text-slate-400">
                          <span>Detectado a las {new Date(a.timestamp).toLocaleTimeString()}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'restock' && (
            <SmartRestock inventario={inventario} ventas={ventas} productos={productos} onAddToCart={onAddToCart} />
          )}
        </div>

        <div className="lg:col-span-1 bg-slate-900 rounded-2xl p-5 shadow-lg text-white space-y-4 sticky top-6">
          <div className="flex items-center gap-2 mb-2 pb-3 border-b border-white/10">
            <Sparkles className="w-5 h-5 text-indigo-400" />
            <h3 className="font-black text-lg text-white">Axia AI Insights</h3>
          </div>
          
          <div className="bg-white/10 p-4 rounded-xl border border-rose-500/30 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-rose-500" />
            <p className="text-xs font-bold text-rose-400 mb-1">Alerta de Rentabilidad</p>
            <p className="text-sm text-slate-300 leading-snug">
              Aunque <strong className="text-white">{metrics.topMovers?.[0]?.name || 'tu producto de alta rotación'}</strong> genera mayor volumen, <strong className="text-white">{metrics.topMargin?.[0]?.name || 'otro producto'}</strong> ofrece un mejor margen neto. Prioriza su empuje en mostrador.
            </p>
          </div>

          <div className="bg-white/10 p-4 rounded-xl border border-emerald-500/30 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500" />
            <p className="text-xs font-bold text-emerald-400 mb-1">Resumen Operativo</p>
            <p className="text-sm text-slate-300 leading-snug">
              El margen de ganancia se mantiene en <strong className="text-white">{(metrics.marginPercent || 0).toFixed(1)}%</strong> sobre tus transacciones recientes.
            </p>
          </div>
        </div>
      </div>
      </div>

      <ReportExportModal 
        isOpen={isReportModalOpen} 
        onClose={() => setIsReportModalOpen(false)} 
        reportStartDate={reportStartDate}
        setReportStartDate={setReportStartDate}
        reportEndDate={reportEndDate}
        setReportEndDate={setReportEndDate}
      />
      
      {/* PRINTABLE COMPONENT */}
      <PrintableReport ventas={ventas} inventario={inventario} startDate={reportStartDate} endDate={reportEndDate} />
    </div>
  );
}
