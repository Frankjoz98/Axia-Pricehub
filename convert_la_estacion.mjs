import xlsx from 'xlsx';
import fs from 'fs';
const { readFile, utils } = xlsx;

const filePath = 'C:/Users/F Conrado/Downloads/la estacion (9).xlsx';
const workbook = readFile(filePath);
const firstSheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[firstSheetName];

const rows = utils.sheet_to_json(worksheet, { header: 1 });

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

for (let i = 1; i < rows.length; i++) {
  const row = rows[i];
  if (!row || row.length === 0) continue;

  const codigo = String(row[0] || '').trim();
  let nombre = String(row[1] || '').trim();
  const laboratorio = String(row[2] || '').trim();
  
  if (!nombre && !codigo) continue;
  if (!nombre) nombre = `Producto ${codigo}`;

  // Clean quotes
  nombre = nombre.replace(/^"|"$/g, '').replace(/""/g, '"').trim();

  // Determine price
  let precioStr = String(row[3] || '').replace(/,/g, '').trim();
  if (!precioStr || precioStr === '-' || isNaN(parseFloat(precioStr)) || parseFloat(precioStr) <= 0) {
    precioStr = String(row[4] || '').replace(/,/g, '').trim();
  }

  let precio = parseFloat(precioStr);
  if (isNaN(precio) || precio <= 0) {
    continue; // Skip products without valid price
  }

  // Infer level
  let nivel = 2;
  const upper = nombre.toUpperCase();
  if (upper.includes('ACETAMINOFEN') || upper.includes('IBUPROFENO') || upper.includes('PARACETAMOL') || upper.includes('AMOXICILINA') || upper.includes('VIROGRIP') || upper.includes('DOLO') || upper.includes('ELECTROLIT') || upper.includes('SUERO')) {
    nivel = 1;
  } else if (upper.includes('GEL') || upper.includes('CREMA') || upper.includes('SHAMPOO') || upper.includes('DERM') || upper.includes('SOLAR') || upper.includes('JABON') || upper.includes('PROTECTOR')) {
    nivel = 3;
  }

  // Category
  let categoria = laboratorio || 'General';

  outputRows.push([
    `"${nombre.replace(/"/g, '""')}"`,
    `"${laboratorio.replace(/"/g, '""')}"`,
    `"${categoria.replace(/"/g, '""')}"`,
    nivel,
    'LA ESTACION',
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

fs.writeFileSync('d:/Novarix/Axia PriceHub/public/catalogo_la_estacion.csv', csvContent, 'utf8');
fs.writeFileSync('d:/Novarix/Axia PriceHub/catalogo_la_estacion.csv', csvContent, 'utf8');

console.log(`Generated catalogo_la_estacion.csv with ${validCount} valid products.`);
