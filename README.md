# Axia PriceHub

Sistema de cotización, inteligencia de negocios y sincronización de inventario para **Axia Farmacia 24/7** (Nicaragua). React 19 + TypeScript + Tailwind v4 + Supabase, desplegado en Netlify.

## Comandos

```bash
npm run dev         # servidor de desarrollo
npm run build       # tsc + vite build (obligatorio antes de dar por terminada una tarea)
npm test            # suite Vitest (npm run test:watch para modo interactivo)
```

## Variables de entorno

| Dónde | Variable | Uso |
|---|---|---|
| `.env.local` (cliente, no versionado) | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | Cliente Supabase del navegador |
| Netlify → Environment variables | `GEMINI_API_KEY` | Solo la función `netlify/functions/ai.mts`; **nunca** con prefijo `VITE_` |
| Netlify → Environment variables | `SUPABASE_URL`, `SUPABASE_ANON_KEY` | La función valida el JWT del usuario antes de llamar a Gemini |

## Estructura

```
src/
  App.tsx                  enrutador + aislamiento visual por rol (la seguridad real está en RLS)
  context/                 AppContext (sesión, rol, datos, presupuesto), CartContext, AlertsContext
  hooks/useBusinessMetrics métricas: sesiones, turnos, día operativo, tickets, stock muerto
  lib/dates.ts             fechas en hora local (nunca toISOString().split('T'))
  lib/odoo.ts              cruce ventas ↔ inventario por odoo_id (buildInventarioIndex)
  lib/facturas.ts, csv.ts  reglas de facturas vencidas, lectura de CSV de Odoo
  components/              Hubs (Inventory, Intelligence, Supplier, Agenda), Orders, Settings, DoctorPortal
netlify/functions/ai.mts   proxy server-side a Gemini (/api/ai)
supabase/migrations/       migraciones versionadas (aplicar en orden)
supabase/schema_legacy/    scripts SQL históricos v1–v9 (solo referencia)
scripts/convert/           conversores de catálogos de proveedores (PDF/OCR/CSV → plantilla Axia)
docs/spec.md               especificación funcional (SDD, notación EARS) — leer antes de tocar código
tmp/                       ignorado: scripts de debug y CSV de trabajo locales
```

## Portal médico

Ruta pública `/portal-medico?k=<token>`. El token vive en `configuracion.portal_token` y se copia desde **Ajustes**. Sin token válido el portal no muestra nada; el rol `anon` no tiene acceso a ninguna tabla, solo a las funciones RPC `portal_*`.

## Reglas del proyecto

Ver `AGENTS.md` (convenciones, seguridad de Supabase) y `docs/spec.md` (requisitos). Cualquier cambio de regla de negocio se documenta en el spec en el mismo commit.
