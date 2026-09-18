-- ============================================================
-- SCHEMA V9: Migración a Odoo ID para Inventario y Ventas
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- 1. Agregar columna odoo_id a inventario_local si no existe
ALTER TABLE public.inventario_local 
ADD COLUMN IF NOT EXISTS odoo_id text;

-- 2. Eliminar restricción de unicidad anterior sobre product_name
ALTER TABLE public.inventario_local 
DROP CONSTRAINT IF EXISTS inventario_local_product_name_key;

-- 3. Crear restricción de unicidad sobre odoo_id
ALTER TABLE public.inventario_local 
DROP CONSTRAINT IF EXISTS inventario_local_odoo_id_key;

ALTER TABLE public.inventario_local 
ADD CONSTRAINT inventario_local_odoo_id_key UNIQUE (odoo_id);

-- 4. Agregar columna odoo_id a ventas_historicas si no existe
ALTER TABLE public.ventas_historicas 
ADD COLUMN IF NOT EXISTS odoo_id text;

-- 5. Crear índice para acelerar consultas por odoo_id
CREATE INDEX IF NOT EXISTS idx_inventario_odoo_id ON public.inventario_local(odoo_id);
CREATE INDEX IF NOT EXISTS idx_ventas_odoo_id ON public.ventas_historicas(odoo_id);
