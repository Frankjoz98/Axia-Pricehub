-- Parte A: Bitácora de Avances
CREATE TABLE IF NOT EXISTS bitacora_avances (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  titulo TEXT NOT NULL,
  contenido TEXT NOT NULL,
  categoria TEXT DEFAULT 'general' CHECK (categoria IN ('general', 'operativo', 'comercial', 'reunion', 'sistema')),
  tags TEXT[] DEFAULT '{}',
  vinculado_a_reunion DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE bitacora_avances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own bitacora"
  ON bitacora_avances FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Parte B: Metas
CREATE TABLE IF NOT EXISTS metas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  titulo TEXT NOT NULL,
  descripcion TEXT,
  fecha_limite DATE,
  prioridad TEXT DEFAULT 'media' CHECK (prioridad IN ('baja', 'media', 'alta')),
  completada BOOLEAN DEFAULT false,
  checklist JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE metas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own metas"
  ON metas FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Parte C: Vencimientos (Agregar columna a inventario)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='inventario_local' AND column_name='fecha_vencimiento'
  ) THEN
    ALTER TABLE inventario_local ADD COLUMN fecha_vencimiento DATE;
  END IF;
END $$;
