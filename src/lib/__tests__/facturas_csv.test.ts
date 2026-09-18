import { describe, it, expect } from 'vitest';
import { isFacturaVencida, isFacturaPendienteVigente } from '../facturas';
import { csvGetVal, csvNumber } from '../csv';

describe('lib/facturas', () => {
  const hoy = new Date(2026, 8, 17, 20, 0); // 17 sep 2026, 20:00 local

  it('marcada como vencida siempre es vencida', () => {
    expect(isFacturaVencida({ estado: 'vencida', fecha_vencimiento: '2099-01-01' }, hoy)).toBe(true);
  });

  it('pendiente con vencimiento pasado está vencida; con vencimiento hoy o futuro no', () => {
    expect(isFacturaVencida({ estado: 'pendiente', fecha_vencimiento: '2026-09-16' }, hoy)).toBe(true);
    expect(isFacturaVencida({ estado: 'pendiente', fecha_vencimiento: '2026-09-17' }, hoy)).toBe(false);
    expect(isFacturaVencida({ estado: 'pendiente', fecha_vencimiento: '2026-09-18' }, hoy)).toBe(false);
  });

  it('pagada nunca está vencida ni pendiente', () => {
    expect(isFacturaVencida({ estado: 'pagada', fecha_vencimiento: '2020-01-01' }, hoy)).toBe(false);
    expect(isFacturaPendienteVigente({ estado: 'pagada', fecha_vencimiento: '2099-01-01' }, hoy)).toBe(false);
  });

  it('pendiente vigente y vencida son excluyentes (sin doble conteo en KPIs)', () => {
    const vencida = { estado: 'pendiente' as const, fecha_vencimiento: '2026-09-10' };
    const vigente = { estado: 'pendiente' as const, fecha_vencimiento: '2026-09-25' };
    expect(isFacturaPendienteVigente(vencida, hoy)).toBe(false);
    expect(isFacturaVencida(vencida, hoy)).toBe(true);
    expect(isFacturaPendienteVigente(vigente, hoy)).toBe(true);
    expect(isFacturaVencida(vigente, hoy)).toBe(false);
  });
});

describe('lib/csv', () => {
  it('csvGetVal resuelve cabeceras sin distinguir mayúsculas ni espacios', () => {
    const row = { ' Nombre ': 'ABDOL', 'Cantidad a la mano': '5.0', 'ID': '' };
    expect(csvGetVal(row, ['nombre'])).toBe('ABDOL');
    expect(csvGetVal(row, ['Stock', 'Cantidad a la mano'])).toBe('5.0');
    expect(csvGetVal(row, ['ID', 'id'])).toBe('');
    expect(csvGetVal(row, ['no existe'])).toBe('');
  });

  it('csvNumber tolera separadores de miles y valores vacíos', () => {
    expect(csvNumber('1,234.50')).toBe(1234.5);
    expect(csvNumber('')).toBe(0);
    expect(csvNumber(undefined)).toBe(0);
    expect(csvNumber('abc')).toBe(0);
    expect(csvNumber('-3')).toBe(-3);
  });
});
