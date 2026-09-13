import { X } from 'lucide-react';
import { supabase } from '../supabase';
import type { UnifiedProduct, SupplierOffer } from '../types';
import { useState } from 'react';

interface ProductEditorProps {
  product: UnifiedProduct;
  initialOffer: SupplierOffer;
  onClose: () => void;
  onSaved: () => void;
}

export default function ProductEditor({ product, initialOffer, onClose, onSaved }: ProductEditorProps) {
  const [offer, setOffer] = useState<SupplierOffer>({ ...initialOffer });
  const [selectedExisting, setSelectedExisting] = useState<string>(initialOffer.provider);

  const handleSelectOffer = (provider: string) => {
    const existing = product.offers.find(o => o.provider === provider);
    if (existing) { setOffer({ ...existing }); setSelectedExisting(provider); }
  };

  const handleSave = async () => {
    const updatedProduct = { ...product };
    const idx = updatedProduct.offers.findIndex(o => o.provider === offer.provider);
    if (idx >= 0) updatedProduct.offers[idx] = offer;
    else updatedProduct.offers.push(offer);

    const { error } = await supabase.from('productos').upsert(updatedProduct);
    if (error) alert("Error: " + error.message);
    else { onSaved(); onClose(); }
  };

  const handleDelete = async () => {
    if (!confirm(`¿Eliminar la oferta de ${offer.provider}?`)) return;
    const updatedProduct = { ...product };
    updatedProduct.offers = updatedProduct.offers.filter(o => o.provider !== offer.provider);
    const { error } = await supabase.from('productos').upsert(updatedProduct);
    if (error) alert("Error: " + error.message);
    else { onSaved(); onClose(); }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-60 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 bg-slate-100 rounded-full"><X className="w-5 h-5" /></button>
        <h2 className="text-xl font-black mb-1">{product.name}</h2>
        <p className="text-sm text-slate-500 mb-4">{product.activeIngredient} • {product.category}</p>

        {/* Quick Select Existing Offers */}
        {product.offers.length > 0 && (
          <div className="mb-4">
            <label className="block text-xs font-bold text-slate-500 mb-2">Ofertas Existentes (clic para editar):</label>
            <div className="flex flex-wrap gap-2">
              {product.offers.map(o => (
                <button key={o.provider} onClick={() => handleSelectOffer(o.provider)}
                  className={`text-xs px-3 py-1.5 rounded-lg font-bold transition-all ${selectedExisting === o.provider ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                  {o.provider} — C$ {o.netPrice.toFixed(2)}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-xs font-bold text-slate-600 mb-1">Proveedor</label>
              <input type="text" value={offer.provider} onChange={e => setOffer({ ...offer, provider: e.target.value.toUpperCase() })} className="w-full p-2.5 border rounded-xl" placeholder="DICEGSA" /></div>
            <div><label className="block text-xs font-bold text-slate-600 mb-1">Código</label>
              <input type="text" value={offer.providerCode} onChange={e => setOffer({ ...offer, providerCode: e.target.value })} className="w-full p-2.5 border rounded-xl" placeholder="DIC-001" /></div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div><label className="block text-xs font-bold text-slate-600 mb-1">P. Base</label>
              <input type="number" value={offer.basePrice} onChange={e => setOffer({ ...offer, basePrice: Number(e.target.value) })} className="w-full p-2.5 border rounded-xl" /></div>
            <div><label className="block text-xs font-bold text-slate-600 mb-1">Dcto %</label>
              <input type="number" value={offer.discount} onChange={e => setOffer({ ...offer, discount: Number(e.target.value) })} className="w-full p-2.5 border rounded-xl" /></div>
            <div><label className="block text-xs font-bold text-slate-600 mb-1">P. Neto</label>
              <input type="number" value={offer.netPrice} onChange={e => setOffer({ ...offer, netPrice: Number(e.target.value) })} className="w-full p-2.5 border rounded-xl bg-emerald-50 border-emerald-200 font-bold" /></div>
          </div>
          <div className="border border-dashed border-amber-300 p-3 rounded-xl bg-amber-50">
            <label className="block text-xs font-bold text-amber-800 mb-2">Escala Promocional (Opcional)</label>
            <div className="grid grid-cols-2 gap-4">
              <div><span className="text-xs text-amber-700">Pagas:</span>
                <input type="number" placeholder="Ej: 12" value={offer.bonusScale?.buy || ''} onChange={e => setOffer({ ...offer, bonusScale: { buy: Number(e.target.value), free: offer.bonusScale?.free || 0 } })} className="w-full p-2 border rounded-lg mt-1" /></div>
              <div><span className="text-xs text-amber-700">Regaladas:</span>
                <input type="number" placeholder="Ej: 1" value={offer.bonusScale?.free || ''} onChange={e => setOffer({ ...offer, bonusScale: { buy: offer.bonusScale?.buy || 0, free: Number(e.target.value) } })} className="w-full p-2 border rounded-lg mt-1" /></div>
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          {offer.provider && <button onClick={handleDelete} className="px-4 py-2.5 bg-rose-100 text-rose-700 font-bold rounded-xl hover:bg-rose-200 transition-colors">Borrar</button>}
          <button onClick={handleSave} className="flex-1 px-4 py-2.5 bg-slate-900 text-white font-bold rounded-xl shadow-lg hover:bg-slate-800 transition-colors">Guardar en Nube</button>
        </div>
      </div>
    </div>
  );
}
