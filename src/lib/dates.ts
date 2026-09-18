// Utilidades de fecha en HORA LOCAL del navegador (la farmacia opera en Nicaragua, UTC-6).
//
// Regla: nunca usar `toISOString().split('T')[0]` para obtener "el día" ni `new Date('YYYY-MM-DD')`
// para parsear una fecha sin hora. Ambos operan en UTC y corren el día ±1 después de las 18:00 local.

export type YMD = string; // 'YYYY-MM-DD'

const pad2 = (n: number) => String(n).padStart(2, '0');

/** Fecha local como 'YYYY-MM-DD'. */
export function toLocalYMD(date: Date): YMD {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

/** Hoy en hora local como 'YYYY-MM-DD'. */
export function todayYMD(): YMD {
  return toLocalYMD(new Date());
}

/**
 * Parsea 'YYYY-MM-DD' como medianoche LOCAL. Acepta también timestamps ISO completos
 * (los delega a `new Date`, que sí los interpreta correctamente por llevar zona horaria).
 */
export function parseLocalYMD(value: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 0, 0, 0, 0);
  return new Date(value);
}

/** Inicio del día local (00:00:00.000). */
export function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
}

/** Fin del día local (23:59:59.999). */
export function endOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}

/** Días calendario entre hoy (local) y una fecha 'YYYY-MM-DD'. Negativo si ya pasó. */
export function daysUntil(ymd: string, from: Date = new Date()): number {
  const target = parseLocalYMD(ymd);
  const base = startOfLocalDay(from);
  return Math.round((target.getTime() - base.getTime()) / 86_400_000);
}

/** true si la fecha 'YYYY-MM-DD' es anterior al día local de `from`. */
export function isPastLocalDate(ymd: string, from: Date = new Date()): boolean {
  return daysUntil(ymd, from) < 0;
}

/** Suma días calendario a una fecha local devolviendo un nuevo Date. */
export function addLocalDays(date: Date, days: number): Date {
  const d = new Date(date.getTime());
  d.setDate(d.getDate() + days);
  return d;
}

/** Lunes de la semana local que contiene `date`, a las 00:00. */
export function startOfLocalWeekMonday(date: Date): Date {
  const d = startOfLocalDay(date);
  const day = d.getDay(); // 0 = domingo
  const diff = day === 0 ? -6 : 1 - day;
  return addLocalDays(d, diff);
}

/** Número de semana ISO-8601 de una fecha local. */
export function isoWeekNumber(d: Date): number {
  const date = new Date(d.getTime());
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + 3 - ((date.getDay() + 6) % 7));
  const week1 = new Date(date.getFullYear(), 0, 4);
  return 1 + Math.round(((date.getTime() - week1.getTime()) / 86_400_000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
}
