-- ============================================================
-- PARCHE DE SEGURIDAD PARA AGENDA (2026-09-18)
-- Extensión de la auditoría de seguridad para las tablas de la agenda
-- que no fueron incluidas en el script anterior.
-- ============================================================

DO $$
DECLARE
  t text;
  pol record;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'agenda_eventos', 'bitacora_avances', 'metas'
  ] LOOP
    -- Eliminar todas las políticas previas de la tabla
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
