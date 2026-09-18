-- ============================================================
-- SCHEMA V5: Agregar columna 'marca' a ventas históricas
-- Ejecutar en Supabase SQL Editor
-- ============================================================

ALTER TABLE public.ventas_historicas 
ADD COLUMN IF NOT EXISTS marca text;
