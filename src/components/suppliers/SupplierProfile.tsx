import { useState } from 'react';
import { ArrowLeft, Edit, Building2, Phone, Mail, Clock, ShieldAlert, CheckCircle2, AlertTriangle, Plus } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { SupplierForm } from './SupplierForm';
import { InvoiceTimeline } from './InvoiceTimeline';
import { InvoiceCapture } from './InvoiceCapture';
import type { Proveedor } from '../../types';

interface SupplierProfileProps {
  proveedor: Proveedor;
  onBack: () => void;
}

export function SupplierProfile({ proveedor, onBack }: SupplierProfileProps) {
  const { facturas } = useAppContext();
  const [isEditing, setIsEditing] = useState(false);
  const [isCapturingInvoice, setIsCapturingInvoice] = useState(false);

  const supplierFacturas = facturas.filter(f => f.proveedor_id === proveedor.id);
  const totalComprado = supplierFacturas.reduce((acc, f) => acc + f.monto_total, 0);
  const pendientes = supplierFacturas.filter(f => f.estado === 'pendiente');
  const vencidas = supplierFacturas.filter(f => f.estado === 'vencida' || (f.estado === 'pendiente' && f.fecha_vencimiento && new Date(f.fecha_vencimiento) < new Date()));
  const totalPendiente = pendientes.reduce((acc, f) => acc + f.monto_total, 0);

  return (
    <div className="space-y-6 pb-20 max-w-5xl mx-auto">
      {/* Header / Actions */}
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="flex items-center gap-2 text-slate-500 hover:text-violet-600 transition-colors font-medium">
          <ArrowLeft className="w-5 h-5" />
          Volver al Hub
        </button>
        <button onClick={() => setIsEditing(true)} className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl font-medium transition-colors">
          <Edit className="w-4 h-4" />
          Editar Perfil
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Ficha Comercial & KPIs */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* Main Card */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
            <div className="w-16 h-16 bg-violet-100 text-violet-600 rounded-2xl flex items-center justify-center mb-4">
              <Building2 className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-black text-slate-800">{proveedor.nombre}</h1>
            {proveedor.numero_cliente && (
              <p className="text-slate-500 font-medium mt-1">Cliente #: {proveedor.numero_cliente}</p>
            )}

            <div className="mt-6 pt-6 border-t border-slate-100 space-y-4">
              {proveedor.contacto_nombre && (
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Contacto</span>
                  <p className="font-medium text-slate-700">{proveedor.contacto_nombre}</p>
                  <div className="flex flex-col gap-1 mt-2 text-sm text-slate-600">
                    {proveedor.contacto_telefono && <span className="flex items-center gap-2"><Phone className="w-4 h-4" /> {proveedor.contacto_telefono}</span>}
                    {proveedor.contacto_email && <span className="flex items-center gap-2"><Mail className="w-4 h-4" /> {proveedor.contacto_email}</span>}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100">
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Crédito</span>
                  <p className="font-medium text-slate-700 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-violet-500" />
                    {proveedor.dias_credito ? `${proveedor.dias_credito} días` : 'Contado'}
                  </p>
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Entrega</span>
                  <p className="font-medium text-slate-700">{proveedor.dia_entrega || 'N/A'}</p>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Condiciones Especiales</span>
                <div className="flex flex-wrap gap-2">
                  <span className="inline-flex items-center px-2 py-1 bg-blue-50 text-blue-700 text-xs font-bold uppercase tracking-wider rounded-lg">
                    {proveedor.tipo_precio === 'descuento' ? `Desc. ${proveedor.porcentaje_descuento}%` : proveedor.tipo_precio?.replace('_', ' ')}
                  </span>
                  {proveedor.tiene_bonificacion && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold uppercase tracking-wider rounded-lg">
                      <CheckCircle2 className="w-3 h-3" /> Bonifica
                    </span>
                  )}
                </div>
                {proveedor.detalle_bonificacion && <p className="text-sm mt-2 text-slate-600 bg-slate-50 p-2 rounded-lg">{proveedor.detalle_bonificacion}</p>}
                
                {proveedor.politica_vencidos && (
                  <div className="mt-3">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Pol. Vencidos</span>
                    <p className="text-sm text-slate-600 flex items-start gap-2 bg-slate-50 p-2 rounded-lg">
                      <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                      {proveedor.politica_vencidos}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Resumen Financiero */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
            <h3 className="font-bold text-slate-800 border-b pb-4 mb-4">Resumen Financiero</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Total Comprado</span>
                <span className="font-black text-slate-800 text-lg">C$ {totalComprado.toLocaleString('es-NI')}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Pendiente</span>
                <span className="font-bold text-amber-600">C$ {totalPendiente.toLocaleString('es-NI')}</span>
              </div>
              {vencidas.length > 0 && (
                <div className="bg-rose-50 p-3 rounded-xl flex items-start gap-3 mt-4">
                  <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0" />
                  <div>
                    <span className="text-sm font-bold text-rose-700 block">Atención Requerida</span>
                    <span className="text-xs text-rose-600">Tienes {vencidas.length} factura(s) vencida(s) con este proveedor.</span>
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Right Column: Facturas */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm min-h-125">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-800">Historial de Facturas</h2>
              <button onClick={() => setIsCapturingInvoice(true)} className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white hover:bg-violet-700 rounded-xl font-bold transition-colors shadow-lg shadow-violet-200">
                <Plus className="w-4 h-4" />
                Nueva Factura
              </button>
            </div>

            <InvoiceTimeline facturas={supplierFacturas} />

          </div>
        </div>
      </div>

      {isEditing && <SupplierForm proveedor={proveedor} onClose={() => setIsEditing(false)} />}
      {isCapturingInvoice && <InvoiceCapture proveedor={proveedor} onClose={() => setIsCapturingInvoice(false)} />}
    </div>
  );
}
