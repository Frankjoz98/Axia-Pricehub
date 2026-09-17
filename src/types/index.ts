export type Category = string;

export type ProviderName = 
  | 'DICEGSA' 
  | 'LETERAGO' 
  | 'DIDELSA' 
  | 'DISMEDIC' 
  | 'IMFARSA' 
  | 'VESANIC' 
  | 'WALMART / MAYORISTA'
  | 'LOCAL'
  | string;

export type NivelPrioridad = 1 | 2 | 3;

export interface SupplierOffer {
  provider: ProviderName;
  basePrice: number;
  discount: number;
  netPrice: number;
  providerCode: string;
  bonusScale?: {
    buy: number;
    free: number;
  };
}

export interface UnifiedProduct {
  id: string;
  name: string;
  activeIngredient: string;
  category: Category;
  offers: SupplierOffer[];
  isPriority?: boolean;
  nivel: NivelPrioridad;
  _searchIndex?: string; // Pre-computed search string
}

export interface CartItem {
  product: UnifiedProduct;
  selectedOffer: SupplierOffer;
  quantity: number;
}

export interface AppConfig {
  id: string;
  budget_percent: number;
  nivel1_percent: number;
  nivel2_percent: number;
  nivel3_percent: number;
  nombre_farmacia: string;
  updated_at?: string;
}

export interface VentaHistorica {
  id: string;
  odoo_id?: string;
  order_ref: string;
  date: string;
  product_name: string;
  category: string;
  marca?: string;
  cajero?: string;
  vendedor?: string;
  cliente?: string;
  unit_price: number;
  quantity: number;
  total_cost: number;
  margin: number;
  sesion?: string;
}

export interface OdooInventario {
  id: string;
  odoo_id?: string;
  product_name: string;
  marca?: string;
  referencia?: string;
  precio: number;
  costo: number;
  stock: number;
  categoria?: string;
  fecha_vencimiento?: string;
  impulso_medico?: boolean;
  updated_at?: string;
}

export type OrderStatus = 'Pendiente' | 'Parcial' | 'Completado';

export interface PurchaseOrderItem {
  productId: string;
  productName: string;
  providerCode: string;
  orderedQuantity: number;
  receivedQuantity: number;
  netPrice: number; // Stored for internal tracking, but not sent
}

export interface PurchaseOrder {
  id: string;
  provider: ProviderName;
  created_at: string;
  status: OrderStatus;
  items: PurchaseOrderItem[];
  total: number;
  monto_factura_real?: number;
  fecha_recepcion?: string;
  notas_recepcion?: string;
  conciliado?: boolean;
}

// --- Módulo de Proveedores ---

export type TipoPrecio = 'descuento' | 'precio_liso' | 'mixto';
export type InvoiceStatus = 'pendiente' | 'pagada' | 'vencida';

export interface Proveedor {
  id: string;
  nombre: string;
  numero_cliente?: string;
  contacto_nombre?: string;
  contacto_telefono?: string;
  contacto_email?: string;
  dias_credito?: number;
  dia_entrega?: string;
  tipo_precio?: TipoPrecio;
  porcentaje_descuento?: number;
  tiene_bonificacion: boolean;
  detalle_bonificacion?: string;
  politica_vencidos?: string;
  notas_generales?: string;
  activo: boolean;
  created_at: string;
  updated_at?: string;
}

export interface FacturaCompra {
  id: string;
  proveedor_id: string;
  numero_factura: string;
  fecha_factura: string;
  fecha_vencimiento?: string;
  monto_total: number;
  estado: InvoiceStatus;
  imagenes?: string[];
  notas?: string;
  created_at: string;
}

// --- Módulo de Agenda e IA ---

export type TipoAgenda = 'tarea' | 'visita_proveedor' | 'pago' | 'recordatorio' | 'ai_sugerencia';
export type PrioridadAgenda = 'baja' | 'media' | 'alta' | 'urgente';

export interface AgendaEvento {
  id: string;
  user_id: string;
  titulo: string;
  descripcion?: string;
  tipo: TipoAgenda;
  prioridad: PrioridadAgenda;
  fecha: string;
  hora_inicio?: string;
  hora_fin?: string;
  completado: boolean;
  recurrente: boolean;
  patron_recurrencia?: Record<string, any>;
  proveedor_id?: string;
  factura_id?: string;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at?: string;
}

export interface DailyBriefing {
  greeting: string;
  topPriorities: string[];
  insights: string[];
  suggestedActions: string[];
}

export type CategoriaBitacora = 'general' | 'operativo' | 'comercial' | 'reunion' | 'sistema';

export interface BitacoraEntry {
  id: string;
  user_id: string;
  titulo: string;
  contenido: string;
  categoria: CategoriaBitacora;
  tags?: string[];
  vinculado_a_reunion?: string;
  created_at: string;
}

export interface ChecklistItem {
  id: string;
  texto: string;
  completado: boolean;
}

export interface Meta {
  id: string;
  user_id: string;
  titulo: string;
  descripcion?: string;
  fecha_limite?: string;
  prioridad: 'baja' | 'media' | 'alta';
  completada: boolean;
  checklist: ChecklistItem[];
  created_at: string;
  updated_at?: string;
}

// --- Módulo de Pedidos (Dependientes) ---
export type TipoPedido = 'encargo_cliente' | 'sugerencia' | 'esencial' | 'quiebre_stock';
export type EstadoPedido = 'pendiente' | 'pedido' | 'recibido' | 'archivado';

export type EstadoCita = 'pendiente' | 'atendido' | 'cancelado';

export interface CitaMedica {
  id: string;
  paciente: string;
  fecha: string; // YYYY-MM-DD
  hora: string;
  estado: EstadoCita;
  created_at: string;
}

export interface PedidoSugerido {
  id: string;
  producto_nombre: string;
  laboratorio?: string;
  cantidad_sugerida: number;
  tipo_pedido: TipoPedido;
  nombre_cliente?: string;
  comentarios?: string;
  registrado_por: string;
  estado: EstadoPedido;
  created_at: string;
  procesado_at?: string;
  recibido_at?: string;
}

