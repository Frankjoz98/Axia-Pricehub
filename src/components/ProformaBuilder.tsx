import { useState, useMemo } from 'react';
import { Search, Plus, Trash2, Printer, BriefcaseMedical, AlertCircle, ShoppingBag, Receipt } from 'lucide-react';
import type { OdooInventario } from '../types';

interface ProformaBuilderProps {
  inventario: OdooInventario[];
}

interface ProformaItem extends OdooInventario {
  cartQuantity: number;
}

const EXAMPLE_BOTIQUIN = [
  "ALCOHOL BLANCO 100%",
  "JABON IODO POVIDONA 100GR",
  "VENDA GASA 3 X 1O YARDAS",
  "MICROPORE 2.5CM X 10 YDS PIEL",
  "SULFADIAZINA DE PLATA 1 % CREMA TOPICA TUBO X 30 G",
  "DICLOFENACO SODICO GEL TOPICO 1%",
  "VIROGRIP DIA",
  "IRS TABLETA C*60",
  "ACTIMICINA BRONQUIAL SOBRE X 4",
  "CETIRIZINA 10MG X 30 TAB R",
  "DIFENHIDRAMINA 25 MG",
  "IBUPROFENO 800 MG TAB 800 MG TABLETA ORAL RECUBIERTA .",
  "IBUPROFENO 600 MG TAB 600 MG TABLETA ORAL RECUBIERTA .",
  "DEXKETOPROFENO 25 MG X 100 TAB R",
  "NOVALGINA C *100 TAB",
  "ACETAMINOFEN 500 MG CAPLETAS CAJA X 100",
  "MIGRETIL 20 MG",
  "AVAMIGRAN TAB DISP*100",
  "TOALLA FEMENINA KOTEX ESENCIAL NOR S/A",
  "ESPADIVA",
  "DORIVAL",
  "ALKA AD",
  "ENTERO AMEBAK 250 MG TABLETA ORAL CAJA X 100",
  "ALKA GASTRIC"
];

