import { TrendingUp, DollarSign, Download } from 'lucide-react';

interface OverviewTabProps {
  metrics: any;
  onOpenReportModal: () => void;
}

export default function OverviewTab({ metrics, onOpenReportModal }: OverviewTabProps) {
  if (!metrics) return null;
  
  return (
    <>
      <div className="flex justify-end mb-4">
        <button onClick={onOpenReportModal} className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-bold flex items-center gap-2 transition-colors shadow-sm">
          <Download className="w-4 h-4" /> Generar Reporte Gerencial
        </button>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-5 text-slate-900 shadow-sm border border-slate-100">
          <h3 className="font-black text-lg mb-4 flex items-center gap-2"><TrendingUp className="w-5 h-5 text-rose-500" /> Alta Rotación (Unidades)</h3>
          <div className="space-y-2.5">
            {metrics.topMovers.map((p: any, i: number) => (
              <div key={p.fullName} className="flex justify-between items-center border-b border-slate-50 pb-2">
                <div className="flex items-center gap-3">
                  <span className="text-slate-300 font-black w-5 text-right">{i + 1}</span>
                  <div><p className="font-bold text-sm">{p.name}</p></div>
                </div>
                <span className="font-black bg-rose-50 text-rose-600 px-2 py-1 rounded text-xs shrink-0">{p.qty} u.</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 text-slate-900 shadow-sm border border-slate-100">
          <h3 className="font-black text-lg mb-4 flex items-center gap-2"><DollarSign className="w-5 h-5 text-emerald-500" /> Reyes del Margen (Ganancia)</h3>
          <div className="space-y-2.5">
            {metrics.topMargin.map((p: any, i: number) => (
              <div key={p.fullName} className="flex justify-between items-center border-b border-slate-50 pb-2">
                <div className="flex items-center gap-3">
                  <span className="text-slate-300 font-black w-5 text-right">{i + 1}</span>
                  <p className="font-bold text-sm">{p.name}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-bold text-xs text-slate-400">
                    {p.revenue > 0 ? ((p.margin / p.revenue) * 100).toFixed(1) : 0}%
                  </span>
                  <span className="font-black text-emerald-600 text-sm bg-emerald-50 px-2 py-0.5 rounded">C$ {p.margin.toFixed(0)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
