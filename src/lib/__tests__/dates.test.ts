import { describe, it, expect } from 'vitest';
import {
  toLocalYMD, parseLocalYMD, daysUntil, isPastLocalDate, startOfLocalDay, endOfLocalDay,
  startOfLocalWeekMonday, addLocalDays, isoWeekNumber
} from '../dates';

describe('lib/dates (hora local, UTC-6 en producción)', () => {
  it('toLocalYMD usa el día local aunque en UTC ya sea mañana', () => {
    // 21:30 local del 17 → en UTC-6 es 03:30Z del 18; toISOString() diría "18"
    const d = new Date(2026, 8, 17, 21, 30, 0);
    expect(toLocalYMD(d)).toBe('2026-09-17');
  });

  it('parseLocalYMD devuelve medianoche LOCAL del mismo día (no el día anterior a las 18:00)', () => {
    const d = parseLocalYMD('2026-09-17');
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(8);
    expect(d.getDate()).toBe(17);
    expect(d.getHours()).toBe(0);
    // jueves: sin la corrección, new Date('2026-09-17').getDay() en UTC-6 daría miércoles
    expect(d.getDay()).toBe(4);
  });

  it('parseLocalYMD delega timestamps ISO completos a Date', () => {
    const iso = '2026-09-17T15:00:00.000Z';
    expect(parseLocalYMD(iso).getTime()).toBe(new Date(iso).getTime());
  });

  it('daysUntil cuenta días calendario y no depende de la hora actual', () => {
    const from = new Date(2026, 8, 17, 23, 59);
    expect(daysUntil('2026-09-17', from)).toBe(0);
    expect(daysUntil('2026-09-20', from)).toBe(3);
    expect(daysUntil('2026-09-15', from)).toBe(-2);
  });

  it('isPastLocalDate: una factura que vence hoy NO está vencida', () => {
    const from = new Date(2026, 8, 17, 23, 0);
    expect(isPastLocalDate('2026-09-17', from)).toBe(false);
    expect(isPastLocalDate('2026-09-16', from)).toBe(true);
  });

  it('startOfLocalDay / endOfLocalDay cubren el día completo', () => {
    const d = new Date(2026, 8, 17, 13, 45);
    expect(startOfLocalDay(d).getHours()).toBe(0);
    expect(endOfLocalDay(d).getHours()).toBe(23);
    expect(endOfLocalDay(d).getMilliseconds()).toBe(999);
    expect(toLocalYMD(endOfLocalDay(d))).toBe('2026-09-17');
  });

  it('startOfLocalWeekMonday: el domingo pertenece a la semana que empezó el lunes anterior', () => {
    const domingo = new Date(2026, 8, 20, 10, 0); // 20 sep 2026 es domingo
    expect(toLocalYMD(startOfLocalWeekMonday(domingo))).toBe('2026-09-14');
    const lunes = new Date(2026, 8, 14, 3, 0);
    expect(toLocalYMD(startOfLocalWeekMonday(lunes))).toBe('2026-09-14');
  });

  it('addLocalDays cruza fin de mes', () => {
    expect(toLocalYMD(addLocalDays(new Date(2026, 8, 30, 12), 1))).toBe('2026-10-01');
    expect(toLocalYMD(addLocalDays(new Date(2026, 9, 1, 12), -1))).toBe('2026-09-30');
  });

  it('isoWeekNumber sigue ISO-8601', () => {
    expect(isoWeekNumber(new Date(2026, 0, 1))).toBe(1);
    expect(isoWeekNumber(new Date(2026, 11, 31))).toBe(53);
  });
});
