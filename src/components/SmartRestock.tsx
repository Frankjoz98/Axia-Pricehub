import { useMemo, useState } from 'react';
import type { UnifiedProduct, VentaHistorica, SupplierOffer, OdooInventario } from '../types';
import { Sparkles, ShoppingCart, TrendingUp, AlertCircle, ArrowRight, Zap, RefreshCw, Package, Minus, Plus, CheckCircle2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { buildInventarioIndex, nameKey, stripOdooRef } from '../lib/odoo';

const DAYS_TO_COVER = 15;          // Cobertura objetivo de inventario
const ANALYSIS_WINDOW_DAYS = 30;   // Ventana de ventas para estimar la velocidad diaria

interface RestockSuggestion {
  odooName: string;
  soldQty: number;
  stockActual: number;
  stockDeseado: number;
  faltante: number;
  isCritical: boolean;
  match: UnifiedProduct;
  bestOffer: SupplierOffer;
  suggestedQty: number;
}

interface SmartRestockProps {
  ventas: VentaHistorica[];
  productos: UnifiedProduct[];
  inventario: OdooInventario[];
  onAddToCart: (product: UnifiedProduct, offer: SupplierOffer, qty: number) => void;
}

export default function SmartRestock({ ventas, productos, inventario, onAddToCart }: SmartRestockProps) {
  const [addedItems, setAddedItems] = useState<Set<string>>(new Set());
  const [isCalculating, setIsCalculating] = useState(false);

  const suggestions = useMemo((): RestockSuggestion[] => {
    // 1. Ventana de análisis: últimos 30 días con datos (no todo el histórico) y días realmente cubiertos
    const timestamps = ventas.map(v => new Date(v.date).getTime()).filter(t => !Number.isNaN(t));
    if (timestamps.length === 0) return [];
    const maxTs = Math.max(...timestamps);
    const windowStart = maxTs - ANALYSIS_WINDOW_DAYS * 86_400_000;
    const ventasVentana = ventas.filter(v => {
      const t = new Date(v.date).getTime();
      return !Number.isNaN(t) && t >= windowStart;
    });
    const minTs = Math.min(...ventasVentana.map(v => new Date(v.date).getTime()));
    const diasOperando = Math.max(1, Math.ceil((maxTs - minTs) / 86_400_000));

    // 2. Ventas agrupadas por producto de inventario (odoo_id) o por nombre si no cruza
    const invIndex = buildInventarioIndex(inventario);
    const productSales = new Map<string, { qty: number; name: string; stockItem?: OdooInventario }>();
    ventasVentana.forEach(v => {
      const stockItem = invIndex.find(v);
      const key = stockItem ? `inv:${stockItem.id}` : `name:${nameKey(v.product_name)}`;
      const current = productSales.get(key) || { qty: 0, name: stockItem?.product_name ?? v.product_name, stockItem };
      current.qty += v.quantity;
      productSales.set(key, current);
    });

    // 3. Búsqueda difusa del producto de Odoo en los catálogos de proveedores
    const findMatch = (odooName: string): UnifiedProduct | null => {
      const stopWords = ['de', 'con', 'para', 'mg', 'ml', 'gr', 'g', 'tab', 'cap', 'susp'];
      const odooTokens = stripOdooRef(odooName).toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/)
        .filter(t => t.length > 2 && !stopWords.includes(t));

      let bestMatch: UnifiedProduct | null = null;
      let maxScore = 0;

      for (const prod of productos) {
        const pTokens = prod.name.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/);
        let score = 0;
        for (const ot of odooTokens) {
          if (pTokens.some(pt => pt.includes(ot) || ot.includes(pt))) score++;
        }
        // Boost si la primera palabra coincide (suele ser el ingrediente activo o marca principal)
        if (odooTokens.length > 0 && pTokens.length > 0 && (odooTokens[0] === pTokens[0] || pTokens[0].includes(odooTokens[0]))) {
          score += 2;
        }
        if (score > maxScore && score >= 2) {
          maxScore = score;
          bestMatch = prod;
        }
      }
      return bestMatch;
    };

    // 4. Evaluar cobertura de cada producto vendido
    const results: RestockSuggestion[] = [];
    productSales.forEach(mover => {
      const stockActual = mover.stockItem ? mover.stockItem.stock : 0;
      const ventaDiaria = mover.qty / diasOperando;
      const stockDeseado = Math.ceil(ventaDiaria * DAYS_TO_COVER);
      const faltante = stockDeseado - stockActual;
      if (faltante <= 0) return;

      const match = findMatch(mover.name);
      if (!match) return;
      // Nunca proponer ofertas "Consultar" (precio 0) como mejor opción
      const bestOffer = match.offers.filter(o => o.netPrice > 0).sort((a, b) => a.netPrice - b.netPrice)[0];
      if (!bestOffer) return;

      let suggestedQty = Math.ceil(faltante / 10) * 10;
      if (suggestedQty < 10) suggestedQty = Math.ceil(faltante);

      results.push({
        odooName: mover.name,
        soldQty: mover.qty,
        stockActual,
        stockDeseado,
        faltante,
        isCritical: stockActual === 0, // Quiebre de stock
        match,
        bestOffer,
        suggestedQty
      });
    });

    // 5. Ordenar: críticos primero (por volumen vendido), luego por faltante
    results.sort((a, b) => {
      if (a.isCritical && !b.isCritical) return -1;
      if (!a.isCritical && b.isCritical) return 1;
      if (a.isCritical && b.isCritical) return b.soldQty - a.soldQty;
      return b.faltante - a.faltante;
    });

    return results.slice(0, 50);
  }, [ventas, productos, inventario]);

  const [customQtys, setCustomQtys] = useState<Record<string, number>>({});

  const qtyFor = (s: RestockSuggestion) => customQtys[s.odooName] ?? s.suggestedQty;

  const handleQtyChange = (s: RestockSuggestion, delta: number) => {
    setCustomQtys(prev => ({
      ...prev,
      [s.odooName]: Math.max(1, qtyFor(s) + delta)
    }));
  };

  const handleAdd = (suggestion: RestockSuggestion) => {
    onAddToCart(suggestion.match, suggestion.bestOffer, qtyFor(suggestion));
    setAddedItems(prev => new Set(prev).add(suggestion.odooName));
  };

  const addAll = () => {
    setIsCalculating(true);
    setTimeout(() => {
      suggestions.forEach(s => {
        if (!addedItems.has(s.odooName)) {
          onAddToCart(s.match, s.bestOffer, qtyFor(s));
          setAddedItems(prev => new Set(prev).add(s.odooName));
        }
      });
      setIsCalculating(false);
    }, 500);
  };

  if (ventas.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl shadow-sm border border-slate-100 text-center">
        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
          <AlertCircle className="w-8 h-8 text-slate-400" />
        </div>
        <h3 className="text-xl font-black text-slate-800 mb-2">No hay historial de ventas</h3>
        <p className="text-slate-500 max-w-md">El asistente inteligente necesita datos de ventas de Odoo para poder sugerirte qué comprar.</p>
      </div>
    );
  }

  if (productos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl shadow-sm border border-slate-100 text-center">
        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
          <RefreshCw className="w-8 h-8 text-slate-400" />
        </div>
        <h3 className="text-xl font-black text-slate-800 mb-2">No hay catálogos cargados</h3>
        <p className="text-slate-500 max-w-md">Importa tus catálogos de proveedores en la sección de Ajustes para cruzar los datos.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-20">
      <div className="bg-linear-to-r from-violet-600 to-indigo-600 rounded-2xl p-8 shadow-xl text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <Sparkles className="w-32 h-32" />
        </div>

        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 rounded-full text-sm font-bold tracking-wider mb-4 border border-white/30 backdrop-blur-md">
            <Zap className="w-4 h-4 text-amber-300" fill="currentColor" /> AXIA AI
          </div>
          <h2 className="text-3xl font-black mb-2">Asistente de Reabastecimiento</h2>
          <p className="text-indigo-100 max-w-xl text-lg">
            He cruzado tus {ventas.length} ventas con los precios actuales de tus catálogos.
            Aquí tienes las mejores opciones para reabastecer tu alta rotación hoy.
          </p>

          {suggestions.length > 0 && (
            <div className="mt-8 flex gap-4">
              <button
                onClick={addAll}
                disabled={isCalculating || addedItems.size === suggestions.length}
                className="bg-white text-indigo-600 px-6 py-3 rounded-xl font-black shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCalculating ? <RefreshCw className="w-5 h-5 animate-spin" /> : <ShoppingCart className="w-5 h-5" />}
                Agregar todo al carrito ({suggestions.filter(s => !addedItems.has(s.odooName)).length})
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-4">
        {suggestions.length === 0 ? (
          <div className="text-center p-8 bg-slate-50 rounded-xl border border-slate-200">
            <p className="text-slate-500 font-medium">No se encontraron coincidencias exactas entre tus productos más vendidos y los catálogos actuales.</p>
          </div>
        ) : (
          suggestions.map((s, idx) => {
            const isAdded = addedItems.has(s.odooName);

            return (
              <div key={idx} className={cn("bg-white rounded-xl p-5 border transition-all duration-300", isAdded ? "border-emerald-200 bg-emerald-50/30" : "border-slate-200 hover:border-indigo-300 hover:shadow-md")}>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">

                  {/* Odoo Side */}
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-4 mb-2">
                      {s.isCritical && (
                        <div className="flex items-center gap-1 bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full">
                          <AlertCircle className="w-3.5 h-3.5" />
                          <span className="text-[10px] font-black uppercase tracking-wider">QUIEBRE DE STOCK</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <TrendingUp className="w-4 h-4 text-slate-400" />
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Vendidos: {s.soldQty}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Package className="w-4 h-4 text-indigo-500" />
                        <span className={cn("text-xs font-bold uppercase tracking-wider", s.stockActual === 0 ? "text-rose-500" : "text-slate-500")}>Stock Actual: {s.stockActual}</span>
                      </div>
                    </div>
                    <h3 className="font-bold text-slate-800">{s.odooName}</h3>
                    <p className="text-xs text-slate-400 mt-1">Sugerido por IA para cubrir {DAYS_TO_COVER} días (Faltan {Math.ceil(s.faltante)} unid.)</p>
                  </div>

                  <ArrowRight className="hidden md:block w-5 h-5 text-slate-300 shrink-0" />

                  {/* Provider Side */}
                  <div className="flex-1 bg-slate-50 p-4 rounded-lg border border-slate-100">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">Mejor opción: {s.bestOffer.provider}</span>
                    </div>
                    <h3 className="font-black text-slate-900 line-clamp-1" title={s.match.name}>{s.match.name}</h3>
                    <div className="flex items-baseline gap-2 mt-2">
                      <span className="text-2xl font-black text-emerald-600">C$ {s.bestOffer.netPrice.toFixed(2)}</span>
                      {s.bestOffer.discount > 0 && <span className="text-xs font-bold text-rose-500 bg-rose-100 px-1.5 py-0.5 rounded">-{s.bestOffer.discount}%</span>}
                    </div>
                  </div>

                  {/* Action Side */}
                  <div className="flex flex-col items-end justify-center min-w-30 shrink-0 border-t md:border-t-0 md:border-l border-slate-100 pt-4 md:pt-0 md:pl-6">
                    <p className="text-[10px] text-slate-400 font-bold mb-3 uppercase tracking-wider">Sugerido por IA: {s.suggestedQty} u.</p>

                    {!isAdded ? (
                      <div className="flex flex-col items-center gap-2 w-full">
                        <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1 w-full justify-between">
                          <button onClick={() => handleQtyChange(s, -1)} className="p-1.5 text-slate-600 hover:bg-white rounded shadow-sm bg-slate-200/50 transition-colors">
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="font-black text-slate-800 text-sm">{qtyFor(s)}</span>
                          <button onClick={() => handleQtyChange(s, 1)} className="p-1.5 text-slate-600 hover:bg-white rounded shadow-sm bg-slate-200/50 transition-colors">
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                        <button
                          onClick={() => handleAdd(s)}
                          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-bold shadow-sm transition-colors text-sm"
                        >
                          Agregar
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 mb-1 shadow-inner">
                          <CheckCircle2 className="w-6 h-6" />
                        </div>
                        <span className="text-emerald-700 font-bold text-xs uppercase tracking-wider">Añadido</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
