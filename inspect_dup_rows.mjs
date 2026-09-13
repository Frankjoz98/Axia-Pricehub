import fs from 'fs';
import Papa from 'papaparse';

const csvPath = 'C:/Users/F Conrado/.gemini/antigravity-ide/brain/a75abecc-2c40-44df-92eb-3eac18935bd1/.user_uploaded/media_1788363563310.csv';
const content = fs.readFileSync(csvPath, 'utf8');

Papa.parse(content, {
  header: true,
  skipEmptyLines: true,
  complete: (results) => {
    const rows = results.data;
    const targetNames = ['BLODIN HIERRO', 'CONDONES CLASICOS C*3UND - PRUDENCE', 'DOLO ALTASTRESS AMP'];
    const matching = rows.filter(r => targetNames.includes(r['Nombre']));
    console.log("Matching rows for duplicates:", matching);
  }
});
