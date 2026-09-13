# Axia PriceHub Pro — Ficha Técnica y Contexto del Proyecto

> **Última actualización:** 29 de Agosto 2026, 3:00 AM (GMT-6)
> **Versión:** 3.0 (Fase 5 Completada)
> **Estado:** ✅ Producción (Netlify + Supabase)

---

## 1. Visión General

**Axia PriceHub Pro** es una plataforma web/móvil (PWA) confidencial diseñada para la gestión inteligente de compras de **Axia Farmacia 24/7** (Nicaragua). Permite comparar precios entre proveedores farmacéuticos, controlar el presupuesto de compras con la "Regla del 71.15%", importar datos de ventas de Odoo POS, y generar reportes de inteligencia de negocios con gráficas de crecimiento.

**Odoo NO es fuente de verdad para compras ni inventario.** Odoo solo se usa como fuente de datos de ventas (el CSV exportado). Los lotes en Odoo son poco fiables. La app opera de forma 100% independiente.

---

## 2. Stack Tecnológico

| Capa | Tecnología | Versión |
|---|---|---|
| Frontend | React + TypeScript | React 19.2, TS 6.0 |
| Bundler | Vite | 8.2.2 |
| Estilos | Tailwind CSS | 4.3.3 |
| Gráficas | Recharts | Última estable |
| Búsqueda | Fuse.js | 7.5 |
| Parsing CSV | PapaParse | 5.7 |
| Íconos | Lucide React | 1.35 |
| Backend/Auth/DB | Supabase | 2.112+ |
| PWA | vite-plugin-pwa | 1.3.0 |
| Hosting | Netlify (Drop / Free tier) | — |

---

## 3. Credenciales y Conexiones

### Supabase
- **Proyecto:** `axia pricehub`
- **Project ID:** `svylytekfqhzuiouzral`
- **URL:** `https://svylytekfqhzuiouzral.supabase.co`
- **Anon Key:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN2eWx5dGVrZnFoenVpb3V6cmFsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc5NzE1NjgsImV4cCI6MjEwMzU0NzU2OH0.XwObTR46eJViuNycNGZkfFdwLLdVaFkysu-sa851-WY`
- **Correo de cuenta:** `farmaxia26@gmail.com`
- **Auth:** Email/Password, registro público desactivado, RLS habilitado en todas las tablas.

### Netlify
- **Cuenta:** Personal de Frank Conrado
- **Método de deploy:** Netlify Drop (arrastrar carpeta `dist`)
- **URL original:** `https://illustrious-lebkuchen-5ac15a.netlify.app` (puede haberse renombrado)

---

## 4. Base de Datos (Supabase PostgreSQL)

### Tabla: `productos`
Almacena el catálogo de medicamentos con ofertas de múltiples proveedores en formato JSONB.

| Columna | Tipo | Descripción |
|---|---|---|
| `id` | text (PK) | Identificador único (ej. `prod-001` o UUID) |
| `name` | text | Nombre comercial del medicamento |
| `activeIngredient` | text | Principio activo |
| `category` | text | Categoría (Cardiología, Neurología, etc.) |
| `isPriority` | boolean | Obsoleto, usar `nivel` |
| `nivel` | integer | 1 = Alta Rotación (Lunes), 2 = Crónicos (Miércoles), 3 = Diferenciación (Viernes) |
| `offers` | jsonb | Array de ofertas de proveedores (ver estructura abajo) |

**Estructura de cada oferta (JSONB):**
```json
{
  "provider": "DICEGSA",
  "providerCode": "DIC-NEB-05",
  "basePrice": 860,
  "discount": 20,
  "netPrice": 688,
  "bonusScale": { "buy": 12, "free": 1 }
}
```

### Tabla: `ventas_historicas`
Almacena las líneas de venta importadas desde Odoo POS.

| Columna | Tipo | Descripción |
|---|---|---|
| `id` | uuid (PK) | Auto-generado |
| `order_ref` | text | Referencia de la orden de Odoo (ej. "AXIA Farmacia 24/7 - 1 - 000002") |
| `date` | timestamptz | Fecha de la venta |
| `product_name` | text | Nombre del producto vendido |
| `category` | text | Categoría del producto en Odoo |
| `unit_price` | numeric | Precio unitario de venta al público |
| `quantity` | numeric | Cantidad vendida |
| `total_cost` | numeric | Costo total de Odoo (COGS) |
| `margin` | numeric | **GENERADA**: `(unit_price * quantity) - total_cost` |
| — | UNIQUE | `(order_ref, product_name)` — Llave Anti-Duplicados |

### Tabla: `configuracion`
Almacena los parámetros de negocio editables desde la app.

