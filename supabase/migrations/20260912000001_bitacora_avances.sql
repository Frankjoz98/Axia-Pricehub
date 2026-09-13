-- Gran Migración de Bitácora: Todo el progreso del proyecto hasta la fecha

INSERT INTO bitacora_avances (titulo, contenido, categoria, user_id)
VALUES 
(
  'v1.0.0 - Lanzamiento Core y Motor de Sincronización Odoo', 
  'Se implementó la arquitectura base del sistema (React + Supabase) y el motor de importación de CSV. Ahora el sistema puede ingerir miles de registros de Inventario y Ventas de Odoo en segundos, guardándolos en la nube para cálculos ultrarrápidos sin sobrecargar el punto de venta.', 
  'sistema', 
  (SELECT id FROM auth.users ORDER BY last_sign_in_at DESC NULLS LAST LIMIT 1)
),
(
  'v1.0.1 - Hub de Inventario y Multi-Proveedor', 
  'Se desarrolló el módulo central de inventario. Permite buscar productos al instante, visualizar su stock físico, costo, precio de venta, y comparar múltiples ofertas de diferentes proveedores (Dismedic, Ramos, etc.) en un solo lugar.', 
  'sistema', 
  (SELECT id FROM auth.users ORDER BY last_sign_in_at DESC NULLS LAST LIMIT 1)
),
(
  'v1.0.2 - Motor de Cotizaciones y Pedidos (El Carrito)', 
  'Creación del sistema de cotización inteligente. Permite agrupar productos por laboratorio, calcular presupuestos dinámicos contra la meta semanal, y exportar las órdenes de compra directamente a PDF, CSV o enviarlas por WhatsApp en un clic.', 
  'comercial', 
  (SELECT id FROM auth.users ORDER BY last_sign_in_at DESC NULLS LAST LIMIT 1)
),
(
  'v1.0.3 - Intelligence Hub y Motor Financiero', 
  'Se construyó el motor analítico del negocio. Capacidad para calcular en tiempo real el Flujo Comercial, Ganancia Bruta (C$), Margen Global (%), y generar rankings automáticos de "Top Movers" organizados por Categoría y Marca/Laboratorio.', 
  'operativo', 
  (SELECT id FROM auth.users ORDER BY last_sign_in_at DESC NULLS LAST LIMIT 1)
),
(
  'v1.0.4 - Módulo de Cierres y Auditoría (La Lupa)', 
  'Herramientas avanzadas para auditoría de cajeros. La pestaña "Cierres" permite aislar las ventas por turno (ej. Noche) y comparar el flujo contra el Z-Report. "La Lupa" actúa como un registro inmutable de transacciones para detectar anomalías rápidamente.', 
  'operativo', 
  (SELECT id FROM auth.users ORDER BY last_sign_in_at DESC NULLS LAST LIMIT 1)
),
(
  'v1.0.5 - Ecosistema de Agenda y Metas', 
  'Lanzamiento del módulo operativo interno. Creación del WeekStrip (Calendario Visual), Gestor de Tareas, Registro de Vencimientos, y por supuesto, esta Bitácora Inmutable para el registro de hitos del sistema y de la gerencia.', 
  'general', 
  (SELECT id FROM auth.users ORDER BY last_sign_in_at DESC NULLS LAST LIMIT 1)
),
(
  'v1.1.0 - Normalización Arquitectónica de Odoo', 
  'Se solucionó la fragmentación visual de productos en los reportes al cambiar de nombre en Odoo. El motor de cálculo ahora ancla los datos usando el "odoo_id" numérico, unificando el historial financiero de los productos independientemente de cómo se llamen.', 
  'sistema', 
  (SELECT id FROM auth.users ORDER BY last_sign_in_at DESC NULLS LAST LIMIT 1)
),
(
  'v1.2.0 - Des-duplicación y Estabilidad de Base de Datos', 
  'Implementación del identificador único "line_id" para las transacciones. Se ejecutó un saneamiento profundo en PostgreSQL que destruyó los registros duplicados heredados de Odoo, devolviendo una precisión del 100% a las gráficas y cierres de caja.', 
  'sistema', 
  (SELECT id FROM auth.users ORDER BY last_sign_in_at DESC NULLS LAST LIMIT 1)
),
(
  'v1.2.1 - Reparación de Limpieza del Carrito', 
  'Se estabilizó el Gestor de Pedidos. Ahora la eliminación de pedidos completos funciona perfectamente (ícono rojo), y el carrito se auto-limpia tras generar un pedido exitoso por WhatsApp, evitando compras duplicadas accidentales.', 
  'sistema', 
  (SELECT id FROM auth.users ORDER BY last_sign_in_at DESC NULLS LAST LIMIT 1)
);
