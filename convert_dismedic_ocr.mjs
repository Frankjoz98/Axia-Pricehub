import fs from 'fs';
import { stringify } from 'csv-stringify/sync';
import { ocrText } from './ocr_data.mjs';

async function processPdf() {
  const textLines = ocrText.split('\n');
  const products = [];
  
  let currentProductLines = [];

  const finishProduct = () => {
    if (currentProductLines.length === 0) return;
    
    let combined = currentProductLines.join(' ').trim();
    
    // Extract code
    const codeMatch = combined.match(/^(\d{8,}(?:-\w*)?)\s+/);
    if (!codeMatch) {
      currentProductLines = [];
      return;
    }
    const codigo = codeMatch[1];
    combined = combined.substring(codeMatch[0].length).trim();
    
    // Extract prices from the end
    const priceMatch = combined.match(/([\d,]+\.\d{2})\s+([\d,]+\.\d{2})$/);
    if (!priceMatch) {
      currentProductLines = [];
      return;
    }
    
    const precioFarmacia = parseFloat(priceMatch[1].replace(/,/g, ''));
    
    combined = combined.substring(0, combined.length - priceMatch[0].length).trim();
    
    products.push({
      codigo_proveedor: codigo,
      nombre_producto: combined,
      proveedor: 'DISMEDIC - CAPLIN',
      precio_base: precioFarmacia,
      descuento_porcentaje: 0
    });
    
    currentProductLines = [];
  };

  let isData = false;
  for (let line of textLines) {
    let t = line.trim();
    if (!t) continue;
    
    // Skip headers and metadata
    if (t.startsWith('==')) continue;
    if (t.includes('DINIMEDIC S.A')) continue;
    if (t.includes('"Lista de precios"')) continue;
    if (t.includes('Al 24/04/2026')) continue;
    if (t.startsWith('Código Descripción Comercial')) {
      isData = true;
      continue;
    }
    
    if (!isData) continue;
    
    // Check if new product starts
    if (/^\d{8,}/.test(t)) {
      finishProduct();
    }
    
    currentProductLines.push(t);
  }
  
  // Finish the last product
  finishProduct();

  const csv = stringify(products, { header: true });
  fs.writeFileSync('catalogo_dismedic.csv', csv);
  console.log(`Converted ${products.length} products to catalogo_dismedic.csv`);
}

processPdf().catch(console.error);