| Columna | Tipo | Default | Descripción |
|---|---|---|---|
| `id` | text (PK) | `'global'` | Siempre hay una sola fila |
| `budget_percent` | numeric | `71.15` | Porcentaje del total de ventas para compras |
| `nivel1_percent` | numeric | `65` | Distribución para Nivel 1 (Alta Rotación) |
| `nivel2_percent` | numeric | `25` | Distribución para Nivel 2 (Crónicos) |
| `nivel3_percent` | numeric | `10` | Distribución para Nivel 3 (Diferenciación) |
| `nombre_farmacia` | text | `'Axia Farmacia 24/7'` | Nombre mostrado en el header |
| `updated_at` | timestamptz | `now()` | Última actualización |

### Seguridad (RLS)
Todas las tablas tienen Row Level Security habilitado. Solo los usuarios autenticados (`auth.role() = 'authenticated'`) pueden leer o escribir datos. El registro público de nuevos usuarios está desactivado desde el panel de Supabase.

---

## 5. Arquitectura del Frontend

```
d:/Novarix/Axia PriceHub/
├── public/
│   └── plantilla_maestra_axia.csv   ← Plantilla descargable para importar catálogos
├── src/
│   ├── App.tsx                      ← Orquestador principal (~160 líneas)
│   ├── components/
│   │   ├── LoginScreen.tsx          ← Pantalla de autenticación
│   │   ├── Dashboard.tsx            ← Tab "Resumen" — Barras de presupuesto dinámicas
│   │   ├── Catalog.tsx              ← Tab "Catálogo" — Filtros por Nivel + Proveedor
│   │   ├── Reports.tsx              ← Tab "Reportes" — Gráficas Recharts + KPIs
│   │   ├── SettingsPanel.tsx        ← Tab "Ajustes" — Importadores + Personalización
│   │   ├── CartDrawer.tsx           ← Drawer lateral del carrito de pedidos
│   │   └── ProductEditor.tsx        ← Modal para editar ofertas de un producto
│   ├── lib/
│   │   └── utils.ts                 ← cn(), formatCurrency(), exportCartToCSV(), etc.
│   ├── types/
│   │   └── index.ts                 ← Interfaces: UnifiedProduct, CartItem, AppConfig, VentaHistorica
│   ├── supabase.ts                  ← Cliente de Supabase (usa .env.local)
│   └── main.tsx                     ← Entry point de React
├── .env.local                       ← VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY
├── schema.sql                       ← Schema original (tabla productos + datos iniciales)
├── schema_v2.sql                    ← Auth RLS + tabla ventas_historicas
├── schema_v3.sql                    ← Tabla configuracion
├── dist/                            ← Build de producción (se arrastra a Netlify)
└── package.json
```

---

## 6. Reglas de Negocio

### Regla de Oro: Presupuesto de Compras
- **Fórmula:** `Presupuesto = Ventas Semanales × budget_percent%`
- **Default:** 71.15% de las ventas brutas semanales.
- **Distribución:**
  - Nivel 1 (Alta Rotación / Emergencias): 65% del presupuesto → Pedido **Lunes**
  - Nivel 2 (Crónicos / Mantenimiento): 25% del presupuesto → Pedido **Miércoles**
  - Nivel 3 (Diferenciación / Apuestas): 10% del presupuesto → Pedido **Viernes**

### Proveedores Conocidos
`DICEGSA`, `LETERAGO`, `DIDELSA`, `DISMEDIC`, `IMFARSA`, `VESANIC`, `WALMART / MAYORISTA`

### Importación de Ventas (Odoo POS)
- El usuario exporta un CSV desde Odoo con estas columnas clave:
  - `Ref. de la orden` — Identificador único de la factura
  - `Fecha` — Fecha de la transacción
  - `Líneas de la orden/Nombre completo del producto`
  - `Líneas de la orden/Cantidad`
  - `Líneas de la orden/Precio unitario`
  - `Líneas de la orden/Costo total`
  - `Líneas de la orden/Producto/Categoría del producto`
- El importador usa **UPSERT** con llave `(order_ref, product_name)` para evitar duplicados.
- El usuario sube el mismo archivo actualizado cada semana (no subidas incrementales).

### Importación de Catálogo (Plantilla Maestra Axia)
- Columnas: `nombre_producto`, `ingrediente_activo`, `categoria`, `nivel`, `proveedor`, `codigo_proveedor`, `precio_base`, `descuento_porcentaje`, `precio_neto`, `escala_compra`, `escala_regalo`
- Si un producto ya existe (por nombre), se actualiza/agrega la oferta del proveedor sin borrar las demás.

---

