-- ============================================================
-- VERIFICACIÓN post-migración 20260918000000_auditoria_seguridad.sql
-- Solo lecturas. Ejecutar en el SQL Editor y comparar con lo esperado.
-- ============================================================

-- 1. Perfiles: todos los usuarios con rol; solo caja@axia.com debe ser 'caja'
SELECT u.email, p.rol
FROM auth.users u LEFT JOIN public.perfiles p ON p.user_id = u.id
ORDER BY u.email;

-- 2. Políticas: cada tabla sensible debe tener exactamente una política "solo admin"
SELECT tablename, policyname, roles, cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('productos','ventas_historicas','inventario_local','configuracion',
                    'ordenes_compra','proveedores','facturas_compra','fichas_tecnicas',
                    'citas_medicas','pedidos_sugeridos','perfiles')
ORDER BY tablename, policyname;

-- 3. anon NO debe aparecer con privilegios sobre ninguna tabla del esquema public
SELECT table_name, privilege_type
FROM information_schema.role_table_grants
WHERE grantee = 'anon' AND table_schema = 'public'
ORDER BY table_name;
-- Esperado: 0 filas

-- 4. Columnas nuevas presentes
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND ((table_name = 'inventario_local' AND column_name = 'impulso_medico')
    OR (table_name = 'configuracion'     AND column_name = 'portal_token')
    OR (table_name = 'ordenes_compra'    AND column_name IN ('monto_factura_real','fecha_recepcion','notas_recepcion','conciliado')))
ORDER BY table_name, column_name;
-- Esperado: 6 filas

-- 5. Funciones del portal y de rol existen y anon solo puede ejecutar las portal_*
SELECT p.proname, pg_get_function_identity_arguments(p.oid) AS args,
       has_function_privilege('anon', p.oid, 'EXECUTE') AS anon_execute
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.proname IN ('auth_rol','portal_token_valido','portal_catalogo_impulso','portal_citas','portal_actualizar_cita')
ORDER BY p.proname;
-- Esperado: auth_rol y portal_token_valido → false; portal_* → true

-- 6. Las RPC responden con el token real
SELECT count(*) AS productos_impulso
FROM public.portal_catalogo_impulso((SELECT portal_token FROM public.configuracion WHERE id = 'global'));

SELECT * FROM public.portal_citas((SELECT portal_token FROM public.configuracion WHERE id = 'global'), current_date);

-- 7. Con un token falso no devuelven nada
SELECT count(*) AS debe_ser_cero
FROM public.portal_catalogo_impulso('token-falso-token-falso');

-- 8. Token para construir el enlace del médico: https://<app>/portal-medico?k=<portal_token>
SELECT portal_token FROM public.configuracion WHERE id = 'global';
