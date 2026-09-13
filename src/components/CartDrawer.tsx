import { useState } from 'react';
import { ShoppingCart, X, Plus, Minus, Gift, Phone, FileSpreadsheet, Package, Trash2, FileText, Sparkles, Loader2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { cn, exportCartToCSV, generateWhatsAppMessage } from '../lib/utils';
import { generatePurchaseOrderPDF } from '../lib/pdf';
import { auditOrder, type OrderAuditResult } from '../lib/ai';
import type { CartItem, PurchaseOrderItem } from '../types';
import { supabase } from '../supabase';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  updateQuantity: (index: number, delta: number) => void;
  clearProviderCart: (provider: string) => void;
}

export default function CartDrawer({ isOpen, onClose, cart, updateQuantity, clearProviderCart }: CartDrawerProps) {
  const [auditState, setAuditState] = useState<{ provider: string; result: OrderAuditResult | null; loading: boolean } | null>(null);

  const total = cart.reduce((a, c) => a + (c.quantity * c.selectedOffer.netPrice), 0);

  // Group cart items by provider
  const groupedCart = cart.reduce((acc, item, originalIndex) => {
    const prov = item.selectedOffer.provider;
    if (!acc[prov]) acc[prov] = [];
    acc[prov].push({ item, originalIndex });
    return acc;
  }, {} as Record<string, { item: CartItem, originalIndex: number }[]>);

  const handleSendOrder = async (provider: string, type: 'whatsapp' | 'csv' | 'pdf') => {
    const itemsForProvider = groupedCart[provider].map(g => g.item);
    
    // 1. Export, WhatsApp, or PDF
    if (type === 'whatsapp') {
      const msg = generateWhatsAppMessage(itemsForProvider);
      window.open(`https://wa.me/?text=${msg}`, '_blank');
    } else if (type === 'pdf') {
      await generatePurchaseOrderPDF(provider, itemsForProvider);
    } else {
      exportCartToCSV(itemsForProvider, provider);
    }

    // 2. Save Purchase Order to Supabase
    const poItems: PurchaseOrderItem[] = itemsForProvider.map(ci => ({
      productId: ci.product.id,
      productName: ci.product.name,
      providerCode: ci.selectedOffer.providerCode,
      orderedQuantity: ci.quantity,
      receivedQuantity: 0,
      netPrice: ci.selectedOffer.netPrice
    }));

    const totalProvider = itemsForProvider.reduce((a, c) => a + (c.quantity * c.selectedOffer.netPrice), 0);

    const { error } = await supabase.from('ordenes_compra').insert({
      provider,
      status: 'Pendiente',
      items: poItems,
      total: totalProvider
    });

    if (error) {
      alert('Error guardando la orden en el historial: ' + error.message);
    } else {
      // 3. Clear from cart
      clearProviderCart(provider);
      alert(`✅ Pedido de ${provider} generado y guardado en el historial de Órdenes.`);
      if (cart.length - itemsForProvider.length === 0) {
        onClose();
      }
    }
  };

  const handleAudit = async (provider: string, itemsList: { item: CartItem, originalIndex: number }[]) => {
    setAuditState({ provider, result: null, loading: true });
    
    const mappedItems = itemsList.map(i => ({
      productName: i.item.product.name,
      activeIngredient: i.item.product.activeIngredient,
      quantity: i.item.quantity,
      netPrice: i.item.selectedOffer.netPrice
    }));

    const result = await auditOrder(provider, mappedItems);
    setAuditState({ provider, result, loading: false });
  };

  return (
    <>
      {isOpen && <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50" onClick={onClose} />}
      <div className={cn("fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out flex flex-col",
        isOpen ? "translate-x-0" : "translate-x-full")}>
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-900 text-white rounded-xl shadow-md"><ShoppingCart className="w-5 h-5" /></div>
            <h2 className="text-xl font-black text-slate-900">Orden Activa</h2>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-200 rounded-full bg-white border"><X className="w-5 h-5" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 pb-32">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400">
              <ShoppingCart className="w-16 h-16 opacity-20 mb-4" />
              <p className="font-medium">El carrito está vacío</p>
              <p className="text-sm mt-1">Agrega productos desde el catálogo</p>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedCart).map(([provider, itemsList]) => {
                const providerTotal = itemsList.reduce((a, { item: c }) => a + (c.quantity * c.selectedOffer.netPrice), 0);
                
                return (
                  <div key={provider} className="bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                    {/* Provider Header */}
                    <div className="bg-slate-100/80 p-3 border-b border-slate-200 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Package className="w-4 h-4 text-slate-600" />
                        <h3 className="font-black text-slate-800 text-sm">{provider}</h3>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-xs font-bold text-slate-500 bg-white px-2 py-1 rounded-md border shadow-sm">
                          Total Interno: C$ {providerTotal.toFixed(2)}
                        </div>
                        <button onClick={() => clearProviderCart(provider)} className="p-1.5 text-rose-500 bg-rose-50 hover:bg-rose-100 rounded-md transition-colors" title="Eliminar pedido de este proveedor">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    
                    {/* Provider Items */}
                    <div className="p-3 space-y-3 bg-white">
                      {itemsList.map(({ item, originalIndex }) => {
                        const scale = item.selectedOffer.bonusScale;
                        const hitScale = scale ? Math.floor(item.quantity / scale.buy) : 0;
                        const freeItems = scale ? hitScale * scale.free : 0;

                        return (
                          <div key={`${item.product.id}-${provider}`} className="flex gap-3 border-b border-slate-50 pb-3 last:border-0 last:pb-0">
                            <div className="flex-1">
                              <h4 className="font-bold text-slate-900 text-sm leading-tight">{item.product.name}</h4>
                              <p className="text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider">Cód: {item.selectedOffer.providerCode}</p>
                              {item.selectedOffer.netPrice > 0 ? (
                                <div className="font-black text-emerald-600 text-xs">C$ {item.selectedOffer.netPrice.toFixed(2)} c/u</div>
                              ) : (
                                <div className="font-bold text-amber-600 text-[10px] bg-amber-50 inline-block px-1 rounded">Stock Disp.</div>
                              )}
                              {freeItems > 0 && <div className="mt-1 inline-flex text-[9px] bg-amber-100 text-amber-700 font-bold px-1.5 py-0.5 rounded"><Gift className="w-2.5 h-2.5 mr-1" /> +{freeItems} BONIFICADOS</div>}
                            </div>
                            <div className="flex flex-col items-end justify-between">
                              <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
                                <button onClick={() => updateQuantity(originalIndex, -item.quantity)} className="p-1 text-rose-500 hover:bg-white rounded shadow-sm bg-slate-200/50 transition-colors" title="Eliminar producto"><Trash2 className="w-3.5 h-3.5" /></button>
                                <button onClick={() => updateQuantity(originalIndex, -1)} className="p-1 text-slate-600 hover:bg-white rounded shadow-sm bg-slate-200/50 ml-1"><Minus className="w-3.5 h-3.5" /></button>
                                <span className="font-black text-slate-800 w-6 text-center text-sm">{item.quantity}</span>
                                <button onClick={() => updateQuantity(originalIndex, 1)} className="p-1 text-slate-600 hover:bg-white rounded shadow-sm bg-slate-200/50"><Plus className="w-3.5 h-3.5" /></button>
                              </div>
                              <div className="text-xs font-black text-slate-900 mt-2 bg-slate-50 px-2 py-1 rounded">C$ {(item.quantity * item.selectedOffer.netPrice).toFixed(2)}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Provider Actions */}
                    <div className="p-3 bg-slate-50 border-t border-slate-200 flex gap-2">
                      <button onClick={() => handleSendOrder(provider, 'csv')} className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg flex items-center justify-center transition-all active:scale-95" title="Exportar CSV">
                        <FileSpreadsheet className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleSendOrder(provider, 'pdf')} className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center justify-center transition-all active:scale-95" title="Generar PDF">
                        <FileText className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleAudit(provider, itemsList)} className="px-3 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg flex items-center justify-center transition-all active:scale-95 shadow-sm shadow-violet-500/30" title="Auditoría AI">
                        <Sparkles className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleSendOrder(provider, 'whatsapp')} className="flex-1 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-black flex items-center justify-center gap-2 transition-all active:scale-95 text-sm shadow-sm">
                        <Phone className="w-4 h-4" /> WhatsApp
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {cart.length > 0 && (
          <div className="p-5 border-t border-slate-100 bg-white absolute bottom-0 w-full pb-safe shadow-[0_-10px_20px_rgba(0,0,0,0.05)]">
            <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100">
              <span className="text-slate-600 font-bold text-sm">Gran Total (Interno)</span>
              <span className="text-2xl font-black text-emerald-600">C$ {total.toFixed(2)}</span>
            </div>
          </div>
        )}
      </div>

      {/* Auditoria Modal */}
      {auditState && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-60 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-violet-50/50">
              <div className="flex items-center gap-2 text-violet-700">
                <Sparkles className="w-5 h-5" />
                <h3 className="font-black">Axia AI • Auditoría de Orden</h3>
              </div>
              <button onClick={() => setAuditState(null)} className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 max-h-[80vh] overflow-y-auto">
              <div className="mb-4">
                <h2 className="text-xl font-black text-slate-900 leading-tight">Análisis para {auditState.provider}</h2>
                <p className="text-sm text-slate-500">Revisión de costos contra el mercado promedio nacional.</p>
              </div>

              {auditState.loading ? (
                <div className="py-12 flex flex-col items-center justify-center text-violet-500">
                  <Loader2 className="w-10 h-10 animate-spin mb-3" />
                  <p className="font-bold">Analizando rentabilidad de la orden...</p>
                  <p className="text-xs font-medium text-slate-400 mt-1">Comparando precios con el mercado nacional.</p>
                </div>
              ) : auditState.result ? (
                <div className="space-y-4">
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Veredicto del Auditor</h4>
                    <p className="text-sm text-slate-700 font-medium leading-relaxed">{auditState.result.analysis}</p>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
                      <h4 className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 uppercase tracking-wider mb-2">
                        <CheckCircle2 className="w-4 h-4" /> Oportunidades
                      </h4>
                      {auditState.result.goodDeals.length > 0 ? (
                        <ul className="text-sm font-medium text-emerald-900 space-y-1.5">
                          {auditState.result.goodDeals.map((item, i) => (
                            <li key={i} className="flex gap-2"><span className="text-emerald-400">•</span> {item}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-emerald-700/60 font-medium">Ningún producto destaca por estar significativamente más barato.</p>
                      )}
                    </div>

                    <div className="bg-rose-50 rounded-xl p-4 border border-rose-100">
                      <h4 className="flex items-center gap-1.5 text-xs font-bold text-rose-600 uppercase tracking-wider mb-2">
                        <AlertTriangle className="w-4 h-4" /> Sobrecostos
                      </h4>
                      {auditState.result.expensiveItems.length > 0 ? (
                        <ul className="text-sm font-medium text-rose-900 space-y-1.5">
                          {auditState.result.expensiveItems.map((item, i) => (
                            <li key={i} className="flex gap-2"><span className="text-rose-400">•</span> {item}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-rose-700/60 font-medium">No se detectaron productos caros. ¡Excelente orden!</p>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center text-slate-500">
                  <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                  <p>No se pudo generar el análisis en este momento.</p>
                  <p className="text-xs opacity-70 mt-1">Intenta de nuevo más tarde.</p>
                </div>
              )}
            </div>
            
            {!auditState.loading && (
              <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
                <button onClick={() => setAuditState(null)} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-bold text-sm transition-all active:scale-95">
                  Entendido
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
