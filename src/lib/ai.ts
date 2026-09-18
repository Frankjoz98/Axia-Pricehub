import { supabase } from '../supabase';
import type { AgendaEvento, DailyBriefing } from '../types';
import type { BusinessMetrics } from '../hooks/useBusinessMetrics';
import type { AppAlert } from '../context/AlertsContext';

export interface FichaTecnica {
  product_id: string;
  usos: string;
  precio_promedio: string;
}

export interface OrderAuditResult {
  analysis: string;
  expensiveItems: string[];
  goodDeals: string[];
}

// Todas las llamadas a Gemini pasan por la Netlify Function `/api/ai` (netlify/functions/ai.mts):
// la API key nunca viaja al navegador y solo usuarios con sesión de Supabase pueden usarla.
async function callGemini<T>(prompt: string, temperature: number): Promise<T | null> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    console.warn('Axia AI: se requiere sesión para consultar la IA');
    return null;
  }

  const response = await fetch('/api/ai', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`
    },
    body: JSON.stringify({ prompt, temperature })
  });

  if (!response.ok) {
    throw new Error(`Axia AI respondió ${response.status}`);
  }

  const { text } = (await response.json()) as { text: string };
  return JSON.parse(text) as T;
}

export async function getFichaTecnica(productId: string, productName: string, activeIngredient: string): Promise<FichaTecnica | null> {
  // 1. Verificar caché en Supabase
  const { data: cached, error: cacheError } = await supabase
    .from('fichas_tecnicas')
    .select('*')
    .eq('product_id', productId)
    .maybeSingle();

  if (cached && !cacheError) {
    return cached as FichaTecnica;
  }

  // 2. Si no existe en caché, consultar a Gemini vía función server-side
  const prompt = `Eres un experto farmacéutico en Nicaragua. El usuario es un dueño de farmacia que está considerando comprar el siguiente medicamento a sus proveedores:
Nombre Comercial: ${productName}
Principio Activo: ${activeIngredient}

Responde ÚNICAMENTE en formato JSON estricto con las siguientes dos propiedades:
- "usos": Un texto breve (máximo 3 líneas) explicando para qué sirve este medicamento de forma práctica.
- "precio_promedio": Un estimado del Precio de Venta al Público (PVP) promedio en el mercado nicaragüense, en córdobas (C$). Por ejemplo: "C$ 120.00 - C$ 150.00". Si no estás seguro, da un estimado general para la molécula en su presentación más común.

Ejemplo de respuesta:
{
  "usos": "Analgésico y antipirético indicado para el alivio del dolor leve a moderado y para reducir la fiebre.",
  "precio_promedio": "C$ 30.00 - C$ 50.00"
}
`;

  try {
    const parsed = await callGemini<{ usos?: string; precio_promedio?: string }>(prompt, 0.2);

    if (!parsed || !parsed.usos || !parsed.precio_promedio) {
      throw new Error("Invalid JSON structure from Gemini");
    }

    const nuevaFicha: FichaTecnica = {
      product_id: productId,
      usos: parsed.usos,
      precio_promedio: parsed.precio_promedio
    };

    // 3. Guardar en caché Supabase (en background)
    supabase.from('fichas_tecnicas').insert(nuevaFicha).then(({ error }) => {
      if (error) console.error("Error guardando ficha en caché:", error);
    });

    return nuevaFicha;
  } catch (error) {
    console.error("Error obteniendo Ficha Técnica de IA:", error);
    return null;
  }
}

export async function auditOrder(providerName: string, items: { productName: string; activeIngredient: string; quantity: number; netPrice: number }[]): Promise<OrderAuditResult | null> {
  const itemsListStr = items.map(i => `- ${i.productName} (${i.activeIngredient}): ${i.quantity} unidades a C$ ${i.netPrice.toFixed(2)} c/u`).join("\n");

  const prompt = `Eres un auditor financiero experto en farmacias de Nicaragua. Se está preparando una orden de compra para el proveedor "${providerName}".
Revisa la siguiente lista de productos y sus costos unitarios propuestos:

${itemsListStr}

Por favor, analiza brevemente si estos costos tienen sentido para el mercado de Nicaragua.
Responde ÚNICAMENTE en formato JSON estricto con las siguientes propiedades:
- "analysis": Un párrafo corto (máximo 4 líneas) dando tu opinión general sobre los precios de esta orden.
- "expensiveItems": Un arreglo de strings con el nombre de los 2 o 3 productos que parecen estar muy caros comparados con su precio promedio de mercado. (Si ninguno está caro, devuelve un arreglo vacío).
- "goodDeals": Un arreglo de strings con el nombre de los 2 o 3 productos que parecen ser una excelente compra por su bajo costo. (Si ninguno destaca, devuelve un arreglo vacío).

Ejemplo de respuesta:
{
  "analysis": "En general la orden tiene precios competitivos, aunque un par de antibióticos están por encima del promedio del mercado nacional.",
  "expensiveItems": ["AMOXICILINA 500MG CAP"],
  "goodDeals": ["ACETAMINOFEN 500MG TAB"]
}
`;

  try {
    const parsed = await callGemini<Partial<OrderAuditResult>>(prompt, 0.3);
    if (!parsed) return null;

    return {
      analysis: parsed.analysis || "Análisis no disponible",
      expensiveItems: parsed.expensiveItems || [],
      goodDeals: parsed.goodDeals || []
    };
  } catch (error) {
    console.error("Error auditando la orden con IA:", error);
    return null;
  }
}

export async function generateDailyBriefing(
  eventos: AgendaEvento[],
  metrics: Pick<BusinessMetrics, 'totalRevenue' | 'marginPercent' | 'totalTransactions'> | null,
  alertas: Pick<AppAlert, 'title' | 'message'>[]
): Promise<DailyBriefing | null> {
  const activeEventsStr = eventos.filter(e => !e.completado).map(e =>
    `[${e.prioridad.toUpperCase()}] ${e.tipo}: ${e.titulo} - ${e.descripcion || ''}`
  ).join('\n');

  const alertsStr = alertas.map(a => `- ${a.title}: ${a.message}`).join('\n');

  const prompt = `Eres el asistente de Inteligencia de Negocios de "Axia PriceHub", un sistema para farmacias en Nicaragua.
Tu tarea es generar un "Briefing Diario" conciso y directo para el dueño de la farmacia al comenzar su día.

DATOS DEL DÍA:
Eventos en la agenda:
${activeEventsStr || 'Ningún evento programado.'}

Alertas activas del sistema:
${alertsStr || 'Sin alertas.'}

Métricas recientes:
Total Facturado (último periodo): C$ ${metrics?.totalRevenue || 0}
Margen Global: ${metrics?.marginPercent?.toFixed(1) || 0}%
Tickets: ${metrics?.totalTransactions || 0}

INSTRUCCIONES:
Basado en esta información, devuelve un JSON estricto con:
1. "greeting": Un saludo breve que resuma el estado del día (ej. "Buenos días. Hoy es un día crucial con 2 pagos vencidos.").
2. "topPriorities": Array de strings (max 3) con las prioridades absolutas extraídas de la agenda y alertas (ej. "Pagar factura #123 de DICEGSA", "Resolver alerta de quiebre de stock").
3. "insights": Array de strings (max 2) con un análisis breve de las métricas de negocio.
4. "suggestedActions": Array de strings (max 2) con recomendaciones tácticas sobre qué hacer hoy.

Ejemplo JSON:
{
  "greeting": "Buenos días. Tienes un día enfocado en pagos y reabastecimiento.",
  "topPriorities": ["Pagar factura de 15,000 C$ a Leterago hoy", "Preparar pedido para Caplin"],
  "insights": ["El margen global bajó levemente al 24%, revisa los descuentos aplicados ayer."],
  "suggestedActions": ["Reabastece Amoxicilina urgente", "Llama a tu ejecutivo de ventas de Leterago para negociar plazos."]
}
`;

  try {
    const parsed = await callGemini<Partial<DailyBriefing>>(prompt, 0.3);
    if (!parsed) return null;

    return {
      greeting: parsed.greeting || "Buenos días.",
      topPriorities: parsed.topPriorities || [],
      insights: parsed.insights || [],
      suggestedActions: parsed.suggestedActions || []
    };
  } catch (error) {
    console.error("Error generating daily briefing con IA:", error);
    return null;
  }
}
