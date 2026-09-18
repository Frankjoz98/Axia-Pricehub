-- ============================================================
-- SCHEMA V3: Tabla de Configuración + Seguridad
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- 1. Crear tabla de configuración global
CREATE TABLE IF NOT EXISTS public.configuracion (
  id text PRIMARY KEY DEFAULT 'global',
  budget_percent numeric DEFAULT 71.15,
  nivel1_percent numeric DEFAULT 65,
  nivel2_percent numeric DEFAULT 25,
  nivel3_percent numeric DEFAULT 10,
  nombre_farmacia text DEFAULT 'Axia Farmacia 24/7',
  updated_at timestamp with time zone DEFAULT now()
);

-- 2. Insertar la configuración por defecto
INSERT INTO public.configuracion (id) VALUES ('global')
ON CONFLICT (id) DO NOTHING;

-- 3. Habilitar seguridad RLS
ALTER TABLE public.configuracion ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acceso config solo autenticados" ON public.configuracion
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');
