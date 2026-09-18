import { useState } from 'react';
import { Search, Package, DollarSign } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import type { BusinessMetrics } from '../../hooks/useBusinessMetrics';

const COLORS = ['#10b981', '#f59e0b', '#3b82f6', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#64748b', '#f97316'];

interface LabsTabProps {
  metrics: BusinessMetrics;
}

export default function LabsTab({ metrics }: LabsTabProps) {
  const [labSearch, setLabSearch] = useState('');

  if (!metrics) return null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-white rounded-xl p-5 text-slate-900 shadow-sm border border-slate-100 lg:col-span-2">
        <div className="flex items-center justify-between mb-4">
           <h3 className="font-black text-lg flex items-center gap-2"><Search className="w-5 h-5 text-indigo-500" /> Buscador de Laboratorios</h3>
        </div>
        <div className="relative w-full max-w-md">
          <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" placeholder="Buscar laboratorio (ej. Calox, Caplin)..." value={labSearch} onChange={(e) => setLabSearch(e.target.value)} className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 font-medium" />
        </div>
      </div>

      <div className="bg-white rounded-xl p-5 text-slate-900 shadow-sm border border-slate-100">
        <h3 className="font-black text-lg mb-4 flex items-center gap-2"><Package className="w-5 h-5 text-indigo-500" /> Top Laboratorios (Ingresos)</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={metrics.brandData} layout="vertical" margin={{ left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
            <XAxis type="number" tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
            <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={100} />
            <Tooltip formatter={(v) => `C$ ${Number(v).toFixed(0)}`} cursor={{ fill: '#f8fafc' }} />
            <Bar dataKey="revenue" fill="#6366f1" radius={[0, 4, 4, 0]} name="Ingresos" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white rounded-xl p-5 text-slate-900 shadow-sm border border-slate-100">
        <h3 className="font-black text-lg mb-4 flex items-center gap-2"><DollarSign className="w-5 h-5 text-emerald-500" /> Top Laboratorios (Margen Promedio)</h3>
        <div className="space-y-3 max-h-100 overflow-y-auto pr-2">
          {metrics.allBrandsData.filter(b => b.fullName.toLowerCase().includes(labSearch.toLowerCase())).slice(0, 50).map((b, i) => (
            <div key={b.name} className="flex justify-between items-center p-3 bg-white border border-slate-100 rounded-xl hover:bg-slate-50 transition-colors">
              <div className="flex items-center gap-3">
                <span className="text-slate-300 font-black w-5 text-right">{i + 1}</span>
                <div>
                  <p className="font-bold text-slate-900">{b.fullName}</p>
                  <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Ingreso: C$ {(b.revenue/1000).toFixed(1)}k</p>
                </div>
              </div>
              <div className="flex gap-4 text-right">
                <div>
                  <span className="block font-black text-amber-500 text-base lg:text-lg">{b.marginPercent.toFixed(2)}%</span>
                  <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Margen Real<br/>(Volumen)</span>
                </div>
                <div className="w-px bg-slate-200" />
                <div>
                  <span className="block font-black text-indigo-500 text-base lg:text-lg">{b.catalogMarginPercent ? b.catalogMarginPercent.toFixed(2) + '%' : 'N/A'}</span>
                  <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Prom. Simple<br/>(Catálogo)</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl p-5 text-slate-900 shadow-sm border border-slate-100 lg:col-span-2">
         <h3 className="font-black text-lg mb-4 text-center">Distribución de Márgenes por Laboratorio (Gráfica)</h3>
         <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie data={metrics.brandData} dataKey="margin" nameKey="name" cx="50%" cy="50%" outerRadius={110} label={false} labelLine={false} fontSize={12} stroke="none">
              {metrics.brandData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Pie>
            <Tooltip formatter={(v, _name, props) => [`C$ ${Number(v).toFixed(0)} (${Number((props.payload as { marginPercent?: number })?.marginPercent ?? 0).toFixed(1)}%)`, 'Ganancia Neta']} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
