import { Clock, TrendingUp } from 'lucide-react';
import { ComposedChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { cn } from '../../lib/utils';

interface TimeTabProps {
  metrics: any;
  timeGrouping: 'daily' | 'weekly' | 'monthly';
  setTimeGrouping: (val: 'daily' | 'weekly' | 'monthly') => void;
  onDrillDown?: (dateStr: string) => void;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const totalVenta = (data.turno1 || 0) + (data.turno2 || 0) + (data.turno3 || 0);
    return (
      <div className="bg-slate-900 text-white p-4 rounded-xl shadow-xl border border-slate-700">
        <p className="text-slate-400 text-xs font-bold mb-2">{label}</p>
        <p className="text-xl font-black mb-3 text-white">Total Venta: C$ {totalVenta.toFixed(0)}</p>
        <div className="space-y-1 text-sm font-medium">
          <p className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> Mañana: C$ {(data.turno1 || 0).toFixed(0)}</p>
          <p className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-amber-500"></span> Tarde: C$ {(data.turno2 || 0).toFixed(0)}</p>
          <p className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-blue-500"></span> Noche: C$ {(data.turno3 || 0).toFixed(0)}</p>
          <div className="h-px bg-slate-700 my-2" />
          <p className="flex items-center gap-2 text-rose-400"><span className="w-2 h-2 rounded-full bg-rose-500"></span> Margen Bruto: C$ {(data.margin || 0).toFixed(0)}</p>
        </div>
      </div>
    );
  }
  return null;
};

export default function TimeTab({ metrics, timeGrouping, setTimeGrouping, onDrillDown }: TimeTabProps) {
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
            <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f1f5f9' }} />
            <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', fontWeight: 'bold' }} />
            <Bar dataKey="turno1" stackId="a" fill="#10b981" name="Mañana" maxBarSize={50} isAnimationActive={false} cursor="pointer" onClick={(data: any) => onDrillDown && onDrillDown(data?.payload?.sessionIds && data.payload.sessionIds.length > 0 ? 'sessions:' + data.payload.sessionIds.join(',') : (data?.payload?.time || data?.time))} />
            <Bar dataKey="turno2" stackId="a" fill="#f59e0b" name="Tarde" maxBarSize={50} isAnimationActive={false} cursor="pointer" onClick={(data: any) => onDrillDown && onDrillDown(data?.payload?.sessionIds && data.payload.sessionIds.length > 0 ? 'sessions:' + data.payload.sessionIds.join(',') : (data?.payload?.time || data?.time))} />
            <Bar dataKey="turno3" stackId="a" fill="#3b82f6" name="Noche" maxBarSize={50} isAnimationActive={false} radius={[4, 4, 0, 0]} cursor="pointer" onClick={(data: any) => onDrillDown && onDrillDown(data?.payload?.sessionIds && data.payload.sessionIds.length > 0 ? 'sessions:' + data.payload.sessionIds.join(',') : (data?.payload?.time || data?.time))} />
            <Line type="monotone" dataKey="margin" stroke="#ef4444" strokeWidth={3} dot={false} name="Margen Bruto" isAnimationActive={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
