# Regla de Seguridad Supabase: Aislamiento de Cuentas y Protección de Datos

## 1. Identificación y Aislamiento de Servidores MCP
- **Proyecto Actual:** Axia PriceHub
- **Servidor MCP Autorizado:** `supabase` (cuenta corporativa `farmaxia26@gmail.com`)
- **ID de Proyecto Oficial:** `svylytekfqhzuiouzral`
- **Servidor NO Autorizado:** `supabase-mcp-server` (cuenta personal / BioVet / otros)

## 2. Validación de Proyecto Obligatoria (Anti-Alucinación)
En cualquier llamada a herramientas MCP de Supabase:
- El parámetro `project_id` DEBE ser explícitamente `svylytekfqhzuiouzral`.
- Si una herramienta no recibe o desconoce el `project_id`, abortar y verificar antes de ejecutar.
- NUNCA apuntar operaciones a proyectos ajenos (`nhktvfqdhfzpkkjwdxjk`, `gahlyhuaivanaamaaaab`, `uhcwysejjvbbcqgzobsd`, `mbyehidcijxaavedlgux`).

## 3. Protección de Datos en Producción
- **Prohibición Total:** Comandos destructivos como `DROP TABLE`, `TRUNCATE`, `DELETE` masivos en tablas de producción (`productos`, `ventas_historicas`, `inventario_local`).
- **Cambios Estructurales (DDL):** Todo cambio debe estar especificado previamente en `docs/spec.md` y confirmado con el usuario antes de aplicarse.
