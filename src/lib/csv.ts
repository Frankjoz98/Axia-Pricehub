/** Fila de PapaParse con `header: true`: todas las celdas llegan como texto. */
export type CsvRow = Record<string, string | undefined>;

/**
 * Devuelve el primer valor no vacío entre varias cabeceras candidatas (Odoo exporta
 * nombres de columna distintos según idioma/versión). Comparación sin distinguir mayúsculas.
 */
export function csvGetVal(row: CsvRow, keys: string[]): string {
  const rowKeys = Object.keys(row);
  for (const searchKey of keys) {
    const match = rowKeys.find(k => k.toLowerCase().trim() === searchKey.toLowerCase().trim());
    if (match && row[match]) return String(row[match]);
  }
  return '';
}

/** Número a partir de una celda CSV ("1,234.50" → 1234.5); NaN/vacío → 0. */
export function csvNumber(raw: string | undefined): number {
  const n = parseFloat(String(raw ?? '0').replace(/,/g, ''));
  return Number.isFinite(n) ? n : 0;
}
