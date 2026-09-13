import { Clock, TrendingUp } from 'lucide-react';
import { ComposedChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { cn } from '../../lib/utils';

interface TimeTabProps {
  metrics: any;
  timeGrouping: 'daily' | 'weekly' | 'monthly';
  setTimeGrouping: (val: 'daily' | 'weekly' | 'monthly') => void;
}

export default function TimeTab({ metrics, timeGrouping, setTimeGrouping }: TimeTabProps) {
  if (!metrics) return null;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-5 text-slate-900 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-black text-lg flex items-center gap-2"><Clock className="w-5 h-5 text-orange-500" /> Horas Calientes</h3>
            <p className="text-xs text-slate-500 font-bold bg-slate-100 px-2 py-1 rounded">Basado en tickets</p>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={metrics.hourlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="hour" tick={{ fontSize: 10 }} interval={2} angle={-45} textAnchor="end" />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: any, name: any) => [name === 'revenue' ? `C$ ${Number(v).toFixed(0)}` : v, name === 'revenue' ? 'Ventas' : 'Transacciones']} cursor={{ fill: '#f8fafc' }} />
              <Bar dataKey="revenue" fill="#f97316" radius={[4, 4, 0, 0]} name="revenue" maxBarSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl p-5 text-slate-900 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-black text-lg flex items-center gap-2"><Clock className="w-5 h-5 text-indigo-500" /> Días de Mayor Venta</h3>
            <p className="text-xs text-slate-500 font-bold bg-slate-100 px-2 py-1 rounded">Ventas totales</p>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={metrics.daysData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: any, name: any) => [name === 'revenue' ? `C$ ${Number(v).toFixed(0)}` : v, name === 'revenue' ? 'Ventas' : 'Transacciones']} cursor={{ fill: '#f8fafc' }} />
              <Bar dataKey="revenue" fill="#6366f1" radius={[4, 4, 0, 0]} name="revenue" maxBarSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white rounded-xl p-5 text-slate-900 shadow-sm border border-slate-100">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <h3 className="font-black text-lg flex items-center gap-2"><TrendingUp className="w-5 h-5 text-emerald-500" /> Crecimiento Operativo</h3>
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
            {(['daily', 'weekly', 'monthly'] as const).map(t => (
              <button key={t} onClick={() => setTimeGrouping(t)} className={cn("px-3 py-1 text-xs font-bold rounded-md capitalize transition-colors", timeGrouping === t ? "bg-white text-emerald-600 shadow-sm" : "text-slate-500 hover:text-slate-700")}>
                {t === 'daily' ? 'Diario' : t === 'weekly' ? 'Semanal' : 'Mensual'}
              </button>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={300} className="overflow-hidden">
          <ComposedChart data={metrics.trendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis 
              dataKey="time" 
              tick={{ fontSize: 11 }} 
              angle={timeGrouping === 'daily' ? -45 : 0} 
              textAnchor={timeGrouping === 'daily' ? 'end' : 'middle'} 
              height={40} 
              tickFormatter={(val) => {
                if (timeGrouping === 'daily' && val.includes('-')) {
                  const parts = val.split('-');
                  if (parts.length === 3) {
                    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
                    return `${parts[2]} ${months[parseInt(parts[1]) - 1]}`;
                  }
                }
                if (timeGrouping === 'monthly' && val.includes('-')) {
                  const parts = val.split('-');
                  if (parts.length === 2) {
                    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
                    return `${months[parseInt(parts[1]) - 1]} ${parts[0]}`;
                  }
                }
                return val;
              }}
            />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
            <Tooltip 
              wrapperStyle={{ zIndex: 100 }}
              formatter={(value: any, name: any) => {
                if (name === 'turno1') return [`C$ ${Number(value).toFixed(0)}`, 'Mañana'];
                if (name === 'turno2') return [`C$ ${Number(value).toFixed(0)}`, 'Tarde'];
                if (name === 'turno3') return [`C$ ${Number(value).toFixed(0)}`, 'Noche'];
                if (name === 'margin') return [`C$ ${Number(value).toFixed(0)}`, 'Margen Bruto'];
                return [`C$ ${Number(value).toFixed(0)}`, name];
              }}
            />
            <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', fontWeight: 'bold' }} />
            <Bar dataKey="turno1" stackId="a" fill="#10b981" name="Mañana" maxBarSize={50} isAnimationActive={false} />
            <Bar dataKey="turno2" stackId="a" fill="#f59e0b" name="Tarde" maxBarSize={50} isAnimationActive={false} />
            <Bar dataKey="turno3" stackId="a" fill="#3b82f6" name="Noche" maxBarSize={50} isAnimationActive={false} radius={[4, 4, 0, 0]} />
            <Line type="monotone" dataKey="margin" stroke="#ef4444" strokeWidth={3} dot={false} name="Margen Bruto" isAnimationActive={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
