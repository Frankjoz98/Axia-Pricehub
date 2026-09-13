-- 1. Tabla de proveedores
CREATE TABLE proveedores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text UNIQUE NOT NULL,
  numero_cliente text,
  contacto_nombre text,
  contacto_telefono text,
  contacto_email text,
  dias_credito integer,
  dia_entrega text,
  tipo_precio text CHECK (tipo_precio IN ('descuento', 'precio_liso', 'mixto')),
  porcentaje_descuento numeric,
  tiene_bonificacion boolean NOT NULL DEFAULT false,
  detalle_bonificacion text,
  politica_vencidos text,
  notas_generales text,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz
);

-- 2. Tabla de facturas_compra
CREATE TABLE facturas_compra (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proveedor_id uuid NOT NULL REFERENCES proveedores(id) ON DELETE CASCADE,
  numero_factura text NOT NULL,
  fecha_factura date NOT NULL,
  fecha_vencimiento date,
  monto_total numeric NOT NULL,
  estado text NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'pagada', 'vencida')),
  imagenes text[],
  notas text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Índices para performance
CREATE INDEX idx_facturas_proveedor ON facturas_compra(proveedor_id);
CREATE INDEX idx_facturas_fecha ON facturas_compra(fecha_factura DESC);
CREATE INDEX idx_facturas_estado ON facturas_compra(estado);

-- 4. Habilitar RLS
ALTER TABLE proveedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE facturas_compra ENABLE ROW LEVEL SECURITY;

-- 5. Políticas de seguridad (Acceso completo para usuarios autenticados)
CREATE POLICY "Authenticated users full access proveedores"
  ON proveedores FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users full access facturas"
  ON facturas_compra FOR ALL USING (auth.role() = 'authenticated');

-- =========================================================================
-- INSTRUCCIONES MANUALES PARA EL BUCKET DE STORAGE
-- =========================================================================
-- 1. Ve al Dashboard de Supabase -> Storage
-- 2. Crea un nuevo bucket llamado "facturas" (Público: No)
-- 3. Ve a las políticas del bucket (Policies) y agrega:
--    - Nombre: "Permitir a usuarios autenticados leer facturas"
--    - Acceso: SELECT
--    - USING: auth.role() = 'authenticated'
--    - Nombre: "Permitir a usuarios autenticados subir/borrar facturas"
--    - Acceso: INSERT, UPDATE, DELETE
--    - WITH CHECK: auth.role() = 'authenticated'
-- =========================================================================
