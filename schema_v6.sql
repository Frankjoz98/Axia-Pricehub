-- ============================================================
-- SCHEMA V6: Agregar columnas operativas (cajero, vendedor, cliente)
-- Ejecutar en Supabase SQL Editor
-- ============================================================

ALTER TABLE public.ventas_historicas 
ADD COLUMN IF NOT EXISTS cajero text,
ADD COLUMN IF NOT EXISTS vendedor text,
ADD COLUMN IF NOT EXISTS cliente text;
