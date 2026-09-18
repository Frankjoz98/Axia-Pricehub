# Axia PriceHub - Functional Specification

## 1. Contexto del Negocio
Axia PriceHub es un sistema diseñado para la gestión inteligente de inventarios, generación de cotizaciones (proformas) y análisis financiero (inteligencia de negocios). Está construido sobre React y Supabase, resolviendo la necesidad de integrar datos extraídos de un sistema POS en Odoo, donde los identificadores internos y las referencias pueden variar, obligando a utilizar un identificador estable (`odoo_id`).

## 2. Usuarios
- **Administrador / Dueño:** Responsable de actualizar el inventario y las ventas mediante subida de archivos CSV desde Odoo.
- **Vendedor / Cajero:** Responsable de buscar productos en el catálogo y generar proformas o cotizaciones en PDF para el cliente.

## 3. Lenguaje Ubicuo (Ubiquitous Language)
- **Odoo ID (`odoo_id`):** Identificador técnico y único de Odoo que nunca cambia, independientemente del nombre del producto.
- **Snapshot Mode:** Proceso de sincronización donde al subir un nuevo archivo de inventario se purgan por completo los registros anteriores de la base de datos y se insertan los nuevos para garantizar consistencia absoluta.
- **Proforma:** Cotización o "Botiquín" estimado generado para un cliente, detallando cantidad, precio y subtotal.
- **Rentabilidad (Margen):** La ganancia generada calculada como: `(Precio de Venta - Costo de Reposición) * Cantidad`.
- **Conciliación de Compras:** Acción de contrastar una Orden de Compra estimada generada por Axia con la factura real emitida por el proveedor para registrar el gasto exacto.

## 4. Requisitos Funcionales (EARS Notation)

### Módulo de Sincronización y Configuración
- **RF-1 (Event-Driven):** WHEN el Administrador arrastra un archivo CSV de Inventario al panel de configuración, THEN el sistema DEBE sincronizar `inventario_local` en modo Snapshot con preservación: (a) hacer `upsert` por `odoo_id` de stock, precio, costo, marca, referencia y categoría; (b) conservar intactos los campos que no provienen de Odoo (`impulso_medico`, `fecha_vencimiento`) y el `id` interno de cada producto; (c) eliminar únicamente los productos cuyo `odoo_id` ya no aparece en el CSV, y hacerlo después del upsert para que un fallo a mitad de carga nunca deje la tabla vacía.
- **RF-1b (Ubiquitous):** The sistema NUNCA DEBE persistir en `productos` campos calculados solo en el cliente (ej. `_searchIndex`); toda escritura pasa por `toDbProduct()`.
- **RF-2 (Ubiquitous):** The sistema DEBE identificar cada producto único en los CSV utilizando el campo `odoo_id` o sus variaciones técnicas (`id`, `.id`, `ID externo`).
- **RF-3 (Event-Driven):** WHEN el Administrador arrastra un archivo CSV de Ventas Históricas, THEN el sistema DEBE procesar los registros y sincronizarlos en la tabla `ventas_historicas`, omitiendo filas inválidas o sin `odoo_id`.

### Módulo de Catálogo y Proformas
- **RF-4 (Ubiquitous):** The Vendedor DEBE poder buscar productos en tiempo real por nombre, marca o referencia desde la vista de Proformas.
- **RF-5 (Event-Driven):** WHEN un producto es seleccionado en el catálogo, THEN el sistema DEBE agregarlo a la Proforma con una cantidad inicial de 1, calculando automáticamente el Subtotal y la Ganancia Estimada en base al costo del inventario.
- **RF-6 (Ubiquitous):** The sistema DEBE permitir la impresión o guardado en PDF de la Proforma generada, ocultando los elementos de la interfaz de usuario.

