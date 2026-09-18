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
-- 2. Roles de usuario (admin / caja) — mínimo privilegio
--    El registro público está desactivado. Se siembra un perfil para cada usuario existente:
--    'caja' para caja@axia.com y 'admin' para el resto. Un usuario SIN perfil (creado después
--    en el dashboard) es 'caja' hasta que un admin le asigne rol.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.perfiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  rol text NOT NULL DEFAULT 'caja' CHECK (rol IN ('admin', 'caja')),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.perfiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "perfil propio lectura" ON public.perfiles;
CREATE POLICY "perfil propio lectura" ON public.perfiles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
REVOKE ALL ON public.perfiles FROM anon;

INSERT INTO public.perfiles (user_id, rol)
SELECT id, CASE WHEN email = 'caja@axia.com' THEN 'caja' ELSE 'admin' END
FROM auth.users
ON CONFLICT (user_id) DO NOTHING;

UPDATE public.perfiles SET rol = 'caja'
WHERE user_id IN (SELECT id FROM auth.users WHERE email = 'caja@axia.com');

CREATE OR REPLACE FUNCTION public.auth_rol()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((SELECT rol FROM public.perfiles WHERE user_id = auth.uid()), 'caja');
$$;
REVOKE ALL ON FUNCTION public.auth_rol() FROM public;
GRANT EXECUTE ON FUNCTION public.auth_rol() TO authenticated;

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
-- 4. Portal médico (público, sin login) — acceso por TOKEN vía funciones RPC
--    El rol anon NO tiene privilegios sobre ninguna tabla ni vista. Solo puede invocar
--    tres funciones SECURITY DEFINER que exigen el token guardado en `configuracion.portal_token`.
--    El médico recibe un enlace del tipo https://<app>/portal-medico?k=<token>.
--    Para rotar el acceso: UPDATE configuracion SET portal_token = md5(random()::text || clock_timestamp()::text);
-- ------------------------------------------------------------
ALTER TABLE public.configuracion
  ADD COLUMN IF NOT EXISTS portal_token text NOT NULL DEFAULT md5(random()::text || clock_timestamp()::text);

CREATE OR REPLACE FUNCTION public.portal_token_valido(p_token text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p_token IS NOT NULL AND length(p_token) >= 16
     AND EXISTS (SELECT 1 FROM public.configuracion WHERE id = 'global' AND portal_token = p_token);
$$;
REVOKE ALL ON FUNCTION public.portal_token_valido(text) FROM public;

-- a) Catálogo de impulso: solo columnas no sensibles (sin precio ni costo)
CREATE OR REPLACE FUNCTION public.portal_catalogo_impulso(p_token text)
RETURNS TABLE (odoo_id text, product_name text, stock numeric, marca text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT i.odoo_id, i.product_name, i.stock, i.marca
  FROM public.inventario_local i
  WHERE public.portal_token_valido(p_token)
    AND i.impulso_medico = true AND i.stock > 0
  ORDER BY i.stock DESC
  LIMIT 200;
$$;

-- b) Citas del día
CREATE OR REPLACE FUNCTION public.portal_citas(p_token text, p_fecha date)
RETURNS TABLE (id uuid, paciente text, fecha text, hora text, estado text, created_at timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- Casts explícitos: funciona aunque la tabla real guarde fecha/hora como date/time o como text
  SELECT c.id, c.paciente, c.fecha::text, c.hora::text, c.estado, c.created_at
  FROM public.citas_medicas c
  WHERE public.portal_token_valido(p_token) AND c.fecha::date = p_fecha
  ORDER BY c.hora::text;
$$;

-- c) Cambiar SOLO el estado de una cita
CREATE OR REPLACE FUNCTION public.portal_actualizar_cita(p_token text, p_id uuid, p_estado text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.portal_token_valido(p_token) THEN
    RAISE EXCEPTION 'token inválido' USING ERRCODE = '28000';
  END IF;
  IF p_estado NOT IN ('pendiente', 'atendido', 'cancelado') THEN
    RAISE EXCEPTION 'estado inválido';
  END IF;
  UPDATE public.citas_medicas SET estado = p_estado WHERE id = p_id;
  RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION public.portal_catalogo_impulso(text) FROM public;
REVOKE ALL ON FUNCTION public.portal_citas(text, date) FROM public;
REVOKE ALL ON FUNCTION public.portal_actualizar_cita(text, uuid, text) FROM public;
GRANT EXECUTE ON FUNCTION public.portal_catalogo_impulso(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.portal_citas(text, date) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.portal_actualizar_cita(text, uuid, text) TO anon, authenticated;

-- d) Citas: los usuarios autenticados (caja/admin) las gestionan directamente; anon nunca toca la tabla
DROP POLICY IF EXISTS "citas anon lectura" ON public.citas_medicas;
DROP POLICY IF EXISTS "citas anon estado" ON public.citas_medicas;
DROP POLICY IF EXISTS "citas autenticados" ON public.citas_medicas;
CREATE POLICY "citas autenticados" ON public.citas_medicas
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
REVOKE ALL ON public.citas_medicas FROM anon;

-- Limpieza de la vista pública si existiera de una versión previa de esta migración
DROP VIEW IF EXISTS public.inventario_impulso_publico;

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
