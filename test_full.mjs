import Papa from 'papaparse';
import fs from 'fs';

const csvString = `"id","name","product_brand_id","default_code","list_price","standard_price","qty_available",".id","id","categ_id"
"__export__.product_template_6373_884b739c","769229004007","","","1.0","0.0","0.0","6373","__export__.product_template_6373_884b739c",""
"__export__.product_template_5626_6f14eb9c","ABDOL GOTAS","PHARMALAT","PHA-029","91.43","64.0","5.0","5626","__export__.product_template_5626_6f14eb9c","ANALGESICO"`;

Papa.parse(csvString, {
  header: true,
  skipEmptyLines: true,
  complete: function(results) {
    const rows = results.data;
    console.log("Rows:", rows.length);
    console.log("Keys of first row:", Object.keys(rows[0]));
    
    const getVal = (row, keys) => {
      const rowKeys = Object.keys(row);
      for (const searchKey of keys) {
        const match = rowKeys.find(k => k.toLowerCase().trim() === searchKey.toLowerCase().trim());
        if (match && row[match]) return row[match];
      }
      return '';
    };

    const rawPayload = rows.map(row => {
      const id = getVal(row, ['ID', 'ID externo', 'id', 'odoo_id', '.id']);
      if (!id) return null;

      return {
        odoo_id: id.trim(),
        product_name: getVal(row, ['Nombre', 'Producto', 'Nombre de producto', 'name']).trim() || 'Producto Sin Nombre',
        marca: getVal(row, ['Marca', 'product_brand_id']).trim() || 'Sin Marca',
        referencia: getVal(row, ['Referencia interna', 'default_code']).trim(),
        precio: parseFloat(String(getVal(row, ['Precio de venta', 'Precio', 'list_price']) || '0').replace(/,/g, '')),
        costo: parseFloat(String(getVal(row, ['Costo', 'standard_price']) || '0').replace(/,/g, '')),
        stock: parseFloat(String(getVal(row, ['Cantidad a la mano', 'Stock', 'qty_available']) || '0').replace(/,/g, '')),
        categoria: getVal(row, ['Categoría del producto', 'categ_id']).trim() || 'Sin Categoria',
      };
    }).filter(Boolean);

    console.log("Raw payload length:", rawPayload.length);
    console.log("First element:", rawPayload[0]);
  }
});
