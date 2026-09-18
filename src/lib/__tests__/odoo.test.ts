import { describe, it, expect } from 'vitest';
import { normalizeOdooId, stripOdooRef, nameKey, buildInventarioIndex, lineCost } from '../odoo';
import type { OdooInventario } from '../../types';

const inv = (partial: Partial<OdooInventario> & { id: string; product_name: string }): OdooInventario => ({
  precio: 100, costo: 60, stock: 10, ...partial
});

describe('lib/odoo', () => {
  it('normalizeOdooId extrae el número de un id externo de exportación', () => {
    expect(normalizeOdooId('__export__.product_template_5626_6f14eb9c')).toBe('5626');
    expect(normalizeOdooId('__export__.product_product_812_ab12')).toBe('812');
    expect(normalizeOdooId(' 5626 ')).toBe('5626');
    expect(normalizeOdooId('')).toBeNull();
    expect(normalizeOdooId(undefined)).toBeNull();
  });

  it('stripOdooRef y nameKey limpian el prefijo [REF]', () => {
    expect(stripOdooRef('[PHA-029] ABDOL GOTAS')).toBe('ABDOL GOTAS');
    expect(nameKey('[PHA-029] ABDOL Gotas ')).toBe('abdol gotas');
    expect(nameKey(undefined)).toBe('');
  });

  describe('buildInventarioIndex', () => {
    const index = buildInventarioIndex([
      inv({ id: 'a', odoo_id: '__export__.product_template_5626_x', product_name: 'ABDOL GOTAS' }),
      inv({ id: 'b', odoo_id: '900', product_name: 'IBUPROFENO 800 MG' }),
      inv({ id: 'c', product_name: 'VIROGRIP DIA' })
    ]);

    it('cruza por odoo_id numérico contra el id externo del inventario', () => {
      expect(index.find({ odoo_id: '5626', product_name: 'nombre viejo en odoo' })?.id).toBe('a');
      expect(index.resolveName({ odoo_id: '5626', product_name: 'nombre viejo' })).toBe('ABDOL GOTAS');
    });

    it('cruza por odoo_id exacto', () => {
      expect(index.find({ odoo_id: '900', product_name: 'x' })?.id).toBe('b');
    });

    it('cae a nombre (sin [REF], sin mayúsculas) cuando no hay odoo_id', () => {
      expect(index.find({ odoo_id: undefined, product_name: '[VG-1] virogrip dia' })?.id).toBe('c');
      // sin cruce por id, el nombre canónico es el de la venta
      expect(index.resolveName({ odoo_id: undefined, product_name: 'virogrip dia' })).toBe('virogrip dia');
    });

    it('devuelve undefined si no cruza por nada', () => {
      expect(index.find({ odoo_id: '1', product_name: 'NO EXISTE' })).toBeUndefined();
    });
  });

  it('lineCost prefiere el costo de Odoo y cae al costo del inventario', () => {
    const item = inv({ id: 'a', product_name: 'X', costo: 7 });
    expect(lineCost({ total_cost: 21, quantity: 3 }, item)).toBe(21);
    expect(lineCost({ total_cost: 0, quantity: 3 }, item)).toBe(21);
    expect(lineCost({ total_cost: 0, quantity: 3 }, undefined)).toBe(0);
    expect(lineCost({ total_cost: 0, quantity: 3 }, inv({ id: 'z', product_name: 'Z', costo: 0 }))).toBe(0);
  });
});
