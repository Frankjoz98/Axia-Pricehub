-- ============================================================
-- SCHEMA V4: Tabla de Órdenes de Compra (Purchase Orders)
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- 1. Crear tabla de órdenes de compra
CREATE TABLE IF NOT EXISTS public.ordenes_compra (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  status text NOT NULL DEFAULT 'Pendiente', -- 'Pendiente', 'Parcial', 'Completado'
  items jsonb NOT NULL,
  total numeric DEFAULT 0
);

-- 2. Habilitar seguridad RLS
ALTER TABLE public.ordenes_compra ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acceso ordenes_compra solo autenticados" ON public.ordenes_compra
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');
