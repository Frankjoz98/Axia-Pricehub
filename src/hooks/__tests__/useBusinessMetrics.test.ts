// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useBusinessMetrics, buildSessionMeta, businessDateFor, turnoForHour } from '../useBusinessMetrics';
import { toLocalYMD } from '../../lib/dates';
import type { VentaHistorica, OdooInventario, PurchaseOrder } from '../../types';

let seq = 0;
const venta = ({ date, ...p }: Partial<Omit<VentaHistorica, 'date'>> & { date: Date }): VentaHistorica => ({
  id: `v${++seq}`,
  order_ref: `REF-${seq}`,
  product_name: 'PRODUCTO',
  category: 'General',
  unit_price: 10,
  quantity: 1,
  total_cost: 6,
  margin: 4,
  ...p,
  date: date.toISOString()
});

const local = (y: number, m: number, d: number, h: number, min = 0) => new Date(y, m - 1, d, h, min, 0);

describe('turnos y día operativo', () => {
  it('turnoForHour usa los cortes únicos 06/14/22', () => {
    expect(turnoForHour(5)).toBe('turno3');
    expect(turnoForHour(6)).toBe('turno1');
    expect(turnoForHour(13)).toBe('turno1');
    expect(turnoForHour(14)).toBe('turno2');
    expect(turnoForHour(21)).toBe('turno2');
    expect(turnoForHour(22)).toBe('turno3');
  });

  it('businessDateFor manda la madrugada al día anterior y el resto al mismo día', () => {
    expect(toLocalYMD(businessDateFor(local(2026, 9, 18, 2)).businessDate)).toBe('2026-09-17');
    expect(toLocalYMD(businessDateFor(local(2026, 9, 17, 23)).businessDate)).toBe('2026-09-17');
    expect(toLocalYMD(businessDateFor(local(2026, 9, 17, 9)).businessDate)).toBe('2026-09-17');
  });

  it('buildSessionMeta: una sesión nocturna que cruza medianoche tiene un solo businessDate', () => {
    const meta = buildSessionMeta([
      venta({ sesion: 'S1', date: local(2026, 9, 17, 22, 10) }),
      venta({ sesion: 'S1', date: local(2026, 9, 18, 1, 30) }),
      venta({ sesion: 'S1', date: local(2026, 9, 18, 5, 40) })
    ]);
    expect(meta.S1.turno).toBe('turno3');
    expect(toLocalYMD(meta.S1.businessDate)).toBe('2026-09-17');
  });
});

describe('useBusinessMetrics', () => {
  const noche17 = [
    venta({ sesion: 'S-NOCHE', order_ref: '100', date: local(2026, 9, 17, 22, 30), unit_price: 100, quantity: 1, total_cost: 60 }),
    venta({ sesion: 'S-NOCHE', order_ref: '101', date: local(2026, 9, 18, 2, 0), unit_price: 50, quantity: 2, total_cost: 40 })
  ];
  const manana18 = [
    venta({ sesion: 'S-MANANA', order_ref: '100', date: local(2026, 9, 18, 8, 0), unit_price: 20, quantity: 1, total_cost: 10 })
  ];
  const ventas = [...noche17, ...manana18];

  it('el gráfico diario agrupa por día operativo local: toda la sesión nocturna cae en el 17', () => {
    const { result } = renderHook(() => useBusinessMetrics({ ventas, timeGrouping: 'daily' }));
    const dia17 = result.current.trendData.find(t => t.time === '2026-09-17');
    const dia18 = result.current.trendData.find(t => t.time === '2026-09-18');
    expect(dia17?.revenue).toBe(200);
    expect(dia17?.turno3).toBe(200);
    expect(dia17?.sessionIds).toEqual(['S-NOCHE']);
    expect(dia18?.revenue).toBe(20);
  });

  it('el filtro por rango no fragmenta una sesión: "18" no incluye la madrugada de la sesión nocturna', () => {
    const { result } = renderHook(() => useBusinessMetrics({
      ventas,
      dateRange: { start: local(2026, 9, 18, 0), end: local(2026, 9, 18, 0) }
    }));
    expect(result.current.totalRevenue).toBe(20);
    expect(result.current.sessionSummaries.map(s => s.sesion)).toEqual(['S-MANANA']);

    const { result: r17 } = renderHook(() => useBusinessMetrics({
      ventas,
      dateRange: { start: local(2026, 9, 17, 0), end: local(2026, 9, 17, 0) }
    }));
    expect(r17.current.totalRevenue).toBe(200);
    expect(r17.current.sessionSummaries[0].revenue).toBe(200);
  });

  it('los tickets se deduplican por sesión + referencia (misma referencia en dos sesiones = 2 tickets)', () => {
    const { result } = renderHook(() => useBusinessMetrics({ ventas }));
    expect(result.current.totalTransactions).toBe(3);
    expect(result.current.staffData[0].txs).toBe(3);
  });

  it('cruza ventas con inventario por odoo_id para nombre canónico y stock muerto', () => {
    const inventario: OdooInventario[] = [
      { id: 'inv-1', odoo_id: '__export__.product_template_77_ab', product_name: 'NOMBRE CANONICO', precio: 100, costo: 60, stock: 5 },
      { id: 'inv-2', odoo_id: '88', product_name: 'SIN VENTAS', precio: 30, costo: 20, stock: 3 }
    ];
    const v = [venta({ odoo_id: '77', product_name: 'nombre viejo', date: local(2026, 9, 17, 10), total_cost: 0, quantity: 2, unit_price: 100 })];
    const { result } = renderHook(() => useBusinessMetrics({ ventas: v, inventario }));
    expect(result.current.topMovers[0].fullName).toBe('NOMBRE CANONICO');
    // costo tomado del inventario cuando Odoo no lo trae: 2 × 60
    expect(result.current.totalCost).toBe(120);
    expect(result.current.deadStock.map(d => d.fullName)).toEqual(['SIN VENTAS']);
  });

  it('calculatedWeeklySales divide entre las semanas realmente cubiertas', () => {
    const v = [
      venta({ date: local(2026, 9, 10, 10), unit_price: 700, quantity: 1 }),
      venta({ date: local(2026, 9, 17, 10), unit_price: 700, quantity: 1 })
    ];
    const { result } = renderHook(() => useBusinessMetrics({ ventas: v, weeklySales: 999 }));
    // 7 días de cobertura → 1 semana → 1400, no 1400/4
    expect(result.current.calculatedWeeklySales).toBe(1400);
    const { result: vacio } = renderHook(() => useBusinessMetrics({ ventas: [], weeklySales: 999 }));
    expect(vacio.current.calculatedWeeklySales).toBe(999);
  });

  it('flujoComercial cuenta órdenes conciliadas aunque sigan "Pendiente"', () => {
    const now = new Date();
    const orden = (p: Partial<PurchaseOrder>): PurchaseOrder => ({
      id: 'o', provider: 'X', created_at: now.toISOString(), status: 'Pendiente', items: [], total: 100, ...p
    });
    const ordenes = [
      orden({ id: 'a', conciliado: true, monto_factura_real: 120 }),
      orden({ id: 'b', status: 'Completado' }),
      orden({ id: 'c' })
    ];
    const { result } = renderHook(() => useBusinessMetrics({ ventas: [], ordenes }));
    expect(result.current.flujoComercial.estimado).toBe(200);
    expect(result.current.flujoComercial.comprado).toBe(220);
    expect(result.current.flujoComercial.varianza).toBe(20);
  });
});
