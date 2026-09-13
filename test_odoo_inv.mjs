import fs from 'fs';
import Papa from 'papaparse';

const csvPath = 'C:/Users/F Conrado/.gemini/antigravity-ide/brain/a75abecc-2c40-44df-92eb-3eac18935bd1/.user_uploaded/media_1788363563310.csv';
const content = fs.readFileSync(csvPath, 'utf8');

Papa.parse(content, {
  header: true,
  skipEmptyLines: true,
  complete: (results) => {
    const rows = results.data;
    console.log("Total rows in CSV:", rows.length);
    console.log("First row keys:", Object.keys(rows[0]));
    
    const rawPayload = rows
      .filter(row => row['Nombre'] || row['Producto'] || row['Nombre de producto'])
      .map(row => ({
        product_name: (row['Nombre'] || row['Producto'] || row['Nombre de producto']).trim(),
        marca: row['Marca'] || 'Sin Marca',
        referencia: row['Referencia interna'] || '',
        precio: parseFloat(String(row['Precio de venta'] || row['Precio'] || '0').replace(/,/g, '')),
        costo: parseFloat(String(row['Costo'] || '0').replace(/,/g, '')),
        stock: parseFloat(String(row['Cantidad a la mano'] || row['Stock'] || '0').replace(/,/g, '')),
        categoria: row['Categoría del producto'] || 'Sin Categoria',
      }));

    console.log("Raw payload count:", rawPayload.length);

    const seen = new Set();
    const duplicates = [];
    const upsertPayload = rawPayload.filter(row => {
      const key = row.product_name.toLowerCase();
      if (seen.has(key)) {
        duplicates.push(row.product_name);
        return false;
      }
      seen.add(key);
      return true;
    });

    console.log("Unique products count:", upsertPayload.length);
    console.log("Duplicates count:", duplicates.length);
    if (duplicates.length > 0) {
      console.log("Sample duplicates:", duplicates.slice(0, 10));
    }

    // Check for NaN or 0 stock
    const naNs = upsertPayload.filter(r => isNaN(r.precio) || isNaN(r.costo) || isNaN(r.stock));
    console.log("NaN count:", naNs.length);

    const withStock = upsertPayload.filter(r => r.stock > 0);
    console.log("Products with stock > 0:", withStock.length);
    const withZeroStock = upsertPayload.filter(r => r.stock === 0);
    console.log("Products with stock == 0:", withZeroStock.length);
    const withNegativeStock = upsertPayload.filter(r => r.stock < 0);
    console.log("Products with stock < 0:", withNegativeStock.length);
  }
});
