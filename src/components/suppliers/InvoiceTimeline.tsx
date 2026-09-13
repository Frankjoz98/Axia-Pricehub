import { useState } from 'react';
import { FileText, Calendar, CheckCircle2, AlertTriangle, ChevronRight, X, ChevronLeft, Trash2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { api } from '../../services/api';
import { useAppContext } from '../../context/AppContext';
import type { FacturaCompra } from '../../types';

interface InvoiceTimelineProps {
  facturas: FacturaCompra[];
}

export function InvoiceTimeline({ facturas }: InvoiceTimelineProps) {
  const { refreshData } = useAppContext();
  const [selectedInvoice, setSelectedInvoice] = useState<FacturaCompra | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const getStatusConfig = (factura: FacturaCompra) => {
    const isVencida = factura.estado === 'vencida' || (factura.estado === 'pendiente' && factura.fecha_vencimiento && new Date(factura.fecha_vencimiento) < new Date());
    
    if (isVencida) return { icon: AlertTriangle, color: 'text-rose-500', bg: 'bg-rose-50', border: 'border-rose-200', label: 'Vencida' };
    if (factura.estado === 'pagada') return { icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-50', border: 'border-emerald-200', label: 'Pagada' };
    return { icon: Calendar, color: 'text-amber-500', bg: 'bg-amber-50', border: 'border-amber-200', label: 'Pendiente' };
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Estás seguro de eliminar esta factura?')) return;
    setIsDeleting(true);
    try {
      await api.deleteFactura(id);
      await refreshData();
      setSelectedInvoice(null);
    } catch (err) {
      console.error(err);
      alert('Error al eliminar la factura');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleToggleEstado = async (factura: FacturaCompra) => {
    const newEstado = factura.estado === 'pagada' ? 'pendiente' : 'pagada';
    try {
      await api.updateFactura(factura.id, { estado: newEstado });
      await refreshData();
      if (selectedInvoice && selectedInvoice.id === factura.id) {
        setSelectedInvoice({ ...factura, estado: newEstado });
      }
    } catch (err) {
      console.error(err);
      alert('Error al cambiar el estado');
    }
  };

  if (facturas.length === 0) {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mb-4">
          <FileText className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-bold text-slate-700">No hay facturas</h3>
        <p className="text-slate-500 mt-2 max-w-sm">No se ha registrado ninguna factura para este proveedor.</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {facturas.map(factura => {
          const status = getStatusConfig(factura);
          const hasImages = factura.imagenes && factura.imagenes.length > 0;

          return (
            <div 
              key={factura.id}
              onClick={() => setSelectedInvoice(factura)}
              className={cn(
                "bg-white rounded-2xl border p-4 flex items-center justify-between cursor-pointer transition-all hover:shadow-md group",
                status.border,
                "hover:border-violet-300"
              )}
            >
              <div className="flex items-center gap-4">
                <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-colors group-hover:bg-violet-50 group-hover:text-violet-600", status.bg, status.color)}>
                  <status.icon className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 flex items-center gap-2">
                    {factura.numero_factura}
                    <span className={cn("text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-md", status.bg, status.color)}>
                      {status.label}
                    </span>
                  </h4>
                  <div className="text-sm text-slate-500 flex items-center gap-3 mt-1">
                    <span>Emisión: {factura.fecha_factura}</span>
                    {factura.fecha_vencimiento && <span>Vence: {factura.fecha_vencimiento}</span>}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-6">
                <div className="text-right">
                  <span className="block font-black text-slate-800">C$ {factura.monto_total.toLocaleString('es-NI')}</span>
                  {hasImages && <span className="text-xs text-slate-400 font-medium">{factura.imagenes!.length} foto(s)</span>}
                </div>
                <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-violet-500 transition-colors" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Invoice Gallery Modal */}
      {selectedInvoice && (
        <InvoiceGalleryModal 
          factura={selectedInvoice} 
          onClose={() => setSelectedInvoice(null)} 
          onToggleEstado={() => handleToggleEstado(selectedInvoice)}
          onDelete={() => handleDelete(selectedInvoice.id)}
          isDeleting={isDeleting}
        />
      )}
    </>
  );
}

interface InvoiceGalleryModalProps {
  factura: FacturaCompra;
  onClose: () => void;
  onToggleEstado: () => void;
  onDelete: () => void;
  isDeleting: boolean;
}

function InvoiceGalleryModal({ factura, onClose, onToggleEstado, onDelete, isDeleting }: InvoiceGalleryModalProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const images = factura.imagenes || [];
  const hasImages = images.length > 0;

  const nextImage = () => setCurrentImageIndex(i => (i + 1) % images.length);
  const prevImage = () => setCurrentImageIndex(i => (i - 1 + images.length) % images.length);

  return (
    <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-3xl overflow-hidden w-full max-w-4xl max-h-[90vh] flex flex-col md:flex-row">
        
        {/* Gallery Section */}
        <div className="flex-1 bg-slate-900 relative flex items-center justify-center min-h-75">
          {hasImages ? (
            <>
              <img 
                src={images[currentImageIndex]} 
                alt={`Página ${currentImageIndex + 1}`} 
                className="max-w-full max-h-[80vh] object-contain"
              />
              
              {/* Image Controls */}
              {images.length > 1 && (
                <>
                  <button onClick={prevImage} className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-black/50 text-white rounded-full hover:bg-black/80 transition-colors backdrop-blur-md">
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                  <button onClick={nextImage} className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-black/50 text-white rounded-full hover:bg-black/80 transition-colors backdrop-blur-md">
                    <ChevronRight className="w-6 h-6" />
                  </button>
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 text-white px-3 py-1.5 rounded-full text-sm font-medium backdrop-blur-md">
                    {currentImageIndex + 1} / {images.length}
                  </div>
                </>
              )}
            </>
          ) : (
            <div className="text-slate-500 flex flex-col items-center">
              <FileText className="w-12 h-12 mb-2 opacity-50" />
              <p>Sin documento adjunto</p>
            </div>
          )}
        </div>

        {/* Info Section */}
        <div className="w-full md:w-80 bg-white flex flex-col border-l border-slate-200">
          <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
            <h3 className="font-bold text-slate-800">Detalle de Factura</h3>
            <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full text-slate-500 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="p-6 space-y-6 flex-1 overflow-y-auto">
            <div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Número</span>
              <p className="text-xl font-black text-slate-800">{factura.numero_factura}</p>
            </div>

            <div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Monto Total</span>
              <p className="text-xl font-black text-violet-600">C$ {factura.monto_total.toLocaleString('es-NI')}</p>
            </div>

            <div className="space-y-3 pt-4 border-t border-slate-100">
              <div className="flex justify-between">
                <span className="text-sm text-slate-500">Emisión</span>
                <span className="text-sm font-bold text-slate-700">{factura.fecha_factura}</span>
              </div>
              {factura.fecha_vencimiento && (
                <div className="flex justify-between">
                  <span className="text-sm text-slate-500">Vencimiento</span>
                  <span className="text-sm font-bold text-slate-700">{factura.fecha_vencimiento}</span>
                </div>
              )}
            </div>

            {factura.notas && (
              <div className="pt-4 border-t border-slate-100">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Notas</span>
                <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-xl">{factura.notas}</p>
              </div>
            )}
          </div>

          <div className="p-4 border-t border-slate-100 bg-slate-50 space-y-3">
            <button 
              onClick={onToggleEstado}
              className={cn(
                "w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors",
                factura.estado === 'pagada' ? "bg-amber-100 text-amber-700 hover:bg-amber-200" : "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
              )}
            >
              <CheckCircle2 className="w-5 h-5" />
              {factura.estado === 'pagada' ? 'Marcar como Pendiente' : 'Marcar como Pagada'}
            </button>
            <button 
              onClick={onDelete}
              disabled={isDeleting}
              className="w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 text-rose-600 bg-rose-50 hover:bg-rose-100 transition-colors disabled:opacity-50"
            >
              <Trash2 className="w-5 h-5" />
              Eliminar Registro
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
