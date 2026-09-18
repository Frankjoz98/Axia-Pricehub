import { useState } from 'react';
import { Save, Upload, Trash2, Download, RefreshCw, FileSpreadsheet, Package, UploadCloud, Sliders, Settings } from 'lucide-react';
import Papa from 'papaparse';
import { cn, downloadFile, toDbProduct } from '../lib/utils';
import { supabase } from '../supabase';
import type { AppConfig, UnifiedProduct, VentaHistorica, OdooInventario } from '../types';

interface SettingsPanelProps {
  config: AppConfig;
  setConfig: (c: AppConfig) => void;
  productos: UnifiedProduct[];
  ventas: VentaHistorica[];
  inventario?: OdooInventario[];
  onRefreshCatalog: () => void;
  onRefreshVentas: () => void;
  onRefreshInventario?: () => void;
  onClearCart: () => void;
}

export default function SettingsPanel({ config, setConfig, productos, ventas, onRefreshCatalog, onRefreshVentas, onClearCart, inventario, onRefreshInventario }: SettingsPanelProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isUploadingCatalog, setIsUploadingCatalog] = useState(false);
  const [isUploadingInventario, setIsUploadingInventario] = useState(false);
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [localConfig, setLocalConfig] = useState(config);

  const [dragActiveVentas, setDragActiveVentas] = useState(false);
  const [dragActiveCatalog, setDragActiveCatalog] = useState(false);
  const [dragActiveInventario, setDragActiveInventario] = useState(false);
  const [dragActiveLotes, setDragActiveLotes] = useState(false);
  const [isUploadingLotes, setIsUploadingLotes] = useState(false);

  const saveConfig = async () => {
    setIsSavingConfig(true);
    const updated = { ...localConfig, updated_at: new Date().toISOString() };
    const { error } = await supabase.from('configuracion').upsert(updated);
    if (error) {
      alert('Error guardando configuración: ' + error.message);
    } else {
      setConfig(updated);
      alert('Configuración guardada exitosamente en la nube.');
    }
    setIsSavingConfig(false);
  };

  const clearVentas = async () => {
    if (!confirm('⚠️ ADVERTENCIA: Estás a punto de ELIMINAR TODO EL HISTÓRICO DE VENTAS de la base de datos. Esto es útil si vas a subir un nuevo reporte completo y quieres evitar duplicados. ¿Estás absolutamente seguro?')) return;
    
    try {
      const { error } = await supabase.from('ventas_historicas').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (error) throw error;
      alert('✅ Histórico de ventas purgado con éxito. Ahora puedes subir el archivo CSV fresco.');
      onRefreshVentas();
    } catch (err: any) {
      alert('Error vaciando ventas: ' + err.message);
    }
  };

  const handleDrag = (e: React.DragEvent, setActive: (v: boolean) => void) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setActive(true);
    } else if (e.type === "dragleave") {
      setActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent, setActive: (v: boolean) => void, processFile: (f: File) => void) => {
    e.preventDefault();
    e.stopPropagation();
    setActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  // Odoo Sales CSV
  const processOdooUpload = (file: File) => {
    setIsUploading(true);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const rows = results.data as any[];
          
          if (rows.length > 0) {
            console.log("Ventas - Primera fila detectada:", Object.keys(rows[0]));
          }

          const getVal = (row: any, keys: string[]) => {
            const rowKeys = Object.keys(row);
            for (const searchKey of keys) {
              const match = rowKeys.find(k => k.toLowerCase().trim() === searchKey.toLowerCase().trim());
              if (match && row[match]) return row[match];
            }
            return '';
          };

          let lastOrderRef = '';
          let lastDate: string | null = null;
          let lastCajero = '';
          let lastVendedor = '';
          let lastCliente = '';
          let lastEstado = '';
          let lastSesion = '';

          const rawPayload = [];
          for (const row of rows) {
            const orderRefRaw = getVal(row, ['Ref. de la orden', 'Referencia de la orden', 'Referencia']);
            
            // Si la referencia contiene palabras clave de ajustes de inventario, ignoramos la fila
            if (orderRefRaw && (
              orderRefRaw.toLowerCase().includes('actualizada') || 
              orderRefRaw.toLowerCase().includes('ajuste') || 
              orderRefRaw.toLowerCase().includes('adjustment') ||
              orderRefRaw.toLowerCase().includes('inventario')
            )) {
              continue;
            }

            const destino = getVal(row, ['A', 'Ubicación destino', 'Destino', 'Hacia', 'To']);
            if (destino && !destino.toLowerCase().includes('customer') && !destino.toLowerCase().includes('cliente')) {
              continue; // Ignorar movimientos que no van a clientes (ej. de ajuste a stock)
            }

            if (orderRefRaw) {
              lastOrderRef = orderRefRaw;
              const dateVal = getVal(row, ['Fecha']);
              lastDate = dateVal ? new Date(dateVal.replace(' ', 'T')).toISOString() : null;
              lastCajero = getVal(row, ['Cajero']) || 'Sin Asignar';
              lastVendedor = getVal(row, ['Vendedor']) || 'Sin Asignar';
              lastCliente = getVal(row, ['Cliente']) || 'Consumidor Final';
              lastEstado = getVal(row, ['Estado', 'Status']) || '';
              lastSesion = getVal(row, ['Sesión', 'Session', 'Referencia de sesión']) || '';
            }

            if (lastEstado.toLowerCase().includes('cancelado')) {
              continue;
            }

            const odoo_id = getVal(row, ['Líneas de la orden/Producto/ID', 'ID', 'odoo_id']);
            const product_name = getVal(row, ['Líneas de la orden/Producto/Nombre', 'Líneas de la orden/Nombre completo del producto', 'Producto', 'Nombre']);
            
            if (!product_name) continue;

            rawPayload.push({
              order_ref: lastOrderRef,
              date: lastDate,
              odoo_id: odoo_id.trim() || null,
              product_name: product_name.trim(),
              category: getVal(row, ['Líneas de la orden/Producto/Categoría del producto', 'Categoría del producto']).trim() || 'Sin Categoria',
              marca: getVal(row, ['Líneas de la orden/Producto/Marca', 'Marca']).trim() || 'Sin Marca',
              cajero: lastCajero,
              vendedor: lastVendedor,
              cliente: lastCliente,
              quantity: parseFloat(String(getVal(row, ['Líneas de la orden/Cantidad', 'Cantidad']) || '0').replace(/,/g, '')),
              unit_price: parseFloat(String(getVal(row, ['Líneas de la orden/Precio unitario', 'Precio unitario']) || '0').replace(/,/g, '')),
              total_cost: parseFloat(String(getVal(row, ['Líneas de la orden/Costo total', 'Costo total']) || '0').replace(/,/g, '')),
              sesion: lastSesion
            });
          }

          // Deduplicate and aggregate based on composite key (order_ref + odoo_id fallback product_name)
          const aggregatedPayloadMap = new Map();
          for (const row of rawPayload) {
            // Ignorar filas huerfanas (sin order_ref)
            if (!row.order_ref) continue;
            
            const line_id = `${row.sesion}-${row.order_ref}-${row.odoo_id || row.product_name}`;
            
            if (aggregatedPayloadMap.has(line_id)) {
              const existing = aggregatedPayloadMap.get(line_id);
              existing.quantity += row.quantity;
              existing.total_cost += row.total_cost;
              existing.unit_price = existing.quantity > 0 ? (existing.unit_price * (existing.quantity - row.quantity) + row.unit_price * row.quantity) / existing.quantity : row.unit_price;
              if (row.odoo_id && !existing.odoo_id) existing.odoo_id = row.odoo_id;
            } else {
              aggregatedPayloadMap.set(line_id, { ...row, line_id });
            }
          }
          const upsertPayload = Array.from(aggregatedPayloadMap.values());

          if (upsertPayload.length === 0) { alert("No se encontraron registros válidos."); setIsUploading(false); return; }

          let totalRevenueInCSV = 0;
          for (const row of upsertPayload) {
             totalRevenueInCSV += (row.quantity * row.unit_price);
          }
          alert(`📊 ANÁLISIS DEL CSV:\nEl archivo que acabas de subir contiene un total de facturación de: C$ ${totalRevenueInCSV.toFixed(2)} (sumando todas las fechas).`);

          const chunkSize = 200; // Reducido para evitar TypeError: Failed to fetch (Payload Too Large / Timeout)
          for (let i = 0; i < upsertPayload.length; i += chunkSize) {
            const { error } = await supabase.from('ventas_historicas').upsert(upsertPayload.slice(i, i + chunkSize), { onConflict: 'line_id' });
            if (error) throw error;
          }
          alert(`✅ ${upsertPayload.length} registros procesados. Datos actualizados en la base de datos.`);
          onRefreshVentas();
        } catch (err: any) { alert('Error: ' + err.message); }
        finally { setIsUploading(false); }
      }
    });
  };

  const handleOdooUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) processOdooUpload(e.target.files[0]);
  };

  // Odoo Inventory CSV
  const processInventoryUpload = (file: File) => {
    setIsUploadingInventario(true);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const rows = results.data as any[];
          
          if (rows.length > 0) {
            console.log("Primera fila detectada:", Object.keys(rows[0]));
          }

          const getVal = (row: any, keys: string[]) => {
            const rowKeys = Object.keys(row);
            for (const searchKey of keys) {
              const match = rowKeys.find(k => k.toLowerCase().trim() === searchKey.toLowerCase().trim());
              if (match && row[match]) return row[match];
            }
            return '';
          };

          const rawPayload = rows
            .map(row => {
              const id = getVal(row, ['ID', 'ID externo', 'id', 'odoo_id', '.id']);
              if (!id) return null;

              return {
                odoo_id: id.trim(),
                product_name: getVal(row, ['Nombre', 'Producto', 'Nombre de producto', 'name']).trim() || 'Producto Sin Nombre',
                marca: getVal(row, ['Marca', 'product_brand_id']).trim() || 'Sin Marca',
                referencia: getVal(row, ['Referencia interna', 'default_code']).trim(),
                precio: parseFloat(String(getVal(row, ['Precio de venta', 'Precio', 'list_price']) || '0').replace(/,/g, '')),
                costo: parseFloat(String(getVal(row, ['Costo', 'standard_price']) || '0').replace(/,/g, '')),
                stock: parseFloat(String(getVal(row, ['Cantidad a la mano', 'Stock', 'qty_available']) || '0').replace(/,/g, '')),
                categoria: getVal(row, ['Categoría del producto', 'categ_id']).trim() || 'Sin Categoria',
              };
            })
            .filter((row): row is NonNullable<typeof row> => row !== null);

          // Deduplicate
          const seen = new Set();
          const dedupedPayload = rawPayload.filter(row => {
            const key = row.odoo_id;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          });

          if (dedupedPayload.length === 0) { alert("No se encontraron registros válidos o falta la columna ID."); setIsUploadingInventario(false); return; }

          // Modo Snapshot con preservación: los campos que NO vienen de Odoo (impulso_medico,
          // fecha_vencimiento) se conservan por odoo_id; el CSV manda en stock, precio y costo.
          const preservedByOdooId = new Map<string, { impulso_medico?: boolean; fecha_vencimiento?: string }>();
          (inventario || []).forEach(inv => {
            if (inv.odoo_id) preservedByOdooId.set(inv.odoo_id, { impulso_medico: inv.impulso_medico ?? false, fecha_vencimiento: inv.fecha_vencimiento });
          });

          const upsertPayload = dedupedPayload.map(row => {
            const preserved = preservedByOdooId.get(row.odoo_id);
            return {
              ...row,
              impulso_medico: preserved?.impulso_medico ?? false,
              fecha_vencimiento: preserved?.fecha_vencimiento ?? null,
              updated_at: new Date().toISOString()
            };
          });

          const chunkSize = 200;
          for (let i = 0; i < upsertPayload.length; i += chunkSize) {
            const { error } = await supabase.from('inventario_local').upsert(upsertPayload.slice(i, i + chunkSize), { onConflict: 'odoo_id' });
            if (error) throw error;
          }

          // Productos que ya no están en Odoo: se eliminan (stock fantasma). Se hace DESPUÉS del upsert
          // para que un fallo a mitad de carga nunca deje la tabla vacía.
          const csvIds = new Set(upsertPayload.map(r => r.odoo_id));
          const staleIds = (inventario || []).filter(inv => inv.odoo_id && !csvIds.has(inv.odoo_id)).map(inv => inv.id);
          for (let i = 0; i < staleIds.length; i += 200) {
            const { error } = await supabase.from('inventario_local').delete().in('id', staleIds.slice(i, i + 200));
            if (error) throw error;
          }
          alert(`✅ ${upsertPayload.length} productos de inventario sincronizados (Snapshot). ${staleIds.length} productos ya no existen en Odoo y fueron retirados.`);
          if (onRefreshInventario) onRefreshInventario();
        } catch (err: any) { alert('Error: ' + err.message); }
        finally { setIsUploadingInventario(false); }
      }
    });
  };

  const handleInventoryUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) processInventoryUpload(e.target.files[0]);
  };

  // Lotes/Vencimientos CSV
  const processLotesUpload = (file: File) => {
    setIsUploadingLotes(true);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const rows = results.data as any[];
          
          const getVal = (row: any, keys: string[]) => {
            const rowKeys = Object.keys(row);
            for (const searchKey of keys) {
              const match = rowKeys.find(k => k.toLowerCase().trim() === searchKey.toLowerCase().trim());
              if (match && row[match]) return row[match];
            }
            return '';
          };

          const lotesToUpdate = new Map<string, string>(); // referencia -> fecha más cercana

          rows.forEach(row => {
            const productoStr = getVal(row, ['Producto', 'Product']);
            let fechaStr = getVal(row, ['Fecha de caducidad', 'Expiration Date', 'expiration_time']);
            
            if (!productoStr || !fechaStr || fechaStr === '0' || fechaStr === '') return;

            // Odoo's display_name format: "[REF] Product Name" or just "Product Name"
            let cleanName = productoStr.trim();
            let ref = null;
            const refMatch = productoStr.match(/^\[(.*?)\]\s*(.*)$/);
            if (refMatch) {
              ref = refMatch[1].trim();
              cleanName = refMatch[2].trim();
            }

            // Buscar el id real del producto cruzando con el inventario actual
            const matchedProduct = inventario?.find(i => 
              (ref && i.referencia === ref) || 
              (i.product_name.toLowerCase() === cleanName.toLowerCase())
            );

            if (!matchedProduct) return; // Si no lo encuentra en DB, lo salta

            const productId = matchedProduct.id;

            // Limpiar fecha a YYYY-MM-DD
            fechaStr = fechaStr.split(' ')[0];

            // Guardar solo la fecha más próxima
            if (lotesToUpdate.has(productId)) {
              const existingDate = lotesToUpdate.get(productId)!;
              if (fechaStr < existingDate) {
                lotesToUpdate.set(productId, fechaStr);
              }
            } else {
              lotesToUpdate.set(productId, fechaStr);
            }
          });

          if (lotesToUpdate.size === 0) {
            alert("No se encontraron fechas de vencimiento válidas en el archivo.");
            setIsUploadingLotes(false);
            return;
          }

          const entries = Array.from(lotesToUpdate.entries());
          
          // Actualizar en Supabase usando el ID (UUID)
          let updateCount = 0;
          for (let i = 0; i < entries.length; i += 20) {
            const chunk = entries.slice(i, i + 20);
            await Promise.all(
              chunk.map(async ([productId, fecha]) => {
                const { error } = await supabase.from('inventario_local')
                  .update({ fecha_vencimiento: fecha })
                  .eq('id', productId);
                if (!error) updateCount++;
              })
            );
          }

          alert(`✅ Se actualizaron las fechas de vencimiento de ${updateCount} productos.`);
          if (onRefreshInventario) onRefreshInventario();
        } catch (err: any) { alert('Error: ' + err.message); }
        finally { setIsUploadingLotes(false); }
      }
    });
  };

  const handleLotesUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) processLotesUpload(e.target.files[0]);
  };

  // Catalog CSV
  const processCatalogUpload = (file: File) => {
    setIsUploadingCatalog(true);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const rows = results.data as any[];
          const existingMap = new Map(productos.map(p => [p.name.toLowerCase().trim(), JSON.parse(JSON.stringify(p))]));
          let newProductsCount = 0;
          let updatedOffersCount = 0;

          rows.forEach(row => {
            // Flexible column resolution
            const name = (
              row['nombre_producto'] || 
              row['nombre'] || 
              row['producto'] || 
              row['descripcion'] || 
              row['Descripcion'] || 
              row['Producto'] || 
              ''
            ).trim();
            if (!name) return;

            const provider = (
              row['proveedor'] || 
              row['laboratorio'] || 
              row['marca'] || 
              row['Marca'] || 
              row['Proveedor'] || 
              'PAISAS'
            ).trim();

            const code = (
              row['codigo_proveedor'] || 
              row['codigo'] || 
              row['Codigo'] || 
              row['Código'] || 
              ''
            ).trim();

            const basePrice = parseFloat(
              String(row['precio_base'] || row['precio'] || row['Precio'] || row['precio_neto'] || '0').replace(/,/g, '')
            ) || 0;

            const discount = parseFloat(
              String(row['descuento_porcentaje'] || row['descuento'] || row['Descuento'] || '0').replace(/,/g, '')
            ) || 0;

            const netPrice = parseFloat(
              String(row['precio_neto'] || row['precio'] || row['Precio'] || row['precio_base'] || '0').replace(/,/g, '')
            ) || basePrice;

            const buy = parseInt(row['escala_compra'] || '0') || 0;
            const free = parseInt(row['escala_regalo'] || '0') || 0;

            const offer = {
              provider,
              providerCode: code,
              basePrice,
              discount,
              netPrice,
              ...(buy > 0 && free > 0 ? { bonusScale: { buy, free } } : {})
            };

            const nameKey = name.toLowerCase();

            if (existingMap.has(nameKey)) {
              const p = existingMap.get(nameKey)!;
              const idx = p.offers.findIndex((o: any) => o.provider.toLowerCase() === provider.toLowerCase());
              if (idx >= 0) {
                p.offers[idx] = offer;
              } else {
                p.offers.push(offer);
              }
              updatedOffersCount++;
            } else {
              existingMap.set(nameKey, {
                id: crypto.randomUUID(),
                name,
                activeIngredient: row['ingrediente_activo'] || row['principio_activo'] || provider,
                category: row['categoria'] || 'General',
                nivel: parseInt(row['nivel']) || 2,
                offers: [offer]
              });
              newProductsCount++;
            }
          });

          // Quitar propiedades solo-frontend antes de guardar en DB
          const payload = Array.from(existingMap.values()).map(p => toDbProduct(p as UnifiedProduct));

          if (payload.length === 0) { 
            alert("No se encontraron registros válidos en el archivo."); 
            setIsUploadingCatalog(false); 
            return; 
          }

          const chunkSize = 500;
          for (let i = 0; i < payload.length; i += chunkSize) {
            const chunk = payload.slice(i, i + chunkSize);
            const { error } = await supabase.from('productos').upsert(chunk);
            if (error) throw error;
          }

          alert(`✅ Catálogo sincronizado con éxito!\n• ${newProductsCount} productos nuevos agregados\n• ${updatedOffersCount} ofertas actualizadas\n• Total en base de datos: ${payload.length}`);
          onRefreshCatalog();
        } catch (err: any) { 
          alert('Error al subir catálogo: ' + err.message); 
        } finally { 
          setIsUploadingCatalog(false); 
        }
      }
    });
  };

  const handleCatalogUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) processCatalogUpload(e.target.files[0]);
    e.target.value = '';
  };

  const forceUpdate = () => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(registrations => {
        registrations.forEach(r => r.unregister());
      });
    }
    caches.keys().then(names => names.forEach(name => caches.delete(name)));
    alert('Caché limpiado. La página se recargará con la última versión.');
    window.location.reload();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300 max-w-2xl mx-auto">
      {/* Config Panel */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <h2 className="text-lg font-black text-slate-900 mb-4 flex items-center gap-2"><Sliders className="w-5 h-5 text-violet-600" /> Centro de Control Financiero</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Nombre de la Farmacia</label>
            <input type="text" value={localConfig.nombre_farmacia} onChange={e => setLocalConfig({ ...localConfig, nombre_farmacia: e.target.value })}
              className="w-full px-4 py-3 bg-slate-50 border rounded-xl outline-none focus:ring-2 focus:ring-violet-500" />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Presupuesto Máximo de Compras (%)</label>
            <div className="flex items-center gap-3">
              <input type="number" step="0.01" value={localConfig.budget_percent} onChange={e => setLocalConfig({ ...localConfig, budget_percent: Number(e.target.value) })}
                className="flex-1 px-4 py-3 bg-slate-50 border rounded-xl outline-none focus:ring-2 focus:ring-violet-500 text-lg font-bold" />
              <span className="text-slate-400 font-bold text-lg">%</span>
            </div>
            <p className="text-xs text-slate-400 mt-1">Porcentaje del total de ventas semanales destinado a compras.</p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-emerald-700 mb-1">Nivel 1 (%)</label>
              <input type="number" value={localConfig.nivel1_percent} onChange={e => setLocalConfig({ ...localConfig, nivel1_percent: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 font-bold text-center" />
            </div>
            <div>
              <label className="block text-xs font-bold text-amber-700 mb-1">Nivel 2 (%)</label>
              <input type="number" value={localConfig.nivel2_percent} onChange={e => setLocalConfig({ ...localConfig, nivel2_percent: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl outline-none focus:ring-2 focus:ring-amber-500 font-bold text-center" />
            </div>
            <div>
              <label className="block text-xs font-bold text-blue-700 mb-1">Nivel 3 (%)</label>
              <input type="number" value={localConfig.nivel3_percent} onChange={e => setLocalConfig({ ...localConfig, nivel3_percent: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-blue-50 border border-blue-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-center" />
            </div>
          </div>
          {(localConfig.nivel1_percent + localConfig.nivel2_percent + localConfig.nivel3_percent) !== 100 && (
            <p className="text-xs text-rose-500 font-bold bg-rose-50 p-2 rounded-lg text-center">⚠️ La suma de los niveles debe ser 100%. Actualmente: {localConfig.nivel1_percent + localConfig.nivel2_percent + localConfig.nivel3_percent}%</p>
          )}
          <button onClick={saveConfig} disabled={isSavingConfig}
            className="w-full py-3 bg-linear-to-r from-violet-600 to-violet-700 hover:from-violet-700 hover:to-violet-800 disabled:opacity-50 text-white font-bold rounded-xl shadow-lg shadow-violet-500/20 flex items-center justify-center gap-2 transition-all">
            <Save className="w-4 h-4" /> {isSavingConfig ? 'Guardando...' : 'Guardar Configuración en la Nube'}
          </button>
        </div>
      </div>

      {/* Importers */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <h2 className="text-lg font-black text-slate-900 mb-2 flex items-center gap-2"><Upload className="w-5 h-5 text-blue-600" /> Importar Ventas Odoo</h2>
          <p className="text-sm text-slate-500 mb-4">Sube tu CSV de Odoo POS con ID del producto.</p>
          <label 
            onDragEnter={(e) => handleDrag(e, setDragActiveVentas)}
            onDragLeave={(e) => handleDrag(e, setDragActiveVentas)}
            onDragOver={(e) => handleDrag(e, setDragActiveVentas)}
            onDrop={(e) => handleDrop(e, setDragActiveVentas, processOdooUpload)}
            className={cn("flex flex-col items-center justify-center w-full h-28 border-2 border-dashed rounded-xl cursor-pointer transition-all duration-200",
            dragActiveVentas ? "border-blue-500 bg-blue-50 scale-105" : isUploading ? "border-emerald-500 bg-emerald-50" : "border-slate-300 bg-slate-50 hover:bg-slate-100")}>
            {isUploading ? <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-500" /> : <Upload className="w-7 h-7 text-slate-400 mb-1" />}
            <p className="text-sm text-slate-500">{isUploading ? 'Procesando...' : <><span className="font-bold text-blue-600">Subir o arrastrar</span> Ventas</>}</p>
            <input type="file" className="hidden" accept=".csv" disabled={isUploading} onChange={handleOdooUpload} />
          </label>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <h2 className="text-lg font-black text-slate-900 mb-2 flex items-center gap-2"><FileSpreadsheet className="w-5 h-5 text-emerald-600" /> Importar Catálogo</h2>
          <p className="text-sm text-slate-500 mb-2">Sube la plantilla estándar de Axia para actualizar precios.</p>
          <label 
            onDragEnter={(e) => handleDrag(e, setDragActiveCatalog)}
            onDragLeave={(e) => handleDrag(e, setDragActiveCatalog)}
            onDragOver={(e) => handleDrag(e, setDragActiveCatalog)}
            onDrop={(e) => handleDrop(e, setDragActiveCatalog, processCatalogUpload)}
            className={cn("flex flex-col items-center justify-center w-full h-28 border-2 border-dashed rounded-xl cursor-pointer transition-all duration-200",
            dragActiveCatalog ? "border-emerald-500 bg-emerald-50 scale-105" : isUploadingCatalog ? "border-emerald-500 bg-emerald-50" : "border-slate-300 bg-slate-50 hover:bg-slate-100")}>
            {isUploadingCatalog ? <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-500" /> : <FileSpreadsheet className="w-7 h-7 text-slate-400 mb-1" />}
            <p className="text-sm text-slate-500">{isUploadingCatalog ? 'Sincronizando...' : <><span className="font-bold text-emerald-600">Subir o arrastrar</span> Catálogo</>}</p>
            <input type="file" className="hidden" accept=".csv" disabled={isUploadingCatalog} onChange={handleCatalogUpload} />
          </label>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <h2 className="text-lg font-black text-slate-900 mb-2 flex items-center gap-2"><Package className="w-5 h-5 text-indigo-600" /> Stock Real</h2>
          <p className="text-sm text-slate-500 mb-4">Exporta inventario de Odoo con la columna ID.</p>
          <label 
            onDragEnter={(e) => handleDrag(e, setDragActiveInventario)}
            onDragLeave={(e) => handleDrag(e, setDragActiveInventario)}
            onDragOver={(e) => handleDrag(e, setDragActiveInventario)}
            onDrop={(e) => handleDrop(e, setDragActiveInventario, processInventoryUpload)}
            className={cn("flex flex-col items-center justify-center w-full h-28 border-2 border-dashed rounded-xl cursor-pointer transition-all duration-200",
            dragActiveInventario ? "border-indigo-500 bg-indigo-50 scale-105" : isUploadingInventario ? "border-emerald-500 bg-emerald-50" : "border-slate-300 bg-slate-50 hover:bg-slate-100")}>
            {isUploadingInventario ? <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-500" /> : <UploadCloud className="w-7 h-7 text-slate-400 mb-1" />}
            <p className="text-sm text-slate-500">{isUploadingInventario ? 'Procesando...' : <><span className="font-bold text-indigo-600">Subir o arrastrar</span> Inventario</>}</p>
            <input type="file" className="hidden" accept=".csv" disabled={isUploadingInventario} onChange={handleInventoryUpload} />
          </label>
          {inventario && inventario.length > 0 && <p className="text-xs text-center mt-2 text-slate-500 font-bold">{inventario.length} registros cargados</p>}
        </div>
      </div>

      {/* Lotes Upload Section */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <h2 className="text-lg font-black text-slate-900 mb-2 flex items-center gap-2"><FileSpreadsheet className="w-5 h-5 text-rose-600" /> Fechas de Vencimiento (Lotes)</h2>
        <p className="text-sm text-slate-500 mb-4">Opcional: Exporta los Lotes/Números de Serie desde Odoo para sincronizar las fechas de caducidad en tu Agenda.</p>
        <label 
          onDragEnter={(e) => handleDrag(e, setDragActiveLotes)}
          onDragLeave={(e) => handleDrag(e, setDragActiveLotes)}
          onDragOver={(e) => handleDrag(e, setDragActiveLotes)}
          onDrop={(e) => handleDrop(e, setDragActiveLotes, processLotesUpload)}
          className={cn("flex flex-col items-center justify-center w-full h-28 border-2 border-dashed rounded-xl cursor-pointer transition-all duration-200",
          dragActiveLotes ? "border-rose-500 bg-rose-50 scale-105" : isUploadingLotes ? "border-emerald-500 bg-emerald-50" : "border-slate-300 bg-slate-50 hover:bg-slate-100")}>
          {isUploadingLotes ? <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-500" /> : <UploadCloud className="w-7 h-7 text-slate-400 mb-1" />}
          <p className="text-sm text-slate-500">{isUploadingLotes ? 'Procesando...' : <><span className="font-bold text-rose-600">Subir o arrastrar</span> CSV de Lotes</>}</p>
          <input type="file" className="hidden" accept=".csv" disabled={isUploadingLotes} onChange={handleLotesUpload} />
        </label>
      </div>

      {/* Tools */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <h2 className="text-lg font-black text-slate-900 mb-4 flex items-center gap-2"><Settings className="w-5 h-5 text-slate-600" /> Herramientas</h2>
        <div className="grid grid-cols-1 sm:grid-cols-1 gap-3">
          <button onClick={() => downloadFile({ productos, ventas, configuracion: config }, `axia_backup_total_${new Date().toISOString().split('T')[0]}.json`)}
            className="py-3 bg-slate-900 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-slate-800 transition-colors">
            <Download className="w-4 h-4" /> Descargar Respaldo Total
          </button>
          <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
            <div className="flex gap-4">
              <button
                onClick={forceUpdate}
                className="text-xs font-semibold px-4 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors flex items-center gap-2"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Forzar Recarga Completa
              </button>
              <button
                onClick={clearVentas}
                className="text-xs font-semibold px-4 py-2 bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-100 transition-colors flex items-center gap-2"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Purgar Ventas
              </button>
            </div>
          </div>
          <button onClick={onClearCart}
            className="py-3 bg-rose-100 text-rose-700 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-rose-200 transition-colors sm:col-span-2">
            <Trash2 className="w-4 h-4" /> Vaciar Carrito Completo
          </button>
        </div>
      </div>

      <p className="text-center text-xs text-slate-400 pb-4">Axia PriceHub Pro v3.0 • Powered by Supabase + React</p>
    </div>
  );
}
