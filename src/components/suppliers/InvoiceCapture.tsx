import { useState, useRef } from 'react';
import { X, Save, AlertCircle, Camera, Trash2, Loader2 } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { api } from '../../services/api';
import type { Proveedor } from '../../types';
import { todayYMD, toLocalYMD } from '../../lib/dates';
import { errorMessage } from '../../lib/utils';

interface InvoiceCaptureProps {
  proveedor: Proveedor;
  onClose: () => void;
}

export function InvoiceCapture({ proveedor, onClose }: InvoiceCaptureProps) {
  const { refreshData } = useAppContext();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Factura state
  const [numeroFactura, setNumeroFactura] = useState('');
  const [fechaFactura, setFechaFactura] = useState(todayYMD());

  // Calculate default vencimiento
  const defaultVencimiento = new Date();
  if (proveedor.dias_credito) {
    defaultVencimiento.setDate(defaultVencimiento.getDate() + proveedor.dias_credito);
  }
  const [fechaVencimiento, setFechaVencimiento] = useState(toLocalYMD(defaultVencimiento));

  const [montoTotal, setMontoTotal] = useState<number | ''>('');
  const [notas, setNotas] = useState('');

  // Images state (local object URLs for preview)
  const [photos, setPhotos] = useState<{ file: File; preview: string }[]>([]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newPhotos = Array.from(e.target.files).map(file => ({
        file,
        preview: URL.createObjectURL(file)
      }));
      setPhotos(prev => [...prev, ...newPhotos]);
    }
  };

  const removePhoto = (index: number) => {
    setPhotos(prev => {
      const copy = [...prev];
      URL.revokeObjectURL(copy[index].preview);
      copy.splice(index, 1);
      return copy;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!numeroFactura) { setError('El número de factura es obligatorio'); return; }
    if (montoTotal === '' || montoTotal <= 0) { setError('El monto debe ser mayor a 0'); return; }

    setIsSaving(true);
    setError(null);

    try {
      // 1. Crear el registro en Supabase primero para obtener el ID
      const nuevaFactura = await api.createFactura({
        proveedor_id: proveedor.id,
        numero_factura: numeroFactura,
        fecha_factura: fechaFactura,
        fecha_vencimiento: fechaVencimiento,
        monto_total: Number(montoTotal),
        estado: 'pendiente',
        notas,
        imagenes: []
      });

      if (!nuevaFactura) throw new Error('No se pudo registrar la factura');

      // 2. Subir las imágenes a Storage usando el ID generado
      const urls: string[] = [];
      if (photos.length > 0) {
        for (const photo of photos) {
          const url = await api.uploadFacturaImage(photo.file, proveedor.id, nuevaFactura.id);
          if (url) urls.push(url);
        }

        // 3. Actualizar la factura con las URLs obtenidas
        if (urls.length > 0) {
          await api.updateFactura(nuevaFactura.id, { imagenes: urls });
        }
      }

      await refreshData();
      onClose();
    } catch (err) {
      setError(errorMessage(err) || 'Error al guardar la factura');
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden my-8">

        {/* Header */}
        <div className="bg-violet-600 p-6 flex justify-between items-center text-white sticky top-0 z-10">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              Nueva Factura
            </h2>
            <p className="text-violet-200 text-sm mt-1">{proveedor.nombre}</p>
          </div>
          <button onClick={onClose} disabled={isSaving} className="p-2 hover:bg-violet-700 rounded-full transition-colors disabled:opacity-50">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-rose-50 text-rose-600 p-4 rounded-xl flex items-center gap-3">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Número de Factura *</label>
              <input type="text" required value={numeroFactura} onChange={e => setNumeroFactura(e.target.value)} className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-violet-200 focus:border-violet-500 font-bold" placeholder="Ej. F-02948" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Monto Total (C$) *</label>
              <input type="number" required min="0.01" step="0.01" value={montoTotal} onChange={e => setMontoTotal(e.target.value ? Number(e.target.value) : '')} className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-violet-200 focus:border-violet-500 font-bold text-violet-700 bg-violet-50" placeholder="0.00" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Fecha de Emisión *</label>
              <input type="date" required value={fechaFactura} onChange={e => setFechaFactura(e.target.value)} className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-violet-200 focus:border-violet-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Vencimiento * (Calculado: {proveedor.dias_credito || 0} días)</label>
              <input type="date" required value={fechaVencimiento} onChange={e => setFechaVencimiento(e.target.value)} className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-violet-200 focus:border-violet-500" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Notas</label>
            <textarea value={notas} onChange={e => setNotas(e.target.value)} rows={2} className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-violet-200 focus:border-violet-500 resize-none" placeholder="Observaciones adicionales..." />
          </div>

          {/* Área de Escaneo / Fotos */}
          <div className="border-t border-slate-100 pt-6 mt-6">
            <div className="flex justify-between items-end mb-4">
              <div>
                <h3 className="font-bold text-slate-800">Documento Físico</h3>
                <p className="text-sm text-slate-500">Toma una foto de la factura con tu cámara.</p>
              </div>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                multiple
                className="hidden"
                ref={fileInputRef}
                onChange={handleFileSelect}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors"
              >
                <Camera className="w-5 h-5" />
                Agregar Foto
              </button>
            </div>

            {photos.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                {photos.map((photo, index) => (
                  <div key={index} className="relative aspect-3/4 bg-slate-100 rounded-xl overflow-hidden group border border-slate-200">
                    <img src={photo.preview} alt={`Foto ${index + 1}`} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <button type="button" onClick={() => removePhoto(index)} className="p-2 bg-rose-500 text-white rounded-full hover:bg-rose-600 transition-colors">
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                    <div className="absolute bottom-2 left-2 bg-black/60 text-white text-[10px] px-2 py-1 rounded-lg backdrop-blur-md">
                      Pág {index + 1}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Acciones */}
          <div className="flex gap-3 pt-6 border-t mt-6 sticky bottom-0 bg-white">
            <button type="button" onClick={onClose} disabled={isSaving} className="flex-1 px-4 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-colors disabled:opacity-50">
              Cancelar
            </button>
            <button type="submit" disabled={isSaving} className="flex-1 px-4 py-3 rounded-xl bg-violet-600 text-white font-bold hover:bg-violet-700 transition-colors flex justify-center items-center gap-2 disabled:opacity-50">
              {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              {isSaving ? 'Guardando...' : 'Guardar Factura'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
