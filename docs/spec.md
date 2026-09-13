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
- **RF-1 (Event-Driven):** WHEN el Administrador arrastra un archivo CSV de Inventario al panel de configuración, THEN el sistema DEBE vaciar la tabla `inventario_local` e insertar los nuevos registros extraídos del CSV (Snapshot Mode).
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

