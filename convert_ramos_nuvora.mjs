import fs from 'fs';
import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';
import { csvData } from './csv_data_ramos.mjs';

function processCsv() {
  const parts = csvData.trim().split('﻿Código,Descripción Comercial,Descripción Genérica,Concentración,Forma Farmaceútica,Presentación,P. Farmacia');
  
  const section1 = parts[0].trim();
  const section2 = 'Código,Descripción Comercial,Descripción Genérica,Concentración,Forma Farmaceútica,Presentación,P. Farmacia\n' + parts[1].trim();

  const productsRamos = [];
  const productsNuvora = [];

  const addProduct = (code, name, price) => {
    const isNuvora = name.toUpperCase().includes('NUVO');
    const provider = isNuvora ? 'DISMEDIC - NUVORA' : 'DISMEDIC - RAMOS';
    const product = {
      codigo_proveedor: code,
      nombre_producto: name,
      proveedor: provider,
      precio_base: isNaN(price) ? 0 : price,
      descuento_porcentaje: 0
    };

    if (isNuvora) productsNuvora.push(product);
    else productsRamos.push(product);
  };

  // Parse Section 1
  const records1 = parse(section1, {
    columns: true,
    skip_empty_lines: true
  });

  records1.forEach((r, index) => {
    // Generate a code since it doesn't have one
    const code = `RAMOS-${(index + 1).toString().padStart(4, '0')}`;
    const name = [
      r['Descripción Comercial'],
      r['Descripción Genérica'],
      r['Forma Farmaceútica'],
      r['Presentación']
    ].filter(Boolean).join(' ');

    const price = parseFloat(r['Precio Farmacia']);
    addProduct(code, name, price);
  });

  // Parse Section 2
  const records2 = parse(section2, {
    columns: true,
    skip_empty_lines: true
  });

  records2.forEach(r => {
    const code = r['Código'];
    const name = [
      r['Descripción Comercial'],
      r['Descripción Genérica'],
      r['Concentración'],
      r['Forma Farmaceútica'],
      r['Presentación']
    ].filter(Boolean).join(' ');

    const price = parseFloat(r['P. Farmacia']);
    addProduct(code, name, price);
  });

  const csvRamos = stringify(productsRamos, { header: true });
  fs.writeFileSync('catalogo_dismedic_ramos.csv', csvRamos);
  
  const csvNuvora = stringify(productsNuvora, { header: true });
  fs.writeFileSync('catalogo_dismedic_nuvora.csv', csvNuvora);
  
  console.log(`Converted ${productsRamos.length} Ramos products and ${productsNuvora.length} Nuvora products.`);
}

processCsv();
