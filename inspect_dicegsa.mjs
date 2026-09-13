import xlsx from 'xlsx';
const { readFile, utils } = xlsx;

const filePath = 'C:/Users/F Conrado/OneDrive/Escritorio/catalogos/LP FARMACOS SEPT 2025.xlsx';
const workbook = readFile(filePath);
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const rows = utils.sheet_to_json(sheet, { header: 1 });

console.log(JSON.stringify(rows.slice(4, 35), null, 2));
