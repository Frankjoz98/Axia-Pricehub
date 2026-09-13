import Papa from 'papaparse';
import fs from 'fs';

const csvString = `"Nombre","Marca","Referencia interna","Precio de venta","Costo","Cantidad a la mano","ID","ID externo","Categoría del producto"
"ABDOL GOTAS","PHARMALAT","PHA-029","91.43","64.0","5.0","5626","__export__.product_template_5626_6f14eb9c","ANALGESICO"`;

Papa.parse(csvString, {
  header: true,
  complete: function(results) {
    console.log("Parsed rows:", results.data.length);
    console.log("First row keys:", Object.keys(results.data[0]));
    console.log("Has ID?", !!results.data[0]['ID']);
  }
});
