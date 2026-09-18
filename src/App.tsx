import { useState } from 'react';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { ShoppingCart, Wallet, Home, Settings, BarChart3, Package, LogOut, Truck, Calendar } from 'lucide-react';
import { cn } from './lib/utils';
import { supabase } from './supabase';
import type { UnifiedProduct, SupplierOffer, NivelPrioridad } from './types';

import { useAppContext } from './context/AppContext';
import { useCart } from './context/CartContext';

import LoginScreen from './components/LoginScreen';
import Dashboard from './components/Dashboard';
import InventoryHub from './components/InventoryHub';
import IntelligenceHub from './components/IntelligenceHub';
import SettingsPanel from './components/SettingsPanel';
import CartDrawer from './components/CartDrawer';
import ProductEditor from './components/ProductEditor';
import OrdersPanel from './components/OrdersPanel';
import { SupplierHub } from './components/suppliers/SupplierHub';
import AgendaHub from './components/AgendaHub';
import PedidosTerminal from './components/pedidos/PedidosTerminal';
import DoctorPortal from './components/DoctorPortal';

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = location.pathname.split('/')[1] || 'home';

  const { 
    session, rol, isCheckingAuth, config, 
    productos, ventas, inventario, ordenes, 
    isLoadingCatalog,
    weeklySales, setWeeklySales, setConfig, setOrdenes, refreshData 
  } = useAppContext();

  const { cart, isCartOpen, setIsCartOpen, updateQuantity, handleReopenOrder, addToCart, clearProviderCart } = useCart();

  // Local UI states
  const [selectedNivel, setSelectedNivel] = useState<NivelPrioridad | null>(null);
  const [editingProduct, setEditingProduct] = useState<UnifiedProduct | null>(null);
  const [editingOffer, setEditingOffer] = useState<SupplierOffer | null>(null);

  const handleNavigate = (path: string, nivel?: NivelPrioridad) => {
    navigate(`/${path}`);
    if (nivel !== undefined) setSelectedNivel(nivel);
  };

  const activeTab = currentPath;

  // === BUDGET CALC ===
  const budgetTotal = weeklySales * (config.budget_percent / 100);
  const totalSpent = cart.reduce((a, i) => a + (i.quantity * i.selectedOffer.netPrice), 0);

  // === RENDER ===
  if (isCheckingAuth) {
    return <div className="min-h-screen bg-slate-900 flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500" /></div>;
  }

  // === RUTAS PÚBLICAS SIN AUTENTICACIÓN ===
  if (currentPath === 'portal-medico') {
    return (
      <Routes>
        <Route path="/portal-medico" element={<DoctorPortal />} />
      </Routes>
    );
  }

  // === AUTENTICACIÓN REQUERIDA ===
  if (!session) return <LoginScreen />;

  // Aislamiento visual del rol caja. La seguridad real vive en RLS (perfiles + auth_rol()).
  const isCajaUser = rol === 'caja';

  if (isCajaUser || currentPath === 'pedidos') {
    return (
      <Routes>
        <Route path="*" element={<PedidosTerminal />} />
      </Routes>
    );
  }

  return (
    <div className="min-h-screen flex flex-col font-sans bg-slate-50 pb-16">
      {/* Header */}
      <header className="bg-white text-slate-900 sticky top-0 z-40 border-b border-slate-200 shadow-sm print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/axia_logo.png" alt="Axia Logo" className="h-8 sm:h-10 w-auto object-contain" />
            <h1 className="text-xl font-black hidden sm:block text-slate-300">|<span className="text-violet-600 ml-2">PriceHub</span></h1>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex text-sm items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-200">
              <Wallet className="w-4 h-4 text-violet-500" />
              <span className="text-slate-500 font-medium">Presupuesto:</span> <strong className={cn(budgetTotal - totalSpent < 0 ? "text-rose-500" : "text-slate-900")}>C$ {(budgetTotal - totalSpent).toFixed(0)}</strong>
            </div>
            
            <button onClick={() => handleNavigate('orders')} className={cn("p-2 rounded-full transition-colors hidden sm:block", activeTab === 'orders' ? "text-violet-600 bg-violet-50" : "text-slate-400 hover:text-violet-600 hover:bg-violet-50")} title="Pedidos">
              <Package className="w-5 h-5" />
            </button>
            <button onClick={() => handleNavigate('settings')} className={cn("p-2 rounded-full transition-colors", activeTab === 'settings' ? "text-violet-600 bg-violet-50" : "text-slate-400 hover:text-violet-600 hover:bg-violet-50")} title="Ajustes">
              <Settings className="w-5 h-5" />
            </button>

            <button onClick={() => setIsCartOpen(true)} className="relative p-2 bg-slate-50 border border-slate-200 hover:bg-violet-50 hover:border-violet-200 rounded-full transition-colors group">
              <ShoppingCart className="w-5 h-5 text-slate-600 group-hover:text-violet-600" />
              {cart.length > 0 && <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-violet-600 text-[10px] font-bold text-white">{cart.reduce((a, c) => a + c.quantity, 0)}</span>}
            </button>
            <button onClick={() => supabase.auth.signOut()} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-full transition-colors hidden sm:block" title="Cerrar Sesión">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className={cn("flex-1 w-full", currentPath === 'agenda' ? "max-w-full px-0 py-0" : "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6")}>
        <Routes>
          <Route path="/" element={<Navigate to="/home" replace />} />
          <Route path="/home" element={<Dashboard config={config} weeklySales={weeklySales} setWeeklySales={setWeeklySales} cart={cart} ventas={ventas} ordenes={ordenes} onNavigate={handleNavigate} />} />
          <Route path="/inventory" element={<InventoryHub productos={productos} inventario={inventario} ventas={ventas} isLoadingCatalog={isLoadingCatalog} selectedNivel={selectedNivel} setSelectedNivel={setSelectedNivel} onAddToCart={addToCart} onEditProduct={(p, o) => { setEditingProduct(p); setEditingOffer(o); }} />} />
          <Route path="/intelligence" element={<IntelligenceHub ventas={ventas} inventario={inventario} ordenes={ordenes} productos={productos} onAddToCart={addToCart} />} />
          <Route path="/agenda" element={<AgendaHub />} />
          <Route path="/orders" element={<OrdersPanel ordenes={ordenes} setOrdenes={setOrdenes} onReopenOrder={(order) => handleReopenOrder(order, productos)} />} />
          <Route path="/suppliers" element={<SupplierHub />} />
          <Route path="/settings" element={<SettingsPanel config={config} setConfig={setConfig} productos={productos} ventas={ventas} inventario={inventario} onRefreshCatalog={refreshData} onRefreshVentas={refreshData} onRefreshInventario={refreshData} onClearCart={() => {}} />} />
          <Route path="*" element={<Navigate to="/home" replace />} />
        </Routes>
      </main>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200 z-40 shadow-[0_-4px_30px_rgba(0,0,0,0.08)] print:hidden" style={{paddingBottom: 'env(safe-area-inset-bottom)'}}>
        <div className="flex justify-around items-center h-17 max-w-lg mx-auto">
          {[
            { id: 'home', icon: Home, label: 'Resumen' },
            { id: 'inventory', icon: Package, label: 'Inventario' },
            { id: 'agenda', icon: Calendar, label: 'Agenda' },
            { id: 'intelligence', icon: BarChart3, label: 'Inteligencia' },
            { id: 'suppliers', icon: Truck, label: 'Proveedores' },
          ].map(v => (
            <button key={v.id} onClick={() => handleNavigate(v.id)}
              className="flex flex-col items-center justify-center gap-1 flex-1 h-full relative group">
              <div className={cn(
                "flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-all duration-200",
                activeTab === v.id
                  ? "text-violet-600 bg-violet-50"
                  : "text-slate-400 group-hover:text-slate-600"
              )}>
                <v.icon className={cn("transition-all duration-200", activeTab === v.id ? "w-6 h-6" : "w-5 h-5")} />
                <span className={cn("text-[10px] font-bold tracking-wide uppercase", activeTab === v.id ? "text-violet-600" : "")}>{v.label}</span>
              </div>
              {activeTab === v.id && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-violet-600 rounded-b-full" />
              )}
            </button>
          ))}
        </div>
      </nav>

      {/* Cart Drawer */}
      <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} cart={cart} updateQuantity={updateQuantity} clearProviderCart={clearProviderCart} />

      {/* Product Editor Modal */}
      {editingProduct && editingOffer && (
        <ProductEditor product={editingProduct} initialOffer={editingOffer} onClose={() => { setEditingProduct(null); setEditingOffer(null); }} onSaved={refreshData} />
      )}
    </div>
  );
}
