import fs from 'fs';
import Papa from 'papaparse';

const fileContent = fs.readFileSync('C:/Users/F Conrado/.gemini/antigravity-ide/brain/a75abecc-2c40-44df-92eb-3eac18935bd1/.user_uploaded/media_1787989306540.csv', 'utf-8');

Papa.parse(fileContent, {
  header: true,
  skipEmptyLines: true,
  complete: (results) => {
    const rows = results.data;
    let lastOrderRef = '';
    let lastDate = null;
    
    const rawPayload = [];
    for (const row of rows) {
      if (row['Ref. de la orden']) {
        lastOrderRef = row['Ref. de la orden'];
        lastDate = row['Fecha'] ? new Date(row['Fecha'].replace(' ', 'T')).toISOString() : null;
      }
      const product_name = row['Líneas de la orden/Nombre completo del producto'];
      if (!product_name) continue;

      rawPayload.push({
        order_ref: lastOrderRef,
        date: lastDate,
        product_name: product_name.trim(),
        quantity: parseFloat((row['Líneas de la orden/Cantidad'] || '0').replace(/,/g, '')),
        unit_price: parseFloat((row['Líneas de la orden/Precio unitario'] || '0').replace(/,/g, ''))
      });
    }

    const aggregatedPayloadMap = new Map();
    for (const row of rawPayload) {
      if (!row.order_ref) continue;
      const key = `${row.order_ref}-${row.product_name}`;
      if (aggregatedPayloadMap.has(key)) {
        const existing = aggregatedPayloadMap.get(key);
        existing.quantity += row.quantity;
      } else {
        aggregatedPayloadMap.set(key, { ...row });
      }
    }
    
    const upsertPayload = Array.from(aggregatedPayloadMap.values());
    
    let totalAug30_New = 0;
    let totalAug29_New = 0;
    let totalAug30_Old = 0;
    let totalAug29_Old = 0;

    const oldPayload = rows.filter(row => row['Ref. de la orden'] && row['Líneas de la orden/Nombre completo del producto']).map(row => {
        return {
          date: row['Fecha'] ? new Date(row['Fecha'].replace(' ', 'T')).toISOString() : null,
          quantity: parseFloat((row['Líneas de la orden/Cantidad'] || '0').replace(/,/g, '')),
          unit_price: parseFloat((row['Líneas de la orden/Precio unitario'] || '0').replace(/,/g, ''))
        }
    });

    for(const r of oldPayload) {
        if (!r.date) continue;
        const localStr = new Date(r.date).toLocaleString("en-US", { timeZone: "America/Managua" });
        const rev = r.quantity * r.unit_price;
        if (localStr.includes("8/30/2026")) totalAug30_Old += rev;
        if (localStr.includes("8/29/2026")) totalAug29_Old += rev;
    }
    
    for(const r of upsertPayload) {
        if (!r.date) continue;
        const localStr = new Date(r.date).toLocaleString("en-US", { timeZone: "America/Managua" });
        const rev = r.quantity * r.unit_price;
        if (localStr.includes("8/30/2026")) totalAug30_New += rev;
        if (localStr.includes("8/29/2026")) totalAug29_New += rev;
    }
    
    console.log(`Old logic Aug 29: ${totalAug29_Old}`);
    console.log(`Old logic Aug 30: ${totalAug30_Old}`);
    console.log(`New logic Aug 29: ${totalAug29_New}`);
    console.log(`New logic Aug 30: ${totalAug30_New}`);

    // Let's also check what Reports.tsx was doing before the timezone fix:
    let totalAug30_Old_BadTimezone = 0;
    for(const r of oldPayload) {
        if (!r.date) continue;
        // Old Reports.tsx: timeKey = v.date.substring(0,10)
        const timeKey = r.date.substring(0, 10);
        const rev = r.quantity * r.unit_price;
        if (timeKey === "2026-08-30") totalAug30_Old_BadTimezone += rev;
    }
    console.log(`Old logic + Bad Timezone Aug 30: ${totalAug30_Old_BadTimezone}`);
  }
});
