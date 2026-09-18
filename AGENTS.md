# AGENTS.md Axia PriceHub

## Proyecto

Axia PriceHub es un sistema de cotizacion, inteligencia de negocios y sincronizacion de inventario construido con React, TypeScript, TailwindCSS v4 y Supabase. Su principal funcion es importar y estructurar los catalogos y ventas extraidos de Odoo POS mediante su odoo_id y generar proformas precisas con matricas de rentabilidad.

## Comandos

- Iniciar Servidor:
  npm run dev
- Compilar:
  npm run build
- Tests:
  npm test

## Estilo y convenciones

- Lenguaje: React con TypeScript.
- Estilos: Tailwind CSS v4 nativo (no usar versiones antiguas o utilidades obsoletas como corchetes si hay una alternativa nativa).
- Arquitectura en la nube: Supabase (tablas principales: inventario_local,ventas_historicas).
- Manejo de CSVs: PapaParse.
- Respuestas de Agentes: Usa siempre Markdown estructurado.
- Lenguaje de comunicacion de codigo: Las variables y la estructura principal mantienen spanglish, pero se debe usar ingles para metodos estandar y español para comentarios descriptivos de dominio de negocio.

## Reglas SDD (Spec-Driven Development)

- **Cero improvisacion:** NUNCA inicies una nueva caracteristica o cambio estructural sin primero consultar y actualizar el archivo de especificaciones docs/spec.md.
- **Validacion EARS:** Todo nuevo requisito debe ser expresado mediante notacion EARS (Event-Driven, Ubiquitous Language) en docs/spec.md.
- **Protocolo de Autonomia:**
  1. Si recibes la etiqueta [PLAN]: No escribas codigo. Genera checklist.
  2. Si recibes la etiqueta [CODE]: Actualiza primero el spec.md, luego ejecuta codigo.
  3. Si recibes la etiqueta [FIX]: Analiza error, aplica correccion, verifica y no agregues nuevas funciones.
  4. Auto-Correccion Constante: Lee errores del terminal/consola y arréglalos iterativamente sin pedir permiso.

## Seguridad Crítica de Supabase y Aislamiento de Cuentas (Anti-Alucinación)

Para evitar confusión por exceso de contexto o mezcla de proyectos entre cuentas personales y corporativas:

1. **Aislamiento Estricto de Servidores MCP:**
   - **Entorno Axia PriceHub:** El ÚNICO servidor MCP autorizado para este proyecto es `supabase` (vinculado a `farmaxia26@gmail.com`).
   - **ID de Proyecto Único Autorizado:** `svylytekfqhzuiouzral`.
   - **PROHIBIDO:** Usar el servidor `supabase-mcp-server` (cuenta personal: BioVet, CentralDesignERP, amerrisque) en este repositorio bajo ninguna circunstancia sin orden explícita del usuario.
   - **Chequeo de Identidad:** Antes de cualquier llamada MCP de Supabase, la IA DEBE verificar que el `project_id` coincida exactamente con `svylytekfqhzuiouzral`.

2. **Políticas de Protección de Datos de Producción:**
   - **Acciones destructivas PROHIBIDAS de forma autónoma:** Jamás ejecutar `DROP TABLE`, `TRUNCATE`, `DELETE` masivos o alteraciones que destruyan datos en `productos`, `ventas_historicas`, `inventario_local` o `configuracion`.
   - **Lecturas e Inspección:** Las consultas `SELECT`, lectura de logs (`query_logs`), listado de esquemas (`list_tables`) y advisors de seguridad están autorizados.
   - **Modificaciones DDL/Esquema:** Cualquier cambio en la estructura de tablas o RLS debe figurar primero en `docs/spec.md` y solicitar confirmación si impacta datos existentes.

