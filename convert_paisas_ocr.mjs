import fs from 'fs';
import { stringify } from 'csv-stringify/sync';

const logPath = 'C:\\\\Users\\\\F Conrado\\\\.gemini\\\\antigravity-ide\\\\brain\\\\a75abecc-2c40-44df-92eb-3eac18935bd1\\\\.system_generated\\\\logs\\\\transcript_full.jsonl';

async function processPdf() {
  const lines = fs.readFileSync(logPath, 'utf8').split('\\n');
  let ocrText = '';
  for (let i = lines.length - 1; i >= 0; i--) {
    if (!lines[i]) continue;
    try {
      const obj = JSON.parse(lines[i]);
      if (obj.type === 'USER_INPUT' && obj.content.includes('SOMOS PAISAS')) {
        ocrText = obj.content;
        break;
      }
    } catch (e) {}
  }

  if (!ocrText) {
    console.log('OCR text not found in transcript.');
    return;
  }

  const textLines = ocrText.split('\\n');
  const products = [];

  let isData = false;
  for (const line of textLines) {
    const t = line.trim();
    if (!t) continue;
    
    // Some lines might have === Screenshot
    if (t.startsWith('==')) continue;
    
    if (t.includes('Codigo') && t.includes('Descripcion') && t.includes('Marca')) {
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
