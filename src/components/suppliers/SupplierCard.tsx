import { Building2, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { Proveedor, FacturaCompra } from '../../types';

interface SupplierCardProps {
  proveedor: Proveedor;
  facturas: FacturaCompra[];
  onClick: () => void;
}

export function SupplierCard({ proveedor, facturas, onClick }: SupplierCardProps) {
  const totalComprado = facturas.reduce((acc, f) => acc + f.monto_total, 0);
  const facturasPendientes = facturas.filter(f => f.estado === 'pendiente');
  const facturasVencidas = facturas.filter(f => f.estado === 'vencida' || (f.estado === 'pendiente' && f.fecha_vencimiento && new Date(f.fecha_vencimiento) < new Date()));
  const totalPendiente = facturasPendientes.reduce((acc, f) => acc + f.monto_total, 0);

  return (
    <div 
      onClick={onClick}
      className={cn(
        "bg-white rounded-2xl border p-5 transition-all cursor-pointer hover:shadow-lg group",
        facturasVencidas.length > 0 ? "border-rose-200 hover:border-rose-300" : "border-slate-200 hover:border-violet-300"
      )}
    >
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 group-hover:text-violet-600 transition-colors">
            {proveedor.nombre}
            {!proveedor.activo && <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full uppercase tracking-wider font-semibold">Inactivo</span>}
          </h3>
          {proveedor.numero_cliente && (
            <p className="text-xs text-slate-500 font-medium">Cliente #: {proveedor.numero_cliente}</p>
          )}
        </div>
        <div className={cn(
          "p-2 rounded-xl",
          facturasVencidas.length > 0 ? "bg-rose-50 text-rose-500" : "bg-slate-50 text-slate-400 group-hover:bg-violet-50 group-hover:text-violet-500"
        )}>
          {facturasVencidas.length > 0 ? <AlertTriangle className="w-5 h-5" /> : <Building2 className="w-5 h-5" />}
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex justify-between items-center text-sm">
          <span className="text-slate-500">Total Comprado</span>
          <span className="font-semibold text-slate-700">C$ {totalComprado.toLocaleString('es-NI')}</span>
        </div>
        
        {totalPendiente > 0 && (
          <div className="flex justify-between items-center text-sm">
            <span className="text-slate-500">Pendiente de Pago</span>
            <span className={cn("font-bold", facturasVencidas.length > 0 ? "text-rose-600" : "text-amber-600")}>
              C$ {totalPendiente.toLocaleString('es-NI')}
            </span>
          </div>
        )}

        {/* Badges and Tags */}
        <div className="pt-3 mt-3 border-t border-slate-100 flex flex-wrap gap-2">
          {proveedor.tipo_precio && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 text-[10px] font-bold uppercase tracking-wider rounded-lg">
              {proveedor.tipo_precio.replace('_', ' ')}
            </span>
          )}
          {proveedor.tiene_bonificacion && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-bold uppercase tracking-wider rounded-lg">
              <CheckCircle2 className="w-3 h-3" />
              Bonifica
            </span>
          )}
          {facturasVencidas.length > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-rose-100 text-rose-700 text-[10px] font-bold uppercase tracking-wider rounded-lg animate-pulse">
              {facturasVencidas.length} Vencida{facturasVencidas.length !== 1 ? 's' : ''}
            </span>
          )}
          {proveedor.dias_credito && (
             <span className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 text-slate-600 text-[10px] font-bold uppercase tracking-wider rounded-lg">
               <Clock className="w-3 h-3" />
               {proveedor.dias_credito} días
             </span>
          )}
        </div>
      </div>
    </div>
  );
}
