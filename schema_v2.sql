-- 1. Crear tabla de ventas históricas
CREATE TABLE public.ventas_historicas (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  order_ref text NOT NULL,
  date timestamp with time zone,
  product_name text NOT NULL,
  category text,
  unit_price numeric DEFAULT 0,
  quantity numeric DEFAULT 0,
  total_cost numeric DEFAULT 0, -- Costo de Odoo (COGS)
  margin numeric GENERATED ALWAYS AS ((unit_price * quantity) - total_cost) STORED,
  -- Restricción clave: Evita que la misma línea de la misma factura se duplique
  UNIQUE(order_ref, product_name)
);

-- 2. Asegurar ambas tablas con RLS (Row Level Security)
-- Primero la tabla de productos que ya existía (eliminar reglas públicas y hacerlas autenticadas)
DROP POLICY IF EXISTS "Permitir lectura pública" ON public.productos;
DROP POLICY IF EXISTS "Permitir modificación pública" ON public.productos;

CREATE POLICY "Lectura solo a usuarios autenticados" ON public.productos FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Modificación solo a usuarios autenticados" ON public.productos FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- 3. Habilitar seguridad en ventas_historicas
ALTER TABLE public.ventas_historicas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acceso total a ventas solo a usuarios autenticados" ON public.ventas_historicas FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
