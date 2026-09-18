import { useState } from 'react';
import { X, Save, AlertCircle } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { api } from '../../services/api';
import type { Proveedor, TipoPrecio } from '../../types';
import { errorMessage } from '../../lib/utils';

interface SupplierFormProps {
  proveedor?: Proveedor;
  onClose: () => void;
}

export function SupplierForm({ proveedor, onClose }: SupplierFormProps) {
  const { refreshData } = useAppContext();
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<Partial<Proveedor>>({
    nombre: proveedor?.nombre || '',
    numero_cliente: proveedor?.numero_cliente || '',
    contacto_nombre: proveedor?.contacto_nombre || '',
    contacto_telefono: proveedor?.contacto_telefono || '',
    contacto_email: proveedor?.contacto_email || '',
    dias_credito: proveedor?.dias_credito || 0,
    dia_entrega: proveedor?.dia_entrega || '',
    tipo_precio: proveedor?.tipo_precio || 'precio_liso',
    porcentaje_descuento: proveedor?.porcentaje_descuento || 0,
    tiene_bonificacion: proveedor?.tiene_bonificacion || false,
    detalle_bonificacion: proveedor?.detalle_bonificacion || '',
    politica_vencidos: proveedor?.politica_vencidos || '',
    notas_generales: proveedor?.notas_generales || '',
    activo: proveedor ? proveedor.activo : true
  });

  const handleChange = <K extends keyof Proveedor>(field: K, value: Proveedor[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nombre) {
      setError('El nombre del proveedor es obligatorio');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      if (proveedor) {
        await api.updateProveedor(proveedor.id, formData);
      } else {
        await api.createProveedor(formData);
      }
      await refreshData();
      onClose();
    } catch (err) {
      setError(errorMessage(err) || 'Error al guardar el proveedor');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="bg-slate-800 p-6 flex justify-between items-center text-white sticky top-0 z-10">
          <div>
            <h2 className="text-xl font-bold">{proveedor ? 'Editar Proveedor' : 'Nuevo Proveedor'}</h2>
            <p className="text-slate-400 text-sm mt-1">Ingresa las condiciones comerciales base.</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-700 rounded-full transition-colors">
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* General Info */}
            <div className="space-y-4 md:col-span-2">
              <h3 className="font-semibold text-slate-800 border-b pb-2">Información General</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nombre Comercial *</label>
                  <input type="text" required value={formData.nombre} onChange={e => handleChange('nombre', e.target.value)} className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-violet-200 focus:border-violet-500" placeholder="Ej. LETERAGO" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Número de Cliente</label>
                  <input type="text" value={formData.numero_cliente} onChange={e => handleChange('numero_cliente', e.target.value)} className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-violet-200 focus:border-violet-500" placeholder="Ej. CLI-4821" />
                </div>
              </div>
            </div>

            {/* Contacto */}
            <div className="space-y-4 md:col-span-2">
              <h3 className="font-semibold text-slate-800 border-b pb-2">Contacto</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Representante</label>
                  <input type="text" value={formData.contacto_nombre} onChange={e => handleChange('contacto_nombre', e.target.value)} className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-violet-200 focus:border-violet-500" placeholder="Nombre" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Teléfono</label>
                  <input type="text" value={formData.contacto_telefono} onChange={e => handleChange('contacto_telefono', e.target.value)} className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-violet-200 focus:border-violet-500" placeholder="Ej. 8888-8888" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                  <input type="email" value={formData.contacto_email} onChange={e => handleChange('contacto_email', e.target.value)} className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-violet-200 focus:border-violet-500" placeholder="correo@empresa.com" />
                </div>
              </div>
            </div>

            {/* Condiciones Comerciales */}
            <div className="space-y-4 md:col-span-2">
              <h3 className="font-semibold text-slate-800 border-b pb-2">Condiciones Comerciales</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Días de Crédito</label>
                  <input type="number" min="0" value={formData.dias_credito} onChange={e => handleChange('dias_credito', parseInt(e.target.value) || 0)} className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-violet-200 focus:border-violet-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Día(s) de Entrega</label>
                  <input type="text" value={formData.dia_entrega} onChange={e => handleChange('dia_entrega', e.target.value)} className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-violet-200 focus:border-violet-500" placeholder="Ej. Lunes y Jueves" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Tipo de Precio</label>
                  <select value={formData.tipo_precio} onChange={e => handleChange('tipo_precio', e.target.value as TipoPrecio)} className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-violet-200 focus:border-violet-500">
                    <option value="precio_liso">Precio Liso</option>
                    <option value="descuento">Con Descuento</option>
                    <option value="mixto">Mixto</option>
                  </select>
                </div>

                {formData.tipo_precio === 'descuento' && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Porcentaje de Descuento (%)</label>
                    <input type="number" step="0.01" min="0" max="100" value={formData.porcentaje_descuento} onChange={e => handleChange('porcentaje_descuento', parseFloat(e.target.value) || 0)} className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-violet-200 focus:border-violet-500" />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 gap-4 mt-4">
                <div className="flex items-center gap-3">
                  <input type="checkbox" id="tiene_bonificacion" checked={formData.tiene_bonificacion} onChange={e => handleChange('tiene_bonificacion', e.target.checked)} className="w-5 h-5 rounded text-violet-600 focus:ring-violet-500 border-slate-300" />
                  <label htmlFor="tiene_bonificacion" className="text-sm font-medium text-slate-700">Ofrece Bonificaciones</label>
                </div>

                {formData.tiene_bonificacion && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Detalle de Bonificación</label>
                    <input type="text" value={formData.detalle_bonificacion} onChange={e => handleChange('detalle_bonificacion', e.target.value)} className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-violet-200 focus:border-violet-500" placeholder="Ej. 12+1 en línea Calox" />
                  </div>
                )}
              </div>
            </div>

            {/* Políticas */}
            <div className="space-y-4 md:col-span-2">
              <h3 className="font-semibold text-slate-800 border-b pb-2">Políticas y Notas</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Política de Vencidos</label>
                  <textarea value={formData.politica_vencidos} onChange={e => handleChange('politica_vencidos', e.target.value)} rows={3} className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-violet-200 focus:border-violet-500 resize-none" placeholder="Ej. Cambio directo si se avisa 3 meses antes" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Notas Generales</label>
                  <textarea value={formData.notas_generales} onChange={e => handleChange('notas_generales', e.target.value)} rows={3} className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-violet-200 focus:border-violet-500 resize-none" placeholder="Condiciones especiales, documentos requeridos..." />
                </div>
              </div>
            </div>

            {proveedor && (
              <div className="flex items-center gap-3 md:col-span-2 pt-4 border-t">
                <input type="checkbox" id="activo" checked={formData.activo} onChange={e => handleChange('activo', e.target.checked)} className="w-5 h-5 rounded text-violet-600 focus:ring-violet-500 border-slate-300" />
                <label htmlFor="activo" className="text-sm font-medium text-slate-700">Proveedor Activo</label>
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-6 border-t mt-6 sticky bottom-0 bg-white">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={isSaving} className="flex-1 px-4 py-3 rounded-xl bg-violet-600 text-white font-bold hover:bg-violet-700 transition-colors flex justify-center items-center gap-2 disabled:opacity-50">
              <Save className="w-5 h-5" />
              {isSaving ? 'Guardando...' : 'Guardar Proveedor'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
