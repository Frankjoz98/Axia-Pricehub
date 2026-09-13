import { Calendar, Wallet } from 'lucide-react';

import type { AppConfig, CartItem, NivelPrioridad, VentaHistorica, PurchaseOrder } from '../types';
import { useBusinessMetrics } from '../hooks/useBusinessMetrics';
import { cn } from '../lib/utils';

interface DashboardProps {
  config: AppConfig;
  weeklySales: number;
  setWeeklySales: (v: number) => void;
  cart: CartItem[];
  ventas: VentaHistorica[];
  ordenes: PurchaseOrder[];
  onNavigate: (tab: string, nivel?: NivelPrioridad) => void;
}

export default function Dashboard({ config, weeklySales, cart, ventas, ordenes, onNavigate }: DashboardProps) {
  const { calculatedWeeklySales, flujoComercial } = useBusinessMetrics({ ventas, ordenes, weeklySales });
  const budgetTotal = calculatedWeeklySales * (config.budget_percent / 100);
  const totalSpent = cart.reduce((a, i) => a + (i.quantity * i.selectedOffer.netPrice), 0);
  
  const totalSavings = cart.reduce((a, i) => {
    if (!i.product.offers || i.product.offers.length <= 1) return a;
    const avgPrice = i.product.offers.reduce((sum, o) => sum + o.netPrice, 0) / i.product.offers.length;
    const savings = (avgPrice - i.selectedOffer.netPrice) * i.quantity;
    return a + (savings > 0 ? savings : 0);
  }, 0);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      {/* Hero Section */}
      <div className="bg-linear-to-br from-slate-900 via-slate-800 to-violet-900 rounded-4xl p-8 sm:p-12 shadow-2xl shadow-violet-900/20 text-white relative overflow-hidden border border-white/10">
        <div className="absolute top-0 right-0 p-12 opacity-10 pointer-events-none">
          <Wallet className="w-64 h-64 transform rotate-12" />
        </div>
        
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/10 rounded-full text-sm font-bold tracking-wider mb-6 border border-white/20 backdrop-blur-md text-violet-200 uppercase">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            Sistema en Línea
          </div>
          
          <h1 className="text-4xl sm:text-5xl font-black mb-4 tracking-tight leading-tight">
            Control Financiero <br/>
            <span className="text-transparent bg-clip-text bg-linear-to-r from-emerald-400 to-cyan-400">
              Inteligente
            </span>
          </h1>
          
          <p className="text-slate-300 max-w-xl text-lg font-medium leading-relaxed mb-10">
            Plataforma centralizada de abastecimiento. Encuentra el proveedor más barato, reduce el inventario inmovilizado y mejora la rentabilidad de tu farmacia.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-4xl">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/10 relative overflow-hidden">
              <span className="text-violet-200 text-sm font-bold uppercase tracking-wider block mb-1">Presupuesto Generado</span>
              <span className="text-3xl font-black text-white">C$ {budgetTotal.toFixed(2)}</span>
              {ventas.length > 0 && <p className="text-xs text-violet-300 mt-2">Basado en promedio real</p>}
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/10">
              <span className="text-violet-200 text-sm font-bold uppercase tracking-wider block mb-1">Inversión en Carrito</span>
              <span className="text-3xl font-black text-emerald-400">C$ {totalSpent.toFixed(2)}</span>
            </div>
            <div className="bg-emerald-500/20 backdrop-blur-md rounded-2xl p-5 border border-emerald-400/30 relative overflow-hidden">
              <div className="absolute -right-4 -bottom-4 opacity-20">
                <Wallet className="w-24 h-24 text-emerald-300" />
              </div>
              <span className="text-emerald-200 text-sm font-bold uppercase tracking-wider block mb-1 relative z-10">Ahorro Axia AI</span>
              <span className="text-3xl font-black text-white relative z-10">+ C$ {totalSavings.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions & Flujo Comercial */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <h2 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2">
            <Calendar className="w-6 h-6 text-violet-600" />
            Planificación de Pedidos
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <button onClick={() => onNavigate('catalog', 1)} className="group bg-white border border-slate-200 hover:border-emerald-300 p-6 rounded-4xl flex flex-col items-center justify-center gap-4 hover:shadow-xl hover:shadow-emerald-500/10 transition-all active:scale-[0.98]">
              <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform group-hover:bg-emerald-500 group-hover:text-white shadow-sm">
                <Calendar className="w-8 h-8" />
              </div>
              <div className="text-center">
                <h3 className="font-black text-slate-800 text-lg">Lunes (N1)</h3>
                <p className="text-sm font-medium text-slate-500 mt-1">Alta Rotación</p>
              </div>
            </button>
            
            <button onClick={() => onNavigate('catalog', 2)} className="group bg-white border border-slate-200 hover:border-amber-300 p-6 rounded-4xl flex flex-col items-center justify-center gap-4 hover:shadow-xl hover:shadow-amber-500/10 transition-all active:scale-[0.98]">
              <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-110 transition-transform group-hover:bg-amber-500 group-hover:text-white shadow-sm">
                <Calendar className="w-8 h-8" />
              </div>
              <div className="text-center">
                <h3 className="font-black text-slate-800 text-lg">Miércoles (N2)</h3>
                <p className="text-sm font-medium text-slate-500 mt-1">Crónicos</p>
              </div>
            </button>

            <button onClick={() => onNavigate('catalog', 3)} className="group bg-white border border-slate-200 hover:border-blue-300 p-6 rounded-4xl flex flex-col items-center justify-center gap-4 hover:shadow-xl hover:shadow-blue-500/10 transition-all active:scale-[0.98]">
              <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform group-hover:bg-blue-500 group-hover:text-white shadow-sm">
                <Calendar className="w-8 h-8" />
              </div>
              <div className="text-center">
                <h3 className="font-black text-slate-800 text-lg">Viernes (N3)</h3>
                <p className="text-sm font-medium text-slate-500 mt-1">Baja Rotación</p>
              </div>
            </button>
          </div>
        </div>

        <div>
          <h2 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2">
            <Wallet className="w-6 h-6 text-emerald-600" />
            Flujo Mensual
          </h2>
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col gap-6">
            <div className="flex justify-between items-end border-b border-slate-100 pb-4">
              <div>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Total Vendido</p>
                <p className="text-2xl font-black text-slate-800">C$ {(flujoComercial.vendido).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits:2})}</p>
              </div>
              <div className="text-right">
                <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Total Comprado</p>
                <p className="text-2xl font-black text-emerald-600">C$ {(flujoComercial.comprado).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits:2})}</p>
              </div>
            </div>

            <div className="space-y-4">
               <div>
                  <div className="flex justify-between text-sm font-bold mb-2">
                    <span className="text-slate-600">Ratio Compras/Ventas</span>
                    <span className={flujoComercial.ratio > 75 ? "text-rose-600" : "text-emerald-600"}>{flujoComercial.ratio.toFixed(1)}%</span>
                  </div>
                  <div className="h-3 bg-slate-100 rounded-full overflow-hidden flex">
                    <div className={cn("h-full", flujoComercial.ratio > 75 ? "bg-rose-500" : "bg-emerald-500")} style={{width: `${Math.min(100, flujoComercial.ratio)}%`}}></div>
                  </div>
                  <p className="text-[10px] text-slate-400 font-medium mt-1">El nivel óptimo no debería superar el {(config.budget_percent).toFixed(1)}%.</p>
               </div>

               {flujoComercial.varianza !== 0 && (
                 <div className={cn("p-3 rounded-xl border text-sm font-bold flex justify-between", flujoComercial.varianza > 0 ? "bg-rose-50 border-rose-100 text-rose-700" : "bg-emerald-50 border-emerald-100 text-emerald-700")}>
                    <span>Varianza Compras:</span>
                    <span>{flujoComercial.varianza > 0 ? "+" : "-"} C$ {Math.abs(flujoComercial.varianza).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits:2})}</span>
                 </div>
               )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
