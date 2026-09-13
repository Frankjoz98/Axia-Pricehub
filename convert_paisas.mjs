import fs from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdf = require('pdf-parse');
import { stringify } from 'csv-stringify/sync';

const pdfPath = 'C:\\\\Users\\\\F Conrado\\\\.gemini\\\\antigravity-ide\\\\brain\\\\a75abecc-2c40-44df-92eb-3eac18935bd1\\\\.user_uploaded\\\\media_1787996900011.pdf';

async function processPdf() {
  const dataBuffer = fs.readFileSync(pdfPath);
  const data = await pdf.default ? pdf.default(dataBuffer) : pdf(dataBuffer);

  const text = data.text;
  const lines = text.split('\\n');

  const products = [];

  let isData = false;
  for (const line of lines) {
    const t = line.trim();
    if (!t) continue;
    
    if (t.includes('Codigo Descripcion Marca')) {
      isData = true;
      continue;
    }

    if (t.includes('SOMOS PAISAS') || t.includes('TU PROVEEDOR DE CONFIANZA') || t.includes('Inventario 21/4/2026') || t.includes('FINAL')) {
      continue;
    }

    if (!isData) continue;

    const parts = t.split(' ');
    if (parts.length < 3) continue;

    let priceStr = parts.pop();
    priceStr = priceStr.replace(/,/g, '');
    let precio = parseFloat(priceStr);
    
    if (isNaN(precio)) {
      continue;
    }

    let codigo = parts[0];
    
    parts.shift();
    const nombre = parts.join(' ').trim();

    products.push({
      codigo: codigo,
      nombre: nombre,
      laboratorio: 'PAISAS',
      precio: precio,
      descuento: 0
    });
  }

  const csv = stringify(products, { header: true });
  fs.writeFileSync('catalogo_paisas.csv', csv);
  console.log(`Converted ${products.length} products to catalogo_paisas.csv`);
}

processPdf().catch(console.error);
