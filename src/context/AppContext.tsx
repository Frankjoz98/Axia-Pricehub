import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { supabase } from '../supabase';
import { api } from '../services/api';
import type { UnifiedProduct, VentaHistorica, OdooInventario, PurchaseOrder, AppConfig, Proveedor, FacturaCompra } from '../types';

interface AppContextType {
  session: any;
  isCheckingAuth: boolean;
  productos: UnifiedProduct[];
  ventas: VentaHistorica[];
  inventario: OdooInventario[];
  ordenes: PurchaseOrder[];
  config: AppConfig;
  proveedores: Proveedor[];
  facturas: FacturaCompra[];
  isLoadingCatalog: boolean;
  isLoadingVentas: boolean;
  weeklySales: number;
  setWeeklySales: (val: number) => void;
  setConfig: (config: AppConfig) => void;
  setOrdenes: (ordenes: PurchaseOrder[]) => void;
  setProveedores: (proveedores: Proveedor[]) => void;
  setFacturas: (facturas: FacturaCompra[]) => void;
  refreshData: () => Promise<void>;
}

const DEFAULT_CONFIG: AppConfig = {
  id: 'global',
  budget_percent: 71.15,
  nivel1_percent: 65,
  nivel2_percent: 25,
  nivel3_percent: 10,
  nombre_farmacia: 'Axia Farmacia 24/7',
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<any>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  const [productos, setProductos] = useState<UnifiedProduct[]>([]);
  const [ventas, setVentas] = useState<VentaHistorica[]>([]);
  const [inventario, setInventario] = useState<OdooInventario[]>([]);
  const [ordenes, setOrdenes] = useState<PurchaseOrder[]>([]);
  const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG);
  
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [facturas, setFacturas] = useState<FacturaCompra[]>([]);
  
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(false);
  const [isLoadingVentas, setIsLoadingVentas] = useState(false);
  const [weeklySales, setWeeklySales] = useState<number>(() => Number(localStorage.getItem('axia_weekly_sales')) || 49000);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsCheckingAuth(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setSession(session));
    return () => subscription.unsubscribe();
  }, []);

  const refreshData = async () => {
    if (!session) return;
    
    setIsLoadingCatalog(true);
    setIsLoadingVentas(true);

    try {
      const [catalogData, ventasData, invData, ordData, configData, provData, facData] = await Promise.all([
        api.fetchCatalog(),
        api.fetchVentas(),
        api.fetchInventario(),
        api.fetchOrdenes(),
        api.fetchConfig(),
        api.fetchProveedores(),
        api.fetchFacturas()
      ]);

      setProductos(catalogData);
      setVentas(ventasData);
      setInventario(invData);
      setOrdenes(ordData);
      if (configData) setConfig(configData);
      setProveedores(provData);
      setFacturas(facData);
    } catch (error) {
      console.error('Error fetching data', error);
    } finally {
      setIsLoadingCatalog(false);
      setIsLoadingVentas(false);
    }
  };

  useEffect(() => {
    if (session) {
      refreshData();
    }
  }, [session]);

  useEffect(() => {
    localStorage.setItem('axia_weekly_sales', weeklySales.toString());
  }, [weeklySales]);

  return (
    <AppContext.Provider value={{
      session, isCheckingAuth,
      productos, ventas, inventario, ordenes, config, proveedores, facturas,
      isLoadingCatalog, isLoadingVentas,
      weeklySales, setWeeklySales, setConfig, setOrdenes,
      setProveedores,
      setFacturas,
      refreshData
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
}