## 7. Historial de Fases

| Fase | Descripción | Estado |
|---|---|---|
| **1** | App base: React + Tailwind + Catálogo local + Carrito + WhatsApp + CSV Export + PWA | ✅ |
| **2** | Mejoras: localStorage, Bonificaciones, Filtro Nivel 1, Modo PWA | ✅ |
| **3** | Migración a Supabase Cloud + Dashboard Presupuestario + Bottom Nav Mobile | ✅ |
| **4** | Auth (Login) + RLS Anti-Bots + Importador Odoo Anti-Duplicados + Reportes básicos | ✅ |
| **5** | Importador Catálogo + Editor Manual + Backup + Deploy Netlify | ✅ |
| **6** | Refactorización a componentes + Recharts + Filtro Proveedor + Centro de Control + Anti-Caché | ✅ |
| **7 (Actual)** | **Optimización Extrema de Memoria:** Reemplazo de Fuse.js por Native Search, DOM Capping estricto (Max 100 items), persistencia en `sessionStorage`, scripts de conversión de catálogos (PDF/CSV) a formato Axia. El sistema ahora soporta 50,000+ productos sin colapsos de RAM. | ✅ |

---

## 8. Ideas para Futuras Mejoras

- [ ] **Alertas de Quiebre de Stock:** Cruzar ventas de alta rotación con el catálogo y alertar cuando un producto estrella no tiene proveedor registrado.
- [ ] **Historial de Pedidos:** Guardar cada pedido enviado por WhatsApp/CSV en una tabla `pedidos_historicos` para hacer seguimiento.
- [ ] **Notificaciones Push:** Avisar al usuario cuando un precio se actualiza o cuando se acerca el día de pedido.
- [ ] **Multi-Sucursal:** Si Axia abre más puntos, agregar un campo `sucursal` para segmentar datos.
- [ ] **Comparador Visual de Precios:** Gráfica de barras por producto mostrando los precios de cada proveedor lado a lado.
- [ ] **Proyecciones de Venta:** Usando el histórico de Odoo, predecir la demanda semanal por producto.
- [ ] **Integración Bancaria:** Conectar con APIs de bancos de Nicaragua para verificar depósitos automáticamente.
- [ ] **Dashboard en Tiempo Real:** Usar Supabase Realtime para que los cambios se reflejen instantáneamente entre dispositivos.
- [ ] **Modo Offline Completo:** Mejorar el Service Worker para que la app funcione sin internet y sincronice cuando vuelva la conexión.
- [ ] **Roles de Usuario:** Diferenciar entre "Admin" (Frank) y "Operador" (Jordan) con permisos distintos.
- [ ] **Paginación en Servidor:** Si el catálogo supera los 100,000 productos, mover el filtrado y búsqueda desde el cliente hacia llamadas directas a Supabase usando `.ilike()`.

---

## 9. Notas Técnicas Importantes

1. **Odoo es solo para ventas.** Nunca conectar la app directamente a Odoo. Los datos de inventario de Odoo no son confiables (problema de lotes).
2. **El campo `offers` en `productos` es JSONB.** Esto permite flexibilidad total para agregar proveedores sin cambiar el esquema, pero requiere UPSERT del objeto completo al editar.
3. **Optimización de Memoria (DOM Cap):** `Catalog.tsx` utiliza `.toLowerCase().includes()` con normalización de tildes (NFD) en lugar de librerías de indexación pesadas, y un límite estricto de `.slice(0, 100)` para evitar colapsos de RAM (OOM) en dispositivos móviles.
4. **Scripts de Conversión de Catálogos:** En la raíz del proyecto existen scripts como `convert_dicegsa.mjs`, `convert_paisas.py`, y `convert_paisas.js` que se usaron para estructurar listas complejas de proveedores y extraer OCR desde PDFs hacia formato CSV para su subida mediante el componente `SettingsPanel`.
5. **El caché de la PWA puede ocultar actualizaciones.** Si el usuario sube un nuevo `dist` a Netlify y no ve cambios, debe usar el botón "Forzar Actualización" en Ajustes o presionar `Ctrl+F5`.
6. **El margen en `ventas_historicas` es una columna GENERATED.** No se puede escribir directamente; se calcula automáticamente como `(unit_price * quantity) - total_cost`.
8. **Proveedores sin lista de precios fija (ej. PAISAS):** Se importan con precio `0.00`. La interfaz en `Catalog.tsx` los identifica automáticamente mostrando una insignia **"Consultar / En stock"** en lugar de C$ 0.00, y no los califica erróneamente como "MEJOR" precio sobre proveedores con precios reales. Permite agregarlos al carrito para cotizar por WhatsApp.
