CREATE TABLE pedidos_sugeridos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  -- Datos del producto solicitado
  producto_nombre TEXT NOT NULL,
  laboratorio TEXT,
  cantidad_sugerida INTEGER DEFAULT 1,
  
  -- Contexto del pedido
  tipo_pedido TEXT NOT NULL DEFAULT 'sugerencia' 
    CHECK (tipo_pedido IN ('encargo_cliente', 'sugerencia', 'esencial', 'quiebre_stock')),
  nombre_cliente TEXT,
  comentarios TEXT,
  
  -- Quién lo registró
  registrado_por TEXT NOT NULL,
  
  -- Estado del flujo
  estado TEXT NOT NULL DEFAULT 'pendiente'
    CHECK (estado IN ('pendiente', 'pedido', 'recibido', 'archivado')),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  procesado_at TIMESTAMPTZ,
  recibido_at TIMESTAMPTZ,
  
  -- Seguridad
  user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid()
);

-- RLS: Cualquier usuario autenticado puede insertar y leer (idealmente podríamos limitarlo pero por ahora todos autenticados pueden)
ALTER TABLE pedidos_sugeridos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read" ON pedidos_sugeridos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert" ON pedidos_sugeridos FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update" ON pedidos_sugeridos FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete" ON pedidos_sugeridos FOR DELETE TO authenticated USING (true);
