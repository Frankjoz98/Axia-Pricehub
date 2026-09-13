import xlsx from 'xlsx';
const { readFile, utils } = xlsx;

const filePath = 'C:/Users/F Conrado/Downloads/la estacion (9).xlsx';
const workbook = readFile(filePath);
const firstSheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[firstSheetName];

const jsonData = utils.sheet_to_json(worksheet, { header: 1 });
console.log(JSON.stringify(jsonData.slice(15, 45), null, 2));
