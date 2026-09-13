import { useState } from 'react';
import { Package, Clock, CheckCircle2, ChevronDown, ChevronUp, Share2, AlertCircle, Trash2, ShoppingCart } from 'lucide-react';
import { supabase } from '../supabase';
import { cn } from '../lib/utils';
import type { PurchaseOrder } from '../types';

import { CheckCircle2 as CheckSquareIcon } from 'lucide-react';
import PedidosTerminal from './pedidos/PedidosTerminal';

interface OrdersPanelProps {
  ordenes: PurchaseOrder[];
  setOrdenes: (orders: PurchaseOrder[]) => void;
  onReopenOrder?: (order: PurchaseOrder) => boolean;
}

export default function OrdersPanel({ ordenes: orders, setOrdenes, onReopenOrder }: OrdersPanelProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'proveedores' | 'caja'>('proveedores');
  
  // Local state para los campos de conciliación en edición
  const [conciliacionEdit, setConciliacionEdit] = useState<Record<string, {monto: string, notas: string}>>({});

  const initConciliacion = (order: PurchaseOrder) => {
    if (!conciliacionEdit[order.id]) {
      setConciliacionEdit(prev => ({
        ...prev,
        [order.id]: {
          monto: order.monto_factura_real ? order.monto_factura_real.toString() : order.total.toString(),
          notas: order.notas_recepcion || ''
        }
      }));
    }
  };


  const updateReceivedQuantity = async (orderId: string, itemIndex: number, newQty: number) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    const updatedItems = [...order.items];
    updatedItems[itemIndex].receivedQuantity = newQty;

    // Check status
    const allReceived = updatedItems.every(i => i.receivedQuantity >= i.orderedQuantity);
    const someReceived = updatedItems.some(i => i.receivedQuantity > 0);
    const status = allReceived ? 'Completado' : (someReceived ? 'Parcial' : 'Pendiente');

    // Optimistic update
    setOrdenes(orders.map(o => o.id === orderId ? { ...o, items: updatedItems, status } : o));

    const { error } = await supabase
      .from('ordenes_compra')
      .update({ items: updatedItems, status })
      .eq('id', orderId);
      
    if (error) {
      alert('Error actualizando: ' + error.message);
      // Revert if error
      const { data } = await supabase.from('ordenes_compra').select('*').order('created_at', { ascending: false });
      if (data) setOrdenes(data as PurchaseOrder[]);
    }
  };

  const deleteOrder = async (orderId: string) => {
    if (!confirm("¿Estás seguro que deseas eliminar esta orden de forma permanente?")) return;
    setOrdenes(orders.filter(o => o.id !== orderId));
    const { error } = await supabase.from('ordenes_compra').delete().eq('id', orderId);
    if (error) {
      alert("Error al eliminar orden: " + error.message);
      // Revert
      const { data } = await supabase.from('ordenes_compra').select('*').order('created_at', { ascending: false });
      if (data) setOrdenes(data as PurchaseOrder[]);
    }
  };

  const deleteOrderItem = async (orderId: string, itemIndex: number) => {
    if (!confirm("¿Deseas quitar este producto de la orden?")) return;
    const order = orders.find(o => o.id === orderId);
    if (!order) return;
    
    const updatedItems = [...order.items];
    updatedItems.splice(itemIndex, 1);
    
    if (updatedItems.length === 0) {
      await deleteOrder(orderId);
      return;
    }

    const newTotal = updatedItems.reduce((acc, curr) => acc + (curr.orderedQuantity * curr.netPrice), 0);
    setOrdenes(orders.map(o => o.id === orderId ? { ...o, items: updatedItems, total: newTotal } : o));
    
    const { error } = await supabase.from('ordenes_compra')
      .update({ items: updatedItems, total: newTotal })
      .eq('id', orderId);
      
    if (error) {
      alert("Error al actualizar orden: " + error.message);
      // Revert
      const { data } = await supabase.from('ordenes_compra').select('*').order('created_at', { ascending: false });
      if (data) setOrdenes(data as PurchaseOrder[]);
    }
  };

  const handleReopen = async (order: PurchaseOrder) => {
    if (!onReopenOrder) return;
    if (!confirm("Esta orden será movida a tu carrito activo para editarla. ¿Deseas continuar?")) return;
    const success = onReopenOrder(order);
    if (success) {
      setOrdenes(orders.filter(o => o.id !== order.id));
      await supabase.from('ordenes_compra').delete().eq('id', order.id);
    }
  };

  const handleConciliar = async (orderId: string) => {
    const editData = conciliacionEdit[orderId];
    if (!editData) return;
    
    const monto = parseFloat(editData.monto) || 0;
    
    setOrdenes(orders.map(o => o.id === orderId ? { 
      ...o, 
      conciliado: true, 
      monto_factura_real: monto, 
      notas_recepcion: editData.notas,
      fecha_recepcion: new Date().toISOString().split('T')[0]
    } : o));

    const { error } = await supabase.from('ordenes_compra')
      .update({
        conciliado: true,
        monto_factura_real: monto,
        notas_recepcion: editData.notas,
        fecha_recepcion: new Date().toISOString().split('T')[0]
      })
      .eq('id', orderId);

    if (error) {
      alert("Error al conciliar: " + error.message);
      // Revert
      const { data } = await supabase.from('ordenes_compra').select('*').order('created_at', { ascending: false });
      if (data) setOrdenes(data as PurchaseOrder[]);
    }
  };
  const shareWithTeam = (order: PurchaseOrder) => {
    let msg = `📋 *REVISIÓN DE PEDIDO - ${order.provider}*\nFecha: ${new Date(order.created_at).toLocaleDateString()}\n\nPor favor cotejar lo siguiente al recibir:\n\n`;
    
    order.items.forEach(item => {
      msg += `[  ] ${item.orderedQuantity}x ${item.productName}\n`;
    });
    
    msg += `\n_Generado por Axia PriceHub_`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300 max-w-4xl mx-auto pb-20">
      
      {/* Top Toggle */}
      <div className="bg-slate-200/50 p-1.5 rounded-2xl flex max-w-md mx-auto mb-8">
        <button 
          onClick={() => setViewMode('proveedores')}
          className={cn("flex-1 py-2.5 text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2", viewMode === 'proveedores' ? "bg-white text-violet-700 shadow-sm" : "text-slate-500 hover:text-slate-700")}
        >
          <Package className="w-4 h-4" /> A Proveedores
        </button>
        <button 
          onClick={() => setViewMode('caja')}
          className={cn("flex-1 py-2.5 text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2", viewMode === 'caja' ? "bg-blue-600 text-white shadow-sm" : "text-slate-500 hover:text-slate-700")}
        >
          <ShoppingCart className="w-4 h-4" /> Desde Caja
        </button>
      </div>

      {viewMode === 'caja' ? (
        <div className="w-full">
          <PedidosTerminal isEmbedded={true} />
        </div>
      ) : (
        <>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                <Package className="w-6 h-6 text-violet-600" /> Historial de Órdenes
              </h2>
              <p className="text-sm text-slate-500 mt-1">Da seguimiento a tus pedidos y coteja con facturas reales.</p>
            </div>
          </div>

      {orders.length === 0 ? (
        <div className="text-center py-12 text-slate-400 bg-white rounded-2xl border border-slate-200 border-dashed">
          <Package className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="font-bold">No hay órdenes generadas aún.</p>
          <p className="text-sm">Ve al carrito y envía un pedido a un proveedor para comenzar.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map(order => {
            const isExpanded = expandedId === order.id;
            const dateStr = new Date(order.created_at).toLocaleString('es-NI', { dateStyle: 'medium', timeStyle: 'short' });
            
            return (
              <div key={order.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-all">
                {/* Header */}
                <div 
                  onClick={() => {
                    setExpandedId(isExpanded ? null : order.id);
                    if (!isExpanded) initConciliacion(order);
                  }}
                  className="p-4 cursor-pointer hover:bg-slate-50 flex items-center justify-between"
                >
                  <div className="flex items-center gap-4">
                    <div className={cn("p-2 rounded-xl", 
                      order.status === 'Completado' ? 'bg-emerald-100 text-emerald-600' : 
                      order.status === 'Parcial' ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'
                    )}>
                      {order.status === 'Completado' ? <CheckCircle2 className="w-5 h-5" /> : 
                       order.status === 'Parcial' ? <AlertCircle className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                    </div>
                    <div>
                      <h3 className="font-black text-slate-900">{order.provider}</h3>
                      <p className="text-xs text-slate-500 font-medium">{dateStr} • {order.items.length} productos</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={cn("px-2.5 py-1 rounded-md text-xs font-bold", 
                      order.status === 'Completado' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 
                      order.status === 'Parcial' ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-blue-50 text-blue-700 border border-blue-200'
                    )}>
                      {order.status}
                    </span>
                    {isExpanded ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                  </div>
                </div>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="p-4 border-t border-slate-100 bg-slate-50/50">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
                      <div className="flex gap-2 w-full sm:w-auto">
                        {!order.conciliado && (
                          <button 
                            onClick={(e) => { e.stopPropagation(); deleteOrder(order.id); }}
                            className="flex-1 sm:flex-none flex justify-center items-center gap-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 px-3 py-1.5 rounded-lg text-sm font-bold transition-colors"
                          >
                            <Trash2 className="w-4 h-4" /> Eliminar
                          </button>
                        )}
                        {onReopenOrder && (
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleReopen(order); }}
                            className="flex-1 sm:flex-none flex justify-center items-center gap-1.5 bg-violet-50 hover:bg-violet-100 text-violet-600 px-3 py-1.5 rounded-lg text-sm font-bold transition-colors"
                          >
                            <ShoppingCart className="w-4 h-4" /> A Carrito
                          </button>
                        )}
                      </div>
                      <button 
                        onClick={(e) => { e.stopPropagation(); shareWithTeam(order); }}
                        className="w-full sm:w-auto flex justify-center items-center gap-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 px-3 py-1.5 rounded-lg text-sm font-bold transition-colors"
                      >
                        <Share2 className="w-4 h-4" /> Compartir al Equipo
                      </button>
                    </div>

                    <div className="space-y-3">
                      {order.items.map((item, idx) => (
                        <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200">
                          <div className="flex-1">
                            <h4 className="font-bold text-slate-900 text-sm">{item.productName}</h4>
                            <p className="text-[10px] text-slate-500 font-mono">Cód: {item.providerCode}</p>
                          </div>
                          
                          <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-lg border border-slate-100">
                            <div className="text-center px-3">
                              <span className="block text-[10px] text-slate-400 font-bold uppercase">Pedido</span>
                              <span className="text-lg font-black text-slate-700">{item.orderedQuantity}</span>
                            </div>
                            
                            <div className="w-px h-8 bg-slate-200"></div>
                            
                            <div className="text-center px-3">
                              <span className="block text-[10px] text-slate-400 font-bold uppercase mb-1">Recibido</span>
                              <div className="flex items-center gap-2">
                                <input 
                                  type="number" 
                                  min="0"
                                  value={item.receivedQuantity}
                                  onChange={(e) => updateReceivedQuantity(order.id, idx, parseInt(e.target.value) || 0)}
                                  className="w-16 px-2 py-1 text-center font-bold text-emerald-700 bg-white border border-emerald-200 rounded focus:ring-2 focus:ring-emerald-500 outline-none"
                                />
                              </div>
                            </div>

                            <button 
                              onClick={(e) => { e.stopPropagation(); deleteOrderItem(order.id, idx); }}
                              className="p-2 ml-1 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              title="Eliminar producto del pedido"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Conciliation Section */}
                    <div className="mt-6 p-5 bg-white rounded-xl border border-slate-200">
                      <div className="flex items-center gap-2 mb-4">
                        <CheckSquareIcon className="w-5 h-5 text-indigo-600" />
                        <h4 className="font-black text-slate-800">Conciliación de Pagos</h4>
                      </div>
                      
                      {order.conciliado ? (
                        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-indigo-50/50 p-4 rounded-lg border border-indigo-100">
                          <div>
                            <p className="text-sm text-slate-500 mb-1">Monto Facturado Real</p>
                            <p className="text-2xl font-black text-indigo-700">C$ {order.monto_factura_real?.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits:2})}</p>
                            {order.notas_recepcion && <p className="text-xs text-slate-600 mt-2 font-medium bg-white p-2 rounded border border-slate-200">{order.notas_recepcion}</p>}
                          </div>
                          <div className="text-right">
                            <span className="inline-block bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-xs font-bold mb-2">Conciliado</span>
                            <p className="text-xs text-slate-400">El {new Date(order.fecha_recepcion || '').toLocaleDateString()}</p>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-bold text-slate-500 mb-1">Monto de la Factura (C$)</label>
                              <input 
                                type="number" 
                                step="0.01"
                                value={conciliacionEdit[order.id]?.monto || ''}
                                onChange={(e) => setConciliacionEdit(prev => ({...prev, [order.id]: {...prev[order.id], monto: e.target.value}}))}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-bold"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-slate-500 mb-1">Diferencia con lo estimado</label>
                              {(() => {
                                const currentMonto = parseFloat(conciliacionEdit[order.id]?.monto || '0');
                                const diff = currentMonto - order.total;
                                return (
                                  <div className={cn("px-3 py-2 rounded-lg font-bold border", diff > 0 ? "bg-rose-50 text-rose-700 border-rose-200" : diff < 0 ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-50 text-slate-700 border-slate-200")}>
                                    {diff > 0 ? "+" : ""}C$ {diff.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits:2})}
                                  </div>
                                )
                              })()}
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">Notas de Recepción (Faltantes, vencimientos, etc.)</label>
                            <textarea
                               value={conciliacionEdit[order.id]?.notas || ''}
                               onChange={(e) => setConciliacionEdit(prev => ({...prev, [order.id]: {...prev[order.id], notas: e.target.value}}))}
                               className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm resize-none"
                               rows={2}
                            />
                          </div>
                          <div className="flex justify-end pt-2">
                            <button 
                              onClick={() => handleConciliar(order.id)}
                              className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-lg font-bold transition-colors"
                            >
                              Marcar como Conciliado
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      </>
      )}
    </div>
  );
}
