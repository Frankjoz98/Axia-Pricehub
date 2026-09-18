import { X, Printer, Calendar } from 'lucide-react';
import { toLocalYMD } from '../../lib/dates';

interface ReportExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportStartDate: string;
  setReportStartDate: (date: string) => void;
  reportEndDate: string;
  setReportEndDate: (date: string) => void;
}

export default function ReportExportModal({
  isOpen, onClose,
  reportStartDate, setReportStartDate,
  reportEndDate, setReportEndDate
}: ReportExportModalProps) {

  if (!isOpen) return null;

  const handlePrint = () => {
    onClose();
    setTimeout(() => {
      window.print();
    }, 500);
  };

  const setPresetRange = (preset: 'week' | 'month' | 'current_month') => {
    const today = new Date();
    setReportEndDate(toLocalYMD(today));
    if (preset === 'week') {
      const past = new Date(today);
      past.setDate(past.getDate() - 7);
      setReportStartDate(toLocalYMD(past));
    } else if (preset === 'month') {
      const past = new Date(today);
      past.setMonth(past.getMonth() - 1);
      setReportStartDate(toLocalYMD(past));
    } else if (preset === 'current_month') {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      setReportStartDate(toLocalYMD(start));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm print:hidden">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
          <X className="w-6 h-6" />
        </button>
        <h3 className="text-xl font-black text-slate-900 flex items-center gap-2 mb-2">
          <Printer className="w-6 h-6 text-indigo-600" /> Exportar Reporte PDF
        </h3>
        <p className="text-sm text-slate-500 mb-6">El reporte incluirá todas las transacciones, márgenes y gráficas generadas en el período seleccionado.</p>

        <div className="space-y-4 mb-8">
          <div className="grid grid-cols-3 gap-2">
            <button onClick={() => setPresetRange('week')} className="px-2 py-2 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg">Últimos 7 días</button>
            <button onClick={() => setPresetRange('month')} className="px-2 py-2 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg">Último mes</button>
            <button onClick={() => setPresetRange('current_month')} className="px-2 py-2 text-xs font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg">Mes Actual</button>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Fecha de Inicio</label>
            <div className="relative">
              <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="date" value={reportStartDate} onChange={(e) => setReportStartDate(e.target.value)} className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Fecha de Fin</label>
            <div className="relative">
              <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="date" value={reportEndDate} onChange={(e) => setReportEndDate(e.target.value)} className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold" />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-50">Cancelar</button>
          <button onClick={handlePrint} className="px-4 py-2 rounded-xl text-sm font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md flex items-center gap-2">
            <Printer className="w-4 h-4" /> Generar y Guardar como PDF
          </button>
        </div>
      </div>
    </div>
  );
}
