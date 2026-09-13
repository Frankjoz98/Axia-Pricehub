import { supabase } from '../supabase';
import { removeAccents } from '../lib/utils';
import type { UnifiedProduct, VentaHistorica, OdooInventario, PurchaseOrder, AppConfig, Proveedor, FacturaCompra } from '../types';

export const api = {
  async fetchCatalog(): Promise<UnifiedProduct[]> {
    let all: UnifiedProduct[] = [];
    let from = 0;
    const step = 1000;
    while (true) {
      const { data, error } = await supabase.from('productos').select('*').order('id').range(from, from + step - 1);
      if (error || !data || data.length === 0) break;
      const processed = (data as UnifiedProduct[]).map(p => {
        const parts = [
          p.name,
          p.activeIngredient,
          p.category,
          ...(p.offers || []).map(o => `${o.provider} ${o.providerCode}`)
        ];
        p._searchIndex = removeAccents(parts.join(' ').toLowerCase());
        return p;
      });
      all = all.concat(processed);
      if (data.length < step) break;
      from += step;
    }
    return all;
  },

  async fetchVentas(): Promise<VentaHistorica[]> {
    let all: VentaHistorica[] = [];
    let from = 0;
    const step = 1000;
    while (true) {
      const { data, error } = await supabase.from('ventas_historicas').select('*').order('date', { ascending: false }).order('id').range(from, from + step - 1);
      if (error || !data || data.length === 0) break;
      all = all.concat(data as VentaHistorica[]);
      if (data.length < step) break;
      from += step;
    }
    return all;
  },

  async fetchInventario(): Promise<OdooInventario[]> {
    let all: OdooInventario[] = [];
    let from = 0;
    const step = 1000;
    while (true) {
      const { data, error } = await supabase.from('inventario_local').select('*').order('id').range(from, from + step - 1);
      if (error || !data || data.length === 0) break;
      all = all.concat(data as OdooInventario[]);
      if (data.length < step) break;
      from += step;
    }
    return all;
  },

  async fetchOrdenes(): Promise<PurchaseOrder[]> {
    const { data, error } = await supabase
      .from('ordenes_compra')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error || !data) return [];
    return data as PurchaseOrder[];
  },

  async fetchConfig(): Promise<AppConfig | null> {
    const { data } = await supabase.from('configuracion').select('*').eq('id', 'global').single();
    if (data) return data as AppConfig;
    return null;
  },

  // --- Proveedores ---

  async fetchProveedores(): Promise<Proveedor[]> {
    const { data, error } = await supabase.from('proveedores').select('*').order('nombre');
    if (error || !data) return [];
    return data as Proveedor[];
  },

  async createProveedor(proveedor: Partial<Proveedor>): Promise<Proveedor | null> {
    const { data, error } = await supabase.from('proveedores').insert([proveedor]).select().single();
    if (error) {
      console.error('Error creating proveedor:', error);
      return null;
    }
    return data as Proveedor;
  },

  async updateProveedor(id: string, updates: Partial<Proveedor>): Promise<Proveedor | null> {
    updates.updated_at = new Date().toISOString();
    const { data, error } = await supabase.from('proveedores').update(updates).eq('id', id).select().single();
    if (error) {
      console.error('Error updating proveedor:', error);
      return null;
    }
    return data as Proveedor;
  },

  // --- Facturas de Compra ---

  async fetchFacturas(): Promise<FacturaCompra[]> {
    const { data, error } = await supabase.from('facturas_compra').select('*').order('fecha_factura', { ascending: false });
    if (error || !data) return [];
    return data as FacturaCompra[];
  },

  async createFactura(factura: Partial<FacturaCompra>): Promise<FacturaCompra | null> {
    const { data, error } = await supabase.from('facturas_compra').insert([factura]).select().single();
    if (error) {
      console.error('Error creating factura:', error);
      return null;
    }
    return data as FacturaCompra;
  },

  async updateFactura(id: string, updates: Partial<FacturaCompra>): Promise<FacturaCompra | null> {
    const { data, error } = await supabase.from('facturas_compra').update(updates).eq('id', id).select().single();
    if (error) {
      console.error('Error updating factura:', error);
      return null;
    }
    return data as FacturaCompra;
  },

  async deleteFactura(id: string): Promise<boolean> {
    const { error } = await supabase.from('facturas_compra').delete().eq('id', id);
    if (error) {
      console.error('Error deleting factura:', error);
      return false;
    }
    return true;
  },

  async uploadFacturaImage(file: File, proveedorId: string, facturaId: string): Promise<string | null> {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = `${proveedorId}/${facturaId}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('facturas')
      .upload(filePath, file);

    if (uploadError) {
      console.error('Error uploading image:', uploadError);
      return null;
    }

    const { data } = supabase.storage.from('facturas').getPublicUrl(filePath);
    return data.publicUrl;
  }
};