### Módulo de Reportes e Inteligencia de Negocios
- **RF-7 (Ubiquitous):** The sistema DEBE cruzar los datos de `ventas_historicas` con `inventario_local` utilizando el `odoo_id` de manera estricta. WHEN un producto en ventas tiene un `odoo_id` que existe en `inventario_local`, THEN el sistema DEBE usar el `product_name` del inventario como nombre canónico para toda agrupación y visualización de métricas (excepto en la vista Lupa, que muestra datos crudos para auditoría).
- **RF-8 (Event-Driven):** WHEN el Administrador accede a la pestaña de Reportes, THEN el sistema DEBE mostrar métricas globales agregadas: Ventas Totales, Costo Total, Ganancia Total y Margen Global.
- **RF-9 (Ubiquitous):** The sistema DEBE agrupar la información por Laboratorio (Marca) y por Categoría. El Top Laboratorios DEBE ordenarse por volumen de ventas (cantidad de unidades) mostrando su margen de ganancia promedio.
- **RF-10 (Ubiquitous):** The sistema DEBE soportar la generación de Hojas de Conteo de Inventario CIEGO (sin mostrar stock actual) para un laboratorio en específico o varios seleccionados.
- **RF-11 (Event-Driven):** WHEN el Administrador marca una Orden de Compra como conciliada, THEN el sistema DEBE registrar el `monto_factura_real` y la `fecha_recepcion` para compararlos contra el estimado.
- **RF-12 (Ubiquitous):** The sistema DEBE proveer una vista de Analíticas de Compras que muestre la Varianza Histórica y el Ratio de Compras vs. Ventas basado en las órdenes conciliadas.
- **RF-13 (Event-Driven):** WHEN el Administrador explora el "Margen Actual del Catálogo", THEN el sistema DEBE permitir expandir cada Laboratorio para desglosar sus ventas históricas y el margen individual de cada producto que lo compone.
- **RF-14 (Ubiquitous):** The sistema DEBE proveer un "Centro de Auditoría" (Data Traceability) que permita buscar cualquier producto y ver su historial de ventas crudo para comparar contra Odoo.
- **RF-15 (Ubiquitous):** The sistema DEBE generar un reporte de "Productos Estancados" (Dead Stock), identificando productos con stock mayor a cero pero sin ventas en el periodo evaluado, ordenados por capital congelado (Costo Total).
- **RF-28 (Event-Driven):** WHEN el usuario accede a la pestaña de Cierres en el IntelligenceHub, THEN el sistema DEBE mostrar una lista de tarjetas de sesión con sus métricas calculadas (total facturado, órdenes, cajero, horario, turno, costo y margen), permitiendo filtrar por fecha/cajero/turno y comparar manualmente contra el total del cierre físico.
- **RF-40 (Event-Driven):** WHEN el usuario ingresa valores de cotejo Z-Report en CierresTab, THEN el sistema DEBE persistir esos datos al cambiar entre pestañas del IntelligenceHub.
- **RF-41 (Event-Driven):** WHEN el usuario visualiza el gráfico de dona en LabsTab, THEN el sistema DEBE omitir las etiquetas superpuestas directas y usar tooltips limpios.
- **RF-42 (Event-Driven):** WHEN el usuario selecciona el reporte del mes actual en ReportExportModal, THEN el sistema DEBE calcular dinámicamente el primer día del mes en curso, sin fechas hardcodeadas.
- **RF-43 (Event-Driven):** WHEN el usuario pasa el cursor sobre el gráfico de tendencias temporales, THEN el sistema DEBE usar un Custom Tooltip que muestre la suma total de ventas del periodo, además del desglose por turnos y margen.
- **RF-44 (Event-Driven):** WHEN el usuario selecciona un rango de tiempo en la nueva barra global (Hoy, Semana, Mes, Global), THEN todos los componentes del IntelligenceHub DEBEN filtrar sus métricas para reflejar solo ese periodo.
- **RF-46 (Event-Driven):** WHEN el usuario inyecta una fecha en el buscador de LupaTab mediante Drill-down, THEN la tabla de resultados DEBE buscar coincidencias en la propiedad `date` de las transacciones.
- **RF-47 (Event-Driven):** WHEN el usuario hace clic en una barra del gráfico temporal (Drill-down), THEN el sistema DEBE cambiar el filtro global a "Histórico" (o limpiar el rango) para garantizar que la Lupa tenga acceso a los datos de la fecha clicleada.
- **RF-48 (Event-Driven):** WHEN el usuario busca o inyecta una fecha en LupaTab con formato YYYY-MM-DD, THEN el sistema DEBE comparar fechas normalizadas (descartando horas) y mostrar EXCLUSIVAMENTE transacciones de ese día exacto.
- **RF-49 (Event-Driven):** WHEN el usuario selecciona un preset temporal (Hoy, Esta Semana, Mes Actual, Histórico), THEN todos los gráficos (Horas, Días, Tendencia) y KPIs DEBEN recalcularse de forma reactiva sin estados desfasados.
- **RF-50 (Ubiquitous):** WHEN el sistema agrupa ventas para la gráfica de tendencias temporales, THEN DEBE asociar las transacciones al día de apertura de su sesión de caja (sesion_id), garantizando que las ventas nocturnas no se fragmenten en días contables distintos.
- **RF-51 (Event-Driven):** WHEN el usuario hace clic en un día del gráfico temporal (Drill-down), THEN el sistema DEBE capturar la lista de identificadores de sesión (`session_ids`) de esa barra y utilizarlos como filtro exacto en LupaTab, garantizando una conciliación del 100% en facturación y margen.
- **RF-52 (Event-Driven):** WHEN el usuario selecciona un quick filter (Hoy, Esta Semana, Mes Actual, Histórico), THEN el sistema DEBE calcular dinámicamente los límites (startOfDay, endOfDay, startOfWeek, etc.) en hora local y filtrar el arreglo base de ventas antes de derivar cualquier métrica.
- **RF-53 (Event-Driven):** WHEN el usuario visualiza la pestaña "Resumen" (`OverviewTab`), THEN el sistema DEBE mostrar un diseño asimétrico (70/30): 70% para tablas de rotación/márgenes y 30% para un panel lateral de "Insights Gerenciales" (AI Briefing).
- **RF-54 (Event-Driven):** WHEN el estado del filtro temporal cambia en `IntelligenceHub`, THEN `useBusinessMetrics` DEBE recalcular `filteredVentas` usando un `useMemo` que incluya obligatoriamente el filtro de tiempo como dependencia, forzando la actualización de todos los KPIs y gráficos en pantalla.
- **RF-55 (Event-Driven):** WHEN se renderiza el panel "Axia AI Insights" en `OverviewTab`, THEN los textos DEBEN generarse dinámicamente consumiendo las variables reales del objeto `metrics`, reaccionando al rango de fechas seleccionado.
- **RF-56 (Event-Driven):** WHEN el usuario abre el módulo IntelligenceHub, THEN el sistema DEBE mostrar un diseño asimétrico: el lienzo principal (70%) para gráficas/tablas y una barra lateral (30%) de "AI Briefing" (Axia AI Insights).
- **RF-57 (Event-Driven):** WHEN se renderiza la barra lateral (AI Briefing), THEN el sistema DEBE mostrar tarjetas proactivas con acciones recomendadas o alertas financieras, evitando que el usuario deba buscar manualmente.
- **RF-58 (Event-Driven):** WHEN el usuario cambia un filtro temporal en `IntelligenceHub`, THEN todas las métricas de rendimiento (`topMovers`, `topMargin`, `marginPercent`, `totalTransactions`) DEBEN calcularse estrictamente sobre `filteredVentas` y no sobre el histórico global, garantizando que el AI Briefing reaccione de inmediato al periodo exacto.
- **RF-59 (Event-Driven):** WHEN el médico accede a la ruta `/portal-medico`, THEN el sistema DEBE mostrar una interfaz pública de solo lectura (sin requerir inicio de sesión), eludiendo el `AuthGuard` de la aplicación principal.
- **RF-60 (Event-Driven):** WHEN el portal carga, THEN el sistema DEBE mostrar dos pestañas o secciones *Mobile-First*: "Mis Citas de Hoy" y "Catálogo de Impulso".
- **RF-61 (Event-Driven):** WHEN el médico interactúa con el Catálogo de Impulso, THEN el sistema DEBE mostrar una barra de búsqueda funcional que filtre los medicamentos, priorizando visualmente aquellos con baja rotación o alto margen para incentivar su prescripción.
- **RF-62 (Event-Driven):** WHEN el sistema genera la lista de productos sugeridos para el Catálogo de Impulso del portal médico, THEN DEBE excluir explícitamente cualquier producto cuyo laboratorio, marca, proveedor o nombre esté asociado a marcas de consumo masivo (CDN, Coca Cola, Pepsi, Diana, Frito-Lay, Eskimo, Kern's, Gatorade, Powerade, Monster, Red Bull), garantizando un perfil estrictamente clínico.
- **RF-63 (Event-Driven):** WHEN el algoritmo compila el Catálogo de Impulso, THEN DEBE priorizar (ordenar al principio y destacar visualmente) los productos catalogados como 'Stock Muerto' (sin registros en `ventas_historicas`).
- **RF-64 (Ubiquitous):** WHEN el sistema calcula la cantidad de tickets únicos (`totalTransactions` y `uniqueTickets`) y el ticket promedio (`avgTicket`/`ticketAvg`), DEBE identificar cada ticket mediante la combinación compuesta de sesión y referencia (`${v.sesion || ''}_${v.order_ref}`), evitando que las referencias numéricas repetidas entre distintas sesiones de Odoo se dedupliquen erróneamente.
- **RF-65 (Event-Driven):** WHEN el usuario visualiza el "Top Laboratorios" en `LabsTab`, THEN el sistema DEBE mostrar simultáneamente dos márgenes por cada laboratorio: el "Margen Real Ponderado" (basado en el historial de facturación y volumen de ventas) y el "Margen Promedio Simple de Catálogo" (basado en el margen teórico individual de cada producto en el inventario), para brindar visibilidad completa a la gerencia.
- **RF-66 (Event-Driven):** WHEN el usuario visualiza el Resumen Global en `IntelligenceHub`, THEN el sistema DEBE mostrar simultáneamente el "Margen Real" ponderado de toda la farmacia y el "Promedio Simple de Catálogo" global en la métrica principal.

### Módulo de Seguridad y Roles
- **RF-67 (Ubiquitous):** The sistema DEBE resolver el rol de cada usuario (`admin` | `caja`) desde la tabla `perfiles` mediante la función `auth_rol()`. Las tablas sensibles (`productos`, `ventas_historicas`, `inventario_local`, `configuracion`, `ordenes_compra`, `proveedores`, `facturas_compra`, `fichas_tecnicas`) DEBEN tener políticas RLS que solo permitan acceso al rol `admin`; el aislamiento en el cliente (`App.tsx`) es únicamente visual.
- **RF-68 (Event-Driven):** WHEN un usuario con rol `caja` inicia sesión, THEN el cliente NO DEBE descargar ventas, inventario, catálogo ni configuración; solo la terminal de pedidos y citas.
- **RF-69 (Ubiquitous):** The portal médico público DEBE acceder a datos únicamente mediante las funciones RPC `portal_catalogo_impulso`, `portal_citas` y `portal_actualizar_cita`, que exigen el token de `configuracion.portal_token` (enlace `/portal-medico?k=<token>`). El rol `anon` NO DEBE tener privilegios sobre ninguna tabla ni vista: los nombres de pacientes son datos personales y nunca se exponen sin token. El catálogo de impulso devuelve solo `odoo_id, product_name, stock, marca` (sin precio ni costo). El administrador ve y copia el enlace desde Ajustes; para revocar el acceso se rota `portal_token`.
- **RF-71 (Ubiquitous):** The función `auth_rol()` DEBE devolver `caja` para cualquier usuario sin fila en `perfiles` (mínimo privilegio); los administradores se registran explícitamente.
- **RF-70 (Ubiquitous):** The sistema NUNCA DEBE incluir claves de terceros (Gemini) en el bundle del cliente. Toda llamada a IA pasa por la Netlify Function `/api/ai` (`netlify/functions/ai.mts`), que valida el JWT de Supabase y guarda `GEMINI_API_KEY` en variables de entorno del hosting.

### Módulo de Consolidación Arquitectónica (Hubs) y Alertas
- **RF-16 (Event-Driven):** WHEN el sistema detecta anomalías (ej. costo superior al precio de venta, o quiebres de stock en productos esenciales), THEN DEBE mostrar una alerta flotante global no intrusiva y registrarla en el panel consolidado de Alertas.
- **RF-17 (Ubiquitous):** The sistema DEBE consolidar la visualización física en un `InventoryHub` que agrupe mediante pestañas: Catálogo de Proveedores, Botiquín Empresarial (Proforma) y Productos Estancados, manteniendo el carrito de compras global intacto.
- **RF-18 (Ubiquitous):** The sistema DEBE consolidar el análisis en un `IntelligenceHub` que integre todas las operaciones analíticas en pestañas: Resumen Operativo, Análisis de Laboratorios, Auditoría (Lupa), Alertas de Anomalías, y Sugerencias de Compras (Axia AI).
- **RF-19 (Ubiquitous):** The sistema DEBE garantizar que el Resumen Operativo muestre intactas las métricas gerenciales clave: Total Facturado, Margen Global, Tickets, Promedio de Ticket, Horas Calientes (24/7), Días de Mayor Venta, Crecimiento Operativo y Rendimiento del Personal.
- **RF-20 (Event-Driven):** WHEN el usuario visualiza el Análisis de Laboratorios, THEN el sistema DEBE proveer un gráfico claro de "Total Facturado" por laboratorio, gráficos de rentabilidad, y un buscador para encontrar rápidamente las métricas (Facturado y Margen) de cualquier laboratorio específico.

### Módulo de Control de Proveedores (SupplierHub)
- **RF-21 (Ubiquitous):** The sistema DEBE mantener un registro maestro de proveedores con sus condiciones comerciales: días de crédito, tipo de precio, bonificaciones, política de vencidos, día de entrega, número de cliente asignado, y notas generales.
- **RF-22 (Event-Driven):** WHEN el usuario registra una nueva factura de compra, THEN el sistema DEBE almacenar fecha, número, monto, y permitir adjuntar múltiples imágenes escaneadas de la factura física mediante Supabase Storage.
- **RF-23 (Ubiquitous):** The sistema DEBE calcular y mostrar en tiempo real el total acumulado de compras por proveedor, sumando los montos de todas sus facturas registradas.
- **RF-24 (Ubiquitous):** The sistema DEBE ordenar las facturas por fecha de emisión (más recientes primero) y permitir filtrar por estado (pendiente / pagada / vencida).
- **RF-25 (Event-Driven):** WHEN el usuario accede al SupplierHub, THEN el sistema DEBE presentar una vista panorámica con KPIs globales (proveedores activos, total comprado, facturas pendientes, facturas vencidas) y tarjetas resumen de cada proveedor.
- **RF-26 (Event-Driven):** WHEN una factura supera su fecha_vencimiento sin haber sido marcada como pagada, THEN el sistema DEBE tratarla visualmente como 'vencida'.
- **RF-27 (Ubiquitous):** The módulo de proveedores NO DEBE vincularse a nivel de producto con las órdenes de compra. Su función es exclusivamente administrativa y de control financiero.

### Módulo de Pedidos de Dependientes (Caja)
- **RF-29 (Ubiquitous):** The sistema DEBE exponer una ruta aislada (`/pedidos`) accesible de forma independiente, bloqueando el acceso al resto del sistema si la sesión corresponde al correo `caja@axia.com`.
- **RF-30 (Event-Driven):** WHEN el dependiente registra un nuevo pedido, THEN el sistema DEBE requerir el nombre del dependiente que solicita, nombre del producto, cantidad, y categorizar el tipo de pedido (encargo de cliente, sugerencia, esencial, quiebre de stock).
- **RF-31 (Event-Driven):** WHEN el dueño o el dependiente marcan un pedido pendiente como "pedido", THEN el sistema DEBE actualizar su estado a 'pedido' y moverlo a la vista de Procesados de manera instantánea (Optimistic UI) sin requerir recargar la página.
- **RF-32 (Event-Driven):** WHEN el pedido es recibido físicamente, THEN se marcará como 'recibido'. WHEN el usuario presiona archivar en un pedido recibido, THEN el sistema lo ocultará de la vista activa para mantener la interfaz limpia.
- **RF-33 (Ubiquitous):** The sistema DEBE permitir al administrador incrustar la terminal de pedidos (Embedded Mode) directamente dentro del Panel de Órdenes (OrdersPanel) para supervisar y gestionar las sugerencias de los dependientes sin salir de su flujo de trabajo habitual, separando los "Encargos" en una pestaña exclusiva.

### Módulo de Agenda y Tareas (AgendaHub)
- **RF-34 (Event-Driven):** WHEN el usuario accede a la Agenda, THEN el sistema DEBE mostrar un diseño asimétrico de dos columnas: un Timeline vertical principal (70%) y una barra lateral de herramientas (30%).
- **RF-35 (Event-Driven):** WHEN el usuario visualiza el Timeline, THEN los eventos DEBEN agruparse cronológicamente (Hoy, Mañana, Esta Semana) usando tarjetas minimalistas.
- **RF-36 (Event-Driven):** WHEN el usuario utiliza la caja de "Captura Rápida" en la barra lateral y presiona Enter, THEN el sistema DEBE registrar la entrada en la bitácora sin abrir modales pesados.
- **RF-37 (Ubiquitous):** The sistema DEBE mostrar las tarjetas de eventos del Timeline con una densidad de información alta y alineación horizontal (flex), mostrando título, descripción truncada a 1 línea, píldora de categoría y hora monoespaciada en el lado derecho.
- **RF-38 (Event-Driven):** WHEN hay una meta activa principal, THEN la barra lateral DEBE destacar su progreso mediante una tarjeta morada que incluya porcentaje de avance numérico y una barra de progreso visual.
- **RF-39 (Event-Driven):** WHEN se despliega la Captura Rápida de Bitácora, THEN el sistema DEBE mostrar justo debajo las últimas 3 entradas registradas el día de hoy, permitiendo archivar o eliminar rápidamente para dar feedback visual de la captura.

## 5. Casos Límite y Reglas de Negocio
- Si un archivo CSV exportado desde Odoo carece de un `odoo_id` válido, la fila DEBE ser ignorada para evitar corromper los cruces de reportes.
- La paginación en Supabase DEBE incluir `.order('id')` para garantizar resultados deterministas al obtener grandes volúmenes de datos.
- Las variaciones de nombres de columnas de Odoo (`Nombre` vs `name`, `Cantidad a la mano` vs `qty_available`) DEBEN ser normalizadas automáticamente por el analizador CSV.
- **Gestión de Carga CSV:** El tamaño de fragmentación (chunk size) para inserciones (upsert) en Supabase NO DEBE superar los 200 registros por lote para evitar errores `Failed to fetch` (Payload Too Large / Timeout) en el navegador.

## 6. Fuera de Alcance (Out of Scope)
- No se manejará facturación electrónica ni control de caja directamente en Axia PriceHub; estas funciones permanecen delegadas a Odoo POS.
- No se manejarán múltiples almacenes o bodegas; el sistema asume un inventario local unificado.

## 7. Estado Actual (Handoff)
- **Framework:** React + TypeScript + TailwindCSS v4.
- **Base de Datos:** Supabase con tablas `inventario_local`, `ventas_historicas`, `ordenes_compra` y `pedidos_dependientes`.
- **Arquitectura de Hubs:**
  - `App.tsx` maneja el enrutamiento y protege de forma estricta a los usuarios (aislando a `caja@axia.com` en su propio submódulo).
  - `InventoryHub`, `IntelligenceHub`, `SupplierHub` y `OrdersPanel` (ahora con modo embebido para la Terminal de Pedidos).
  - `IntelligenceHub.tsx` (37KB, 583 líneas) es el componente activo de inteligencia de negocios usado en producción. Contiene todas las vistas (Overview, Time, Labs, Staff, Lupa, Alerts, Restock) en un solo archivo monolítico. **Este es el próximo candidato a refactorización.**
  - `SupplierHub` ya está modularizado en `src/components/suppliers/`.
- **Módulo Reciente (Pedidos):**
  - `PedidosTerminal.tsx` implementado con interfaz optimista (Optimistic UI) para interacciones en tiempo real.
  - Aislado para dependientes (`/pedidos`) e incrustable para administradores.
- **Módulos Complementarios:**
  - `SmartRestock.tsx`: Motor de reabastecimiento inteligente (Axia AI).
  - `PurchaseAnalytics.tsx`: Analíticas de compras con varianza histórica.
  - `PrintableReport.tsx`: Componente dedicado a la impresión de reportes gerenciales en PDF.
  - `DataAuditorModal.tsx`: Modal de auditoría de datos crudos.
- **Código Muerto Identificado:**
  - `Reports.tsx` (12KB) — fue refactorizado pero **no está siendo importado por ningún componente**. No se usa en producción. Puede eliminarse o reutilizarse.
  - `ReportsOld.txt` (68KB) — backup del Reports.tsx original, sin uso.
  - `src/components/intelligence/` — contiene 7 subcomponentes (OverviewView, TimeView, BrandView, ProductsView, StaffView, InventoryView, ProductDetailModal) creados durante la refactorización de Reports.tsx, pero **ninguno está conectado al flujo activo** de `IntelligenceHub.tsx`.
- **Flujo Estandarizado:** Toda nueva sesión debe respetar las convenciones de SDD (consultar este archivo y `AGENTS.md`) antes de modificar código.

