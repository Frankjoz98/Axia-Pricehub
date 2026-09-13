-- Migración para sanear duplicados y cambiar el identificador único

-- 1. Agregar columna line_id
ALTER TABLE ventas_historicas ADD COLUMN IF NOT EXISTS line_id TEXT;

-- 2. Rellenar line_id para todas las filas existentes
UPDATE ventas_historicas
SET line_id = sesion || '-' || order_ref || '-' || COALESCE(odoo_id, product_name)
WHERE line_id IS NULL;

-- 3. Saneamiento: Eliminar duplicados manteniendo solo la fila más reciente
DELETE FROM ventas_historicas
WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY line_id ORDER BY id DESC) as rn
    FROM ventas_historicas
  ) t WHERE t.rn > 1
);

-- 4. Reemplazar la restricción de unicidad
-- Eliminar la antigua
ALTER TABLE ventas_historicas DROP CONSTRAINT IF EXISTS ventas_historicas_sesion_order_ref_product_name_key;
-- Crear la nueva sobre line_id
ALTER TABLE ventas_historicas ADD CONSTRAINT ventas_historicas_line_id_key UNIQUE (line_id);
