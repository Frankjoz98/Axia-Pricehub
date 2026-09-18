import xlsx from 'xlsx';
import fs from 'fs';
const { readFile, utils } = xlsx;

const filePath = 'C:/Users/F Conrado/OneDrive/Escritorio/catalogos/LP FARMACOS SEPT 2025.xlsx';
const workbook = readFile(filePath);
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const rows = utils.sheet_to_json(sheet, { header: 1 });

const outputRows = [];
outputRows.push([
  'nombre_producto',
  'ingrediente_activo',
  'categoria',
  'nivel',
  'proveedor',
  'codigo_proveedor',
  'precio_base',
  'descuento_porcentaje',
  'precio_neto',
  'escala_compra',
  'escala_regalo'
]);

let validCount = 0;
let currentSubline = 'General';

for (let i = 0; i < rows.length; i++) {
  const row = rows[i];
  if (!row || row.length === 0) continue;

  const col0 = String(row[0] || '').trim();
  const col1 = String(row[1] || '').trim();
  const col2 = String(row[2] || '').trim();

  // Track sublines or category headers
  if (col0.startsWith('Sub Línea:') || col0.startsWith('Línea:')) {
    currentSubline = col0.replace(/Sub Línea:|Línea:/g, '').replace(/\|/g, '-').trim();
    continue;
  }

  // Skip header row
  if (col0 === 'LINEA' && col1 === 'Código') continue;
  if (!col1 && !col2) continue;

  const codigo = col1;
  const nombre = col2;
  const linea = col0 || currentSubline;

  // Price Farmacia is column 4 (index 4)
  let precioRaw = row[4];
  if (precioRaw === undefined || precioRaw === null || precioRaw === '-') {
    precioRaw = row[5]; // check precio publico if farmacia missing
  }

  const precio = typeof precioRaw === 'number' ? precioRaw : parseFloat(String(precioRaw || '').replace(/,/g, '').trim());
  if (isNaN(precio) || precio <= 0) continue;

  // Infer level
  let nivel = 2;
  const upper = nombre.toUpperCase();
  if (upper.includes('ACETAMINOFEN') || upper.includes('IBUPROFENO') || upper.includes('PARACETAMOL') || upper.includes('AMOXICILINA') || upper.includes('VIROGRIP') || upper.includes('DOLO') || upper.includes('ELECTROLIT') || upper.includes('SUERO') || upper.includes('NEUROBION')) {
    nivel = 1;
  } else if (upper.includes('GEL') || upper.includes('CREMA') || upper.includes('SHAMPOO') || upper.includes('DERM') || upper.includes('SOLAR') || upper.includes('JABON') || upper.includes('PROTECTOR') || upper.includes('ENSURE') || upper.includes('GLUCERNA') || upper.includes('PEDIASURE')) {
    nivel = 3;
  }

  outputRows.push([
    `"${nombre.replace(/"/g, '""')}"`,
    `"${linea.replace(/"/g, '""')}"`,
    `"${linea.replace(/"/g, '""')}"`,
    nivel,
    'DICEGSA',
    `"${codigo}"`,
    precio.toFixed(2),
    0,
    precio.toFixed(2),
    0,
    0
  ]);
  validCount++;
}

const csvContent = '\uFEFF' + outputRows.map(r => r.join(',')).join('\n');

fs.writeFileSync('d:/Novarix/Axia PriceHub/public/catalogo_dicegsa.csv', csvContent, 'utf8');
fs.writeFileSync('d:/Novarix/Axia PriceHub/catalogo_dicegsa.csv', csvContent, 'utf8');

console.log(`Generated catalogo_dicegsa.csv with ${validCount} valid products.`);
