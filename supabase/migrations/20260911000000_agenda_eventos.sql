CREATE TABLE IF NOT EXISTS agenda_eventos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  titulo TEXT NOT NULL,
  descripcion TEXT,
  tipo TEXT NOT NULL CHECK (tipo IN ('tarea', 'visita_proveedor', 'pago', 'recordatorio', 'ai_sugerencia')),
  prioridad TEXT DEFAULT 'media' CHECK (prioridad IN ('baja', 'media', 'alta', 'urgente')),
  fecha DATE NOT NULL,
  hora_inicio TIME,
  hora_fin TIME,
  completado BOOLEAN DEFAULT false,
  recurrente BOOLEAN DEFAULT false,
  patron_recurrencia JSONB,
  proveedor_id UUID REFERENCES proveedores(id),
  factura_id UUID REFERENCES facturas_compra(id),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agenda_fecha ON agenda_eventos(fecha);
CREATE INDEX IF NOT EXISTS idx_agenda_user_fecha ON agenda_eventos(user_id, fecha);
CREATE INDEX IF NOT EXISTS idx_agenda_tipo ON agenda_eventos(tipo);

ALTER TABLE agenda_eventos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own agenda events"
  ON agenda_eventos FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own agenda events"
  ON agenda_eventos FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own agenda events"
  ON agenda_eventos FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own agenda events"
  ON agenda_eventos FOR DELETE
  USING (auth.uid() = user_id);