export default function ProformaBuilder({ inventario }: ProformaBuilderProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [proformaItems, setProformaItems] = useState<ProformaItem[]>([]);

  // Search results
  const searchResults = useMemo(() => {
    if (!searchTerm.trim()) return [];
    const query = searchTerm.toLowerCase();
    return inventario
      .filter(i => 
        i.product_name.toLowerCase().includes(query) || 
        (i.marca && i.marca.toLowerCase().includes(query)) ||
        (i.referencia && i.referencia.toLowerCase().includes(query))
      )
      .slice(0, 15); // limit results
  }, [inventario, searchTerm]);

  const handleAddItem = (item: OdooInventario) => {
    setProformaItems(prev => {
      const existing = prev.find(p => p.product_name === item.product_name);
      if (existing) {
        return prev.map(p => p.product_name === item.product_name ? { ...p, cartQuantity: p.cartQuantity + 1 } : p);
      }
      return [...prev, { ...item, cartQuantity: 1 }];
    });
  };

  const handleUpdateQuantity = (name: string, delta: number) => {
    setProformaItems(prev => {
      return prev.map(p => {
        if (p.product_name === name) {
          const newQty = Math.max(1, p.cartQuantity + delta);
          return { ...p, cartQuantity: newQty };
        }
        return p;
      });
    });
  };

  const handleRemoveItem = (name: string) => {
    setProformaItems(prev => prev.filter(p => p.product_name !== name));
  };

  const handleLoadExample = () => {
    const itemsToAdd: ProformaItem[] = [];
    EXAMPLE_BOTIQUIN.forEach(name => {
      const found = inventario.find(i => i.product_name === name);
      if (found) {
        itemsToAdd.push({ ...found, cartQuantity: 1 });
      }
    });
    setProformaItems(itemsToAdd);
  };

  const totalPrecio = proformaItems.reduce((acc, item) => acc + (item.precio * item.cartQuantity), 0);
  const totalCosto = proformaItems.reduce((acc, item) => acc + (item.costo * item.cartQuantity), 0);
  const totalGanancia = totalPrecio - totalCosto;
  const rentabilidad = totalPrecio > 0 ? (totalGanancia / totalPrecio) * 100 : 0;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-140px)] print-wrapper">
      {/* LEFT PANEL: Search and Results */}
      <div className="w-full lg:w-80 xl:w-96 flex flex-col gap-4 bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-sm overflow-hidden min-h-100 hide-on-print shrink-0">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
          <div className="bg-rose-100 p-2 rounded-xl">
            <BriefcaseMedical className="w-6 h-6 text-rose-600" />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-900">Catálogo</h2>
            <p className="text-xs text-slate-500">Busca para agregar al botiquín</p>
          </div>
        </div>

        <div className="relative">
          <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar producto..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-rose-500"
          />
        </div>

        <div className="flex-1 overflow-y-auto space-y-2">
          {searchTerm.trim() && searchResults.length === 0 && (
            <div className="text-center py-10 text-slate-400">
              No se encontraron productos
            </div>
          )}
          
          {searchResults.map((item, i) => (
            <div key={`${item.product_name}-${i}`} className="flex flex-col gap-2 p-3 rounded-xl border border-slate-100 hover:border-rose-100 hover:bg-rose-50/30 transition-colors">
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-slate-800 text-sm leading-tight">{item.product_name}</h4>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] uppercase font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">{item.marca || 'Sin Marca'}</span>
                  <span className="text-[10px] text-slate-500">Stock: {item.stock}</span>
                </div>
              </div>
              <div className="flex items-center justify-between mt-1 pt-2 border-t border-slate-50">
                <div>
                  <p className="font-black text-slate-900 text-sm">C$ {item.precio.toFixed(2)}</p>
                </div>
                <button
                  onClick={() => handleAddItem(item)}
                  className="px-3 py-1.5 bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white rounded-lg transition-colors text-xs font-bold flex items-center gap-1"
                  title="Agregar a Proforma"
                >
                  <Plus className="w-4 h-4" /> Agregar
                </button>
              </div>
            </div>
          ))}

          {!searchTerm.trim() && (
            <div className="text-center py-10 text-slate-400 flex flex-col items-center gap-2">
              <Search className="w-8 h-8 opacity-20" />
              <p className="text-xs">Busca productos</p>
            </div>
          )}
        </div>
      </div>

      {/* RIGHT PANEL: Proforma / Botiquin */}
      <div className="flex-1 flex flex-col gap-4 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden print-area-container">
        <div className="p-4 sm:p-6 border-b border-slate-100 flex items-center justify-between bg-slate-900 text-white hide-on-print">
          <div className="flex items-center gap-3">
            <Receipt className="w-6 h-6 text-rose-400" />
            <h2 className="text-lg font-black">Proforma de Botiquín</h2>
          </div>
          {proformaItems.length > 0 && (
            <button 
              onClick={() => setProformaItems([])}
              className="text-xs font-bold text-slate-400 hover:text-rose-400 transition-colors"
            >
              Limpiar
            </button>
          )}
        </div>
        
        {/* Print Header (Only visible on print) */}
        <div className="hidden print:block p-6 border-b border-slate-200">
          <h1 className="text-2xl font-black text-slate-900">Proforma / Cotización</h1>
          <p className="text-slate-500 mt-1">Generada el {new Date().toLocaleDateString()}</p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3">
          {proformaItems.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-3 hide-on-print">
              <ShoppingBag className="w-12 h-12 opacity-20" />
              <p className="text-sm font-medium">El botiquín está vacío</p>
              <button 
                onClick={handleLoadExample}
                className="mt-4 px-4 py-2 bg-rose-50 text-rose-600 hover:bg-rose-100 hover:text-rose-700 font-bold rounded-lg text-sm transition-colors border border-rose-100"
              >
                Cargar Botiquín Recomendado
              </button>
            </div>
          ) : (
            <>
              {/* Desktop/Print Table Header */}
              <div className="hidden sm:flex gap-4 pb-2 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <div className="flex-1">Producto</div>
                <div className="w-24 text-center">Cant.</div>
                <div className="w-24 text-right">Precio Unit.</div>
                <div className="w-24 text-right">Subtotal</div>
                <div className="w-8"></div> {/* Spacer for delete button */}
              </div>
              
              {proformaItems.map(item => (
                <div key={item.product_name} className="flex flex-col sm:flex-row gap-2 sm:gap-4 items-start sm:items-center p-3 sm:p-0 rounded-xl sm:rounded-none bg-slate-50 sm:bg-transparent border border-slate-100 sm:border-0 sm:border-b sm:py-3 relative group">
                  <div className="flex-1 w-full min-w-0">
                    <h4 className="font-bold text-slate-800 text-sm truncate" title={item.product_name}>{item.product_name}</h4>
                  </div>
                  
                  <div className="w-full sm:w-24 flex justify-between sm:justify-center items-center mt-2 sm:mt-0 hide-on-print shrink-0">
                    <div className="flex items-center bg-white rounded-lg border border-slate-200 p-0.5">
                      <button onClick={() => handleUpdateQuantity(item.product_name, -1)} className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-slate-900 rounded-md hover:bg-slate-50">-</button>
                      <span className="w-8 text-center text-xs font-bold">{item.cartQuantity}</span>
                      <button onClick={() => handleUpdateQuantity(item.product_name, 1)} className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-slate-900 rounded-md hover:bg-slate-50">+</button>
                    </div>
                  </div>
                  <div className="hidden print:block sm:w-24 text-center text-sm shrink-0">{item.cartQuantity}</div>
                  
                  <div className="w-full sm:w-24 flex justify-between sm:justify-end text-sm mt-1 sm:mt-0 shrink-0">
                    <span className="sm:hidden text-slate-400 text-xs">Precio U.:</span>
                    <span className="text-slate-500">C$ {item.precio.toFixed(2)}</span>
                  </div>
                  
                  <div className="w-full sm:w-24 flex justify-between sm:justify-end text-sm mt-1 sm:mt-0 font-bold shrink-0">
                    <span className="sm:hidden text-slate-400 text-xs">Total:</span>
                    <span className="text-rose-600">C$ {(item.precio * item.cartQuantity).toFixed(2)}</span>
                  </div>
                  
                  <div className="absolute right-2 top-2 sm:static sm:w-8 flex justify-end hide-on-print shrink-0">
                    <button
                      onClick={() => handleRemoveItem(item.product_name)}
                      className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                      title="Eliminar"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>

        <div className="p-4 sm:p-6 border-t border-slate-100 bg-slate-50 print:bg-white print:border-t-2">
          <div className="space-y-2 mb-4">
            <div className="flex justify-between items-center text-sm text-slate-500 hide-on-print">
              <span>Subtotal (Costo)</span>
              <span>C$ {totalCosto.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center text-sm text-slate-500 hide-on-print">
              <span>Ganancia Estimada</span>
              <span className="text-emerald-600 font-bold">C$ {totalGanancia.toFixed(2)} ({rentabilidad.toFixed(1)}%)</span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-slate-200 print:border-0 print:pt-0">
              <span className="font-bold text-slate-800 text-lg">Total</span>
              <span className="text-2xl font-black text-slate-900">C$ {totalPrecio.toFixed(2)}</span>
            </div>
          </div>

          <button
            onClick={handlePrint}
            disabled={proformaItems.length === 0}
            className="w-full py-3 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-colors hide-on-print"
          >
            <Printer className="w-5 h-5" /> Imprimir Proforma
          </button>
          <p className="text-center text-[10px] text-slate-400 mt-3 flex items-center justify-center gap-1 hide-on-print">
            <AlertCircle className="w-3 h-3" /> Imprime o guarda como PDF para enviar al cliente
          </p>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body {
            background-color: white;
            margin: 0;
            padding: 0;
          }
          header, nav, .hide-on-print {
            display: none !important;
          }
          .print-wrapper {
            display: block !important;
            height: auto !important;
          }
          .print-area-container {
            width: 100% !important;
            border: none !important;
            box-shadow: none !important;
          }
        }
      `}} />
    </div>
  );
}
