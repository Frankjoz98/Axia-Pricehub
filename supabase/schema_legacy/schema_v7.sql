-- ============================================================
-- SCHEMA V7: Tabla de Inventario de Odoo
-- Ejecutar en Supabase SQL Editor
-- ============================================================

CREATE TABLE public.inventario_local (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  product_name text NOT NULL UNIQUE,
  marca text,
  referencia text,
  precio numeric DEFAULT 0,
  costo numeric DEFAULT 0,
  stock numeric DEFAULT 0,
  categoria text,
  updated_at timestamp with time zone DEFAULT now()
);

-- RLS
ALTER TABLE public.inventario_local ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lectura a usuarios autenticados" ON public.inventario_local FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Modificacion a usuarios autenticados" ON public.inventario_local FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
