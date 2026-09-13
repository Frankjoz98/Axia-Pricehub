import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useAppContext } from './AppContext';
import { AlertTriangle, X } from 'lucide-react';
import { cn } from '../lib/utils';

export type AlertType = 'error' | 'warning' | 'info';

export interface AppAlert {
  id: string;
  type: AlertType;
  title: string;
  message: string;
  timestamp: Date;
}

interface AlertsContextType {
  alerts: AppAlert[];
  dismissAlert: (id: string) => void;
}

const AlertsContext = createContext<AlertsContextType | undefined>(undefined);

export function AlertsProvider({ children }: { children: ReactNode }) {
  const { inventario, ventas } = useAppContext();
  const [alerts, setAlerts] = useState<AppAlert[]>([]);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!inventario || inventario.length === 0) return;

    const newAlerts: AppAlert[] = [];

    // 1. Detección de márgenes negativos (Costo > Precio)
    const marginsInRed = inventario.filter(p => p.costo > p.precio && p.precio > 0);
    if (marginsInRed.length > 0) {
      newAlerts.push({
        id: 'margin-alert',
        type: 'error',
        title: 'Márgenes en Rojo Detectados',
        message: `${marginsInRed.length} productos tienen un costo superior a su precio de venta en el sistema.`,
        timestamp: new Date()
      });
    }

    // 2. Detección de quiebres de stock en productos de alta demanda
    // Calculamos qué productos se venden más
    if (ventas && ventas.length > 0) {
      const salesByProduct = new Map<string, number>();
      ventas.forEach(v => {
        const current = salesByProduct.get(v.odoo_id || '') || 0;
        salesByProduct.set(v.odoo_id || '', current + v.quantity);
      });

      const highDemandOutOfStock = inventario.filter(p => 
        p.stock <= 0 && (salesByProduct.get(p.odoo_id || '') || 0) > 30 // Umbral de 30 ventas históricas
      );

      if (highDemandOutOfStock.length > 0) {
        newAlerts.push({
          id: 'stockout-alert',
          type: 'warning',
          title: 'Quiebre de Stock (Alta Demanda)',
          message: `${highDemandOutOfStock.length} productos de alta rotación se han quedado sin existencias.`,
          timestamp: new Date()
        });
      }
    }

    setAlerts(newAlerts.filter(a => !dismissedIds.has(a.id)));
  }, [inventario, ventas, dismissedIds]);

  const dismissAlert = (id: string) => {
    setDismissedIds(prev => new Set(prev).add(id));
    setAlerts(prev => prev.filter(a => a.id !== id));
  };

  return (
    <AlertsContext.Provider value={{ alerts, dismissAlert }}>
      {children}
      {/* Sistema Global de Notificaciones (Toasts) */}
      <div className="fixed top-4 right-4 z-100 flex flex-col gap-3 pointer-events-none max-w-sm w-full">
        {alerts.map(alert => (
          <div key={alert.id} className={cn(
            "pointer-events-auto rounded-xl p-4 shadow-xl border-l-4 flex gap-3 animate-in slide-in-from-right-8 fade-in duration-300",
            alert.type === 'error' ? "bg-rose-50 border-rose-500 text-rose-900" :
            alert.type === 'warning' ? "bg-amber-50 border-amber-500 text-amber-900" :
            "bg-blue-50 border-blue-500 text-blue-900"
          )}>
            <div className="mt-0.5">
              <AlertTriangle className={cn(
                "w-5 h-5",
                alert.type === 'error' ? "text-rose-500" : alert.type === 'warning' ? "text-amber-500" : "text-blue-500"
              )} />
            </div>
            <div className="flex-1">
              <h4 className="font-bold text-sm leading-tight">{alert.title}</h4>
              <p className="text-xs mt-1 opacity-80">{alert.message}</p>
            </div>
            <button onClick={() => dismissAlert(alert.id)} className="p-1 hover:bg-black/5 rounded-lg h-fit transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </AlertsContext.Provider>
  );
}

export function useAlerts() {
  const context = useContext(AlertsContext);
  if (context === undefined) {
    throw new Error('useAlerts must be used within an AlertsProvider');
  }
  return context;
}
