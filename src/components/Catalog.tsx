import { useMemo, useState, useEffect } from 'react';
import { Search, ShoppingCart, Check, Gift, Edit, Filter, AlertTriangle, Sparkles, X, Loader2 } from 'lucide-react';
import { cn, removeAccents } from '../lib/utils';
import { getFichaTecnica, type FichaTecnica } from '../lib/ai';
import type { UnifiedProduct, SupplierOffer, NivelPrioridad } from '../types';

interface CatalogProps {
  productos: UnifiedProduct[];
  isLoading: boolean;
  selectedNivel: NivelPrioridad | null;
  setSelectedNivel: (n: NivelPrioridad | null) => void;
  onAddToCart: (product: UnifiedProduct, offer: SupplierOffer, qty: number) => void;
  onEditProduct: (product: UnifiedProduct, offer: SupplierOffer) => void;
}

export default function Catalog({ productos, isLoading, selectedNivel, setSelectedNivel, onAddToCart, onEditProduct }: CatalogProps) {
  const [searchQuery, setSearchQuery] = useState(() => sessionStorage.getItem('axia_search') || '');
  const [debouncedSearch, setDebouncedSearch] = useState(searchQuery);
  const [selectedProvider, setSelectedProvider] = useState<string | null>(() => sessionStorage.getItem('axia_provider') || null);

  // Ficha Tecnica State
  const [fichaData, setFichaData] = useState<{ product: UnifiedProduct; ficha: FichaTecnica | null; loading: boolean } | null>(null);

  // Extract unique providers dynamically
  const allProviders = useMemo(() => {
    const provSet = new Set<string>();
    productos.forEach(p => p.offers.forEach(o => provSet.add(o.provider)));
    return Array.from(provSet).sort();
  }, [productos]);

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      sessionStorage.setItem('axia_search', searchQuery);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Persist provider
  useEffect(() => {
    if (selectedProvider) sessionStorage.setItem('axia_provider', selectedProvider);
    else sessionStorage.removeItem('axia_provider');
  }, [selectedProvider]);

  const handleOpenFicha = async (product: UnifiedProduct) => {
    setFichaData({ product, ficha: null, loading: true });
    const ficha = await getFichaTecnica(product.id, product.name, product.activeIngredient);
    setFichaData({ product, ficha, loading: false });
  };

  const filteredProducts = useMemo(() => {
    let result = productos;
    
    // Native fast filtering using pre-computed index
    if (debouncedSearch.trim()) {
      const term = removeAccents(debouncedSearch.toLowerCase().trim());
      result = result.filter(p => p._searchIndex && p._searchIndex.includes(term));
    }
    
    if (selectedNivel) result = result.filter(p => p.nivel === selectedNivel);
    if (selectedProvider) result = result.filter(p => p.offers.some(o => o.provider === selectedProvider));
    return result;
  }, [debouncedSearch, selectedNivel, selectedProvider, productos]);

  // Strict DOM Capping: Never render more than 100 items to prevent RAM exhaustion
  const cappedProducts = filteredProducts.slice(0, 100);

  return (
    <div className="animate-in fade-in duration-300">
      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-4 h-5 w-5 text-slate-400" />
        <input type="text" className="w-full pl-10 pr-3 py-4 border border-slate-200 rounded-2xl bg-white shadow-sm focus:ring-2 focus:ring-emerald-500 outline-none"
          placeholder="Buscar medicamento..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
      </div>

      {/* Level Filters */}
      <div className="flex gap-2 mb-3 overflow-x-auto pb-2 scrollbar-hide">
        <button onClick={() => setSelectedNivel(null)} className={cn("px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all", selectedNivel === null ? "bg-slate-800 text-white shadow-lg" : "bg-white text-slate-600 border")}>Todos</button>
        <button onClick={() => setSelectedNivel(1)} className={cn("px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all", selectedNivel === 1 ? "bg-emerald-500 text-white shadow-lg" : "bg-emerald-50 text-emerald-700 border border-emerald-100")}>N1 (Lunes)</button>
        <button onClick={() => setSelectedNivel(2)} className={cn("px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all", selectedNivel === 2 ? "bg-amber-500 text-white shadow-lg" : "bg-amber-50 text-amber-700 border border-amber-100")}>N2 (Miérc)</button>
        <button onClick={() => setSelectedNivel(3)} className={cn("px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all", selectedNivel === 3 ? "bg-blue-500 text-white shadow-lg" : "bg-blue-50 text-blue-700 border border-blue-100")}>N3 (Viern)</button>
      </div>

      {/* Provider Filter */}
      <div className="flex items-center gap-2 mb-6">
        <Filter className="w-4 h-4 text-slate-400" />
        <select value={selectedProvider || ''} onChange={e => setSelectedProvider(e.target.value || null)}
          className="flex-1 px-3 py-2 border border-slate-200 rounded-xl bg-white text-sm font-medium text-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none">
          <option value="">Todos los Proveedores</option>
          {allProviders.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        {selectedProvider && <button onClick={() => setSelectedProvider(null)} className="text-xs font-bold text-rose-500 bg-rose-50 px-2 py-1 rounded-lg">Limpiar</button>}
      </div>

      {/* Products Grid */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-12 text-slate-400">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500 mb-4" />
          <p>Cargando catálogo seguro...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-10">
          {cappedProducts.map(product => {
            const sortedOffers = [...product.offers].sort((a, b) => {
              if (a.netPrice <= 0 && b.netPrice > 0) return 1;
              if (b.netPrice <= 0 && a.netPrice > 0) return -1;
              return a.netPrice - b.netPrice;
            });
            const bestOffer = sortedOffers.find(o => o.netPrice > 0) || sortedOffers[0];
            const displayOffers = selectedProvider ? sortedOffers.filter(o => o.provider === selectedProvider) : sortedOffers;

            return (
              <div key={product.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col hover:shadow-md transition-shadow">
                <div className="p-4 border-b border-slate-100 bg-slate-50/80 flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-black text-slate-900 leading-tight">{product.name}</h2>
                      <span className={cn("px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                        product.nivel === 1 ? "bg-emerald-100 text-emerald-700" :
                        product.nivel === 2 ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"
                      )}>N{product.nivel}</span>
                    </div>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">{product.activeIngredient} • {product.category}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleOpenFicha(product)}
                      className="p-2 text-violet-400 hover:text-violet-600 bg-white rounded-full border shadow-sm transition-colors" title="Ficha Técnica (Axia AI)">
                      <Sparkles className="w-4 h-4" />
                    </button>
                    <button onClick={() => onEditProduct(product, bestOffer || { provider: '', providerCode: '', basePrice: 0, discount: 0, netPrice: 0 })}
                      className="p-2 text-slate-400 hover:text-emerald-600 bg-white rounded-full border shadow-sm transition-colors" title="Editar Precios">
                      <Edit className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="p-4 flex-1 space-y-3">
                  {displayOffers.map(offer => {
                    const isBest = bestOffer && bestOffer.netPrice > 0 && offer.provider === bestOffer.provider && offer.netPrice === bestOffer.netPrice;
                    return (
                      <div key={offer.provider} className={cn("flex flex-col p-3 rounded-xl border-2 transition-all relative overflow-hidden",
                        isBest ? "bg-emerald-50 border-emerald-500 shadow-md shadow-emerald-500/20" : "bg-white shadow-xs border-slate-100 hover:border-slate-200")}>
                        {isBest && <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/10 rounded-full blur-xl -translate-y-1/2 translate-x-1/2"></div>}
                        <div className="flex items-center justify-between relative z-10">
                          <div className="flex-1">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-slate-800 text-sm">{offer.provider}</span>
                              {isBest && <span className="flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500 text-white"><Check className="w-2.5 h-2.5" /> MEJOR</span>}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono mt-0.5">Cód: {offer.providerCode}</div>
                          </div>
                          <div className="text-right mr-3">
                            {offer.netPrice > 0 ? (
                              <>
                                <div className="text-lg font-black text-slate-900 leading-none">C$ {offer.netPrice.toFixed(2)}</div>
                                {offer.discount > 0 && <div className="text-[10px] text-rose-500 font-medium line-through">C$ {offer.basePrice.toFixed(2)} (-{offer.discount}%)</div>}
                              </>
                            ) : (
                              <div className="flex flex-col items-end">
                                <span className="text-xs font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md">Consultar</span>
                                <span className="text-[10px] text-slate-400 font-medium mt-0.5">En stock</span>
                              </div>
                            )}
                          </div>
                          <button onClick={() => onAddToCart(product, offer, 1)}
                            className={cn("p-2.5 rounded-lg shrink-0 active:scale-95 transition-transform",
                              isBest ? "bg-slate-900 text-white shadow-md" : "bg-slate-100 text-slate-700 hover:bg-slate-200")}>
                            <ShoppingCart className="w-4 h-4" />
                          </button>
                        </div>
                        {offer.bonusScale && (
                          <div className="mt-2 pt-2 border-t border-dashed border-emerald-200/50 flex sm:items-center justify-between gap-2 bg-emerald-50 p-2 rounded-lg">
                            <div className="flex flex-col">
                              <span className="text-[11px] font-bold text-emerald-800 flex items-center gap-1">
                                <Gift className="w-3 h-3" /> Escala: {offer.bonusScale.buy} + {offer.bonusScale.free}
                              </span>
                              <span className="text-[10px] text-emerald-600 mt-0.5 font-medium">
                                Unitario real: <strong>C$ {((offer.bonusScale.buy * offer.netPrice) / (offer.bonusScale.buy + offer.bonusScale.free)).toFixed(2)}</strong>
                              </span>
                            </div>
                            <button onClick={() => onAddToCart(product, offer, offer.bonusScale!.buy)}
                              className="text-[11px] bg-emerald-600 text-white px-3 py-1.5 rounded font-bold sm:w-auto active:scale-95 transition-transform">
                              Aplicar
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
          {filteredProducts.length === 0 && (
            <div className="col-span-full py-16 text-center text-slate-400">
              <Search className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-bold text-lg">No se encontraron medicamentos</p>
              <p className="text-sm mt-1">Prueba con otro término de búsqueda o cambia los filtros</p>
            </div>
          )}
          {filteredProducts.length > 100 && (
            <div className="col-span-full py-8 text-center text-slate-500 bg-slate-50 border border-slate-100 rounded-2xl">
              <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-amber-500 opacity-50" />
              <p className="font-bold text-sm">Mostrando 100 de {filteredProducts.length} resultados.</p>
              <p className="text-xs mt-1">Sigue escribiendo para refinar tu búsqueda y cuidar la memoria de tu equipo.</p>
            </div>
          )}
        </div>
      )}
      {/* Ficha Tecnica Modal */}
      {fichaData && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-violet-50/50">
              <div className="flex items-center gap-2 text-violet-700">
                <Sparkles className="w-5 h-5" />
                <h3 className="font-black">Axia AI • Ficha Técnica</h3>
              </div>
              <button onClick={() => setFichaData(null)} className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6">
              <div className="mb-4">
                <h2 className="text-xl font-black text-slate-900 leading-tight">{fichaData.product.name}</h2>
                <p className="text-sm text-slate-500">{fichaData.product.activeIngredient}</p>
              </div>

              {fichaData.loading ? (
                <div className="py-8 flex flex-col items-center justify-center text-violet-500">
                  <Loader2 className="w-8 h-8 animate-spin mb-2" />
                  <p className="text-sm font-medium animate-pulse">Consultando inteligencia farmacológica...</p>
                </div>
              ) : fichaData.ficha ? (
                <div className="space-y-4">
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Para qué sirve</h4>
                    <p className="text-sm text-slate-700 leading-relaxed">{fichaData.ficha.usos}</p>
                  </div>
                  
                  <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
                    <h4 className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-1">PVP Mercado Nicaragua</h4>
                    <p className="text-lg font-black text-emerald-800">{fichaData.ficha.precio_promedio}</p>
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center text-slate-500">
                  <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                  <p>No se pudo generar la ficha técnica en este momento.</p>
                  <p className="text-xs opacity-70 mt-1">Verifica tu conexión o intenta de nuevo más tarde.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
