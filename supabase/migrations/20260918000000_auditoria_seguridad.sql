-- ============================================================
-- AUDITORÍA DE SEGURIDAD (2026-09-18)
-- Versiona objetos que existían solo en el dashboard y endurece RLS.
-- Idempotente: se puede ejecutar más de una vez.
-- REQUIERE CONFIRMACIÓN antes de aplicarse en svylytekfqhzuiouzral (ver .agents/rules/supabase_safety.md)
-- ============================================================

-- ------------------------------------------------------------
-- 1. Objetos que faltaban en el repositorio
-- ------------------------------------------------------------
ALTER TABLE public.inventario_local
  ADD COLUMN IF NOT EXISTS impulso_medico boolean NOT NULL DEFAULT false;

ALTER TABLE public.ordenes_compra
  ADD COLUMN IF NOT EXISTS monto_factura_real numeric,
  ADD COLUMN IF NOT EXISTS fecha_recepcion date,
  ADD COLUMN IF NOT EXISTS notas_recepcion text,
  ADD COLUMN IF NOT EXISTS conciliado boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.citas_medicas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  paciente text NOT NULL,
  fecha date NOT NULL,
  hora text NOT NULL,
  estado text NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'atendido', 'cancelado')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_citas_fecha ON public.citas_medicas(fecha);
ALTER TABLE public.citas_medicas ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------
-- 2. Roles de usuario (admin / caja)
--    El registro público está desactivado, así que solo existen usuarios conocidos.
--    Un usuario sin fila en `perfiles` se trata como 'admin' para no bloquear al dueño;
--    el usuario de caja se registra explícitamente abajo.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.perfiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  rol text NOT NULL DEFAULT 'admin' CHECK (rol IN ('admin', 'caja')),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.perfiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "perfil propio lectura" ON public.perfiles;
CREATE POLICY "perfil propio lectura" ON public.perfiles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

INSERT INTO public.perfiles (user_id, rol)
SELECT id, 'caja' FROM auth.users WHERE email = 'caja@axia.com'
ON CONFLICT (user_id) DO UPDATE SET rol = 'caja';

CREATE OR REPLACE FUNCTION public.auth_rol()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((SELECT rol FROM public.perfiles WHERE user_id = auth.uid()), 'admin');
$$;
REVOKE ALL ON FUNCTION public.auth_rol() FROM public;
GRANT EXECUTE ON FUNCTION public.auth_rol() TO authenticated, anon;

-- ------------------------------------------------------------
-- 3. Tablas sensibles: solo rol admin
-- ------------------------------------------------------------
DO $$
DECLARE
  t text;
  pol record;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'productos', 'ventas_historicas', 'inventario_local', 'configuracion',
    'ordenes_compra', 'proveedores', 'facturas_compra', 'fichas_tecnicas'
  ] LOOP
    -- Eliminar todas las políticas previas de la tabla (incluidas las creadas a mano en el dashboard)
    FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = t LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, t);
    END LOOP;
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format(
      'CREATE POLICY "solo admin" ON public.%I FOR ALL TO authenticated USING (public.auth_rol() = ''admin'') WITH CHECK (public.auth_rol() = ''admin'')',
      t
    );
    -- El rol anon no debe tocar tablas sensibles bajo ninguna política
    EXECUTE format('REVOKE ALL ON public.%I FROM anon', t);
  END LOOP;
END $$;

-- ------------------------------------------------------------
-- 4. Portal médico (público, sin login)
--    a) Vista con columnas mínimas del catálogo de impulso. Corre como owner, por lo que
--       no expone precio/costo ni el resto del inventario.
-- ------------------------------------------------------------
CREATE OR REPLACE VIEW public.inventario_impulso_publico AS
  SELECT odoo_id, product_name, stock, marca
  FROM public.inventario_local
  WHERE impulso_medico = true AND stock > 0;

REVOKE ALL ON public.inventario_impulso_publico FROM public;
GRANT SELECT ON public.inventario_impulso_publico TO anon, authenticated;

--    b) Citas: autenticados (caja/admin) tienen acceso total.
--       anon puede leer y SOLO actualizar la columna `estado` (privilegio de columna + RLS).
DROP POLICY IF EXISTS "citas autenticados" ON public.citas_medicas;
CREATE POLICY "citas autenticados" ON public.citas_medicas
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "citas anon lectura" ON public.citas_medicas;
CREATE POLICY "citas anon lectura" ON public.citas_medicas
  FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "citas anon estado" ON public.citas_medicas;
CREATE POLICY "citas anon estado" ON public.citas_medicas
  FOR UPDATE TO anon USING (true) WITH CHECK (true);

REVOKE ALL ON public.citas_medicas FROM anon;
GRANT SELECT ON public.citas_medicas TO anon;
GRANT UPDATE (estado) ON public.citas_medicas TO anon;

-- ------------------------------------------------------------
-- 5. Pedidos de dependientes: cualquier autenticado (caja y admin), nunca anon
-- ------------------------------------------------------------
REVOKE ALL ON public.pedidos_sugeridos FROM anon;

-- Realtime: asegurar que citas y pedidos publiquen cambios
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'citas_medicas') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.citas_medicas;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'pedidos_sugeridos') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.pedidos_sugeridos;
  END IF;
END $$;
