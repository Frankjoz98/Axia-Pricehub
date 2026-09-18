import type { FacturaCompra } from '../types';
import { isPastLocalDate } from './dates';

/**
 * Una factura está vencida si así se marcó, o si sigue pendiente y su fecha de vencimiento
 * (día calendario local) ya pasó. Único punto de verdad para KPIs, tarjetas y agenda (RF-26).
 */
export function isFacturaVencida(factura: Pick<FacturaCompra, 'estado' | 'fecha_vencimiento'>, hoy: Date = new Date()): boolean {
  if (factura.estado === 'vencida') return true;
  if (factura.estado !== 'pendiente' || !factura.fecha_vencimiento) return false;
  return isPastLocalDate(factura.fecha_vencimiento, hoy);
}

/** Pendiente y todavía dentro de plazo (no cuenta doble con las vencidas). */
export function isFacturaPendienteVigente(factura: Pick<FacturaCompra, 'estado' | 'fecha_vencimiento'>, hoy: Date = new Date()): boolean {
  return factura.estado === 'pendiente' && !isFacturaVencida(factura, hoy);
}
