import fs from 'fs';
import Papa from 'papaparse';

const csvPath = 'C:/Users/F Conrado/.gemini/antigravity-ide/brain/a75abecc-2c40-44df-92eb-3eac18935bd1/.user_uploaded/media_1788363563310.csv';
const content = fs.readFileSync(csvPath, 'utf8');

Papa.parse(content, {
  header: true,
  skipEmptyLines: true,
  complete: (results) => {
    const rows = results.data;
    const marcasRaw = rows.map(r => r['Marca'] || '');
    const marcasTrimmed = marcasRaw.map(m => m.trim());
    
    // Find marcas with trailing/leading spaces
    const withSpaces = new Set();
    marcasRaw.forEach(m => {
      if (m !== m.trim()) {
        withSpaces.add(`"${m}"`);
      }
    });

    console.log("Brands with trailing/leading whitespace in Odoo CSV:", Array.from(withSpaces));
  }
});
