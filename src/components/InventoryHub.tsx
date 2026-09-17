import { useState } from 'react';
import { Search, ClipboardList, AlertCircle } from 'lucide-react';
import { cn } from '../lib/utils';
import type { UnifiedProduct, SupplierOffer, NivelPrioridad, OdooInventario, VentaHistorica } from '../types';

import Catalog from './Catalog';
import ProformaBuilder from './ProformaBuilder';
import DeadStock from './DeadStock';

interface InventoryHubProps {
  productos: UnifiedProduct[];
  inventario: OdooInventario[];
  ventas: VentaHistorica[];
  isLoadingCatalog: boolean;
  selectedNivel: NivelPrioridad | null;
  setSelectedNivel: (nivel: NivelPrioridad | null) => void;
  onAddToCart: (product: UnifiedProduct, offer: SupplierOffer, quantity?: number) => void;
  onEditProduct: (p: UnifiedProduct, o: SupplierOffer) => void;
}

export default function InventoryHub({ 
  productos, inventario, ventas, 
  isLoadingCatalog, selectedNivel, setSelectedNivel, 
  onAddToCart, onEditProduct 
}: InventoryHubProps) {
  const [activeTab, setActiveTab] = useState<'catalog' | 'proforma' | 'deadstock'>('catalog');

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-20">
      
      <div className="bg-white rounded-2xl p-2 shadow-sm border border-slate-200 flex flex-col sm:flex-row gap-2">
        <button 
          onClick={() => setActiveTab('catalog')} 
          className={cn("flex-1 px-4 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all", activeTab === 'catalog' ? "bg-violet-600 text-white shadow-md shadow-violet-500/25" : "text-slate-500 hover:bg-slate-50")}
        >
          <Search className="w-4 h-4" /> Catálogo de Proveedores
        </button>
        <button 
          onClick={() => setActiveTab('proforma')} 
          className={cn("flex-1 px-4 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all", activeTab === 'proforma' ? "bg-violet-600 text-white shadow-md shadow-violet-500/25" : "text-slate-500 hover:bg-slate-50")}
        >
          <ClipboardList className="w-4 h-4" /> Botiquín Empresarial
        </button>
        <button 
          onClick={() => setActiveTab('deadstock')} 
          className={cn("flex-1 px-4 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all", activeTab === 'deadstock' ? "bg-violet-600 text-white shadow-md shadow-violet-500/25" : "text-slate-500 hover:bg-slate-50")}
        >
          <AlertCircle className="w-4 h-4" /> Inventario & Promoción
        </button>
      </div>

      <div className="bg-slate-50/50 rounded-2xl">
        {activeTab === 'catalog' && (
          <Catalog 
            productos={productos} 
            isLoading={isLoadingCatalog} 
            selectedNivel={selectedNivel} 
            setSelectedNivel={setSelectedNivel} 
            onAddToCart={onAddToCart} 
            onEditProduct={onEditProduct} 
          />
        )}
        {activeTab === 'proforma' && (
          <ProformaBuilder inventario={inventario} />
        )}
        {activeTab === 'deadstock' && (
          <DeadStock inventario={inventario} ventas={ventas} />
        )}
      </div>

    </div>
  );
}
