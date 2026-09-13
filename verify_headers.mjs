// Quick script to verify format and IDs
const invHeader = ["Nombre","Marca","Referencia interna","Precio de venta","Costo","Cantidad a la mano","ID","ID externo","Categoría del producto"];
const salesHeader = ["Ref. de la orden","Sesión","Fecha","Punto de venta","Número de recibo","Cliente","Vendedor","Cajero","Total","Estado","Estado de la factura","Líneas de la orden/Producto/ID","Líneas de la orden/Producto/Marca","Líneas de la orden/Cantidad","Líneas de la orden/Precio unitario","Líneas de la orden/Costo total","Nombre del cajero","Líneas de la orden/Producto/Nombre"];

console.log("Inventory header valid:", invHeader.includes("ID") && invHeader.includes("Cantidad a la mano"));
console.log("Sales header valid:", salesHeader.includes("Líneas de la orden/Producto/ID") && salesHeader.includes("Líneas de la orden/Cantidad"));
