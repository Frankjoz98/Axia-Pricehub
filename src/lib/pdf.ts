import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { CartItem } from '../types';

export const generatePurchaseOrderPDF = async (provider: string, items: CartItem[]) => {
  const doc = new jsPDF();
  
  // Try to load the logo
  let imgData = null;
  try {
    const response = await fetch('/axia_logo.png');
    if (response.ok) {
      const blob = await response.blob();
      imgData = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
    }
  } catch (e) {
    console.warn("Logo not found or could not be loaded");
  }

  // Header
  if (imgData) {
    doc.addImage(imgData, 'PNG', 14, 10, 40, 40, undefined, 'FAST');
  }
  
  doc.setFontSize(22);
  doc.setTextColor(40);
  doc.text('ORDEN DE COMPRA', imgData ? 60 : 14, 25);
  
  doc.setFontSize(10);
  doc.setTextColor(100);
  const dateStr = new Date().toLocaleDateString('es-NI', { year: 'numeric', month: 'long', day: 'numeric' });
  doc.text(`Fecha: ${dateStr}`, imgData ? 60 : 14, 32);
  doc.text(`Farmacia Axia 24/7`, imgData ? 60 : 14, 38);
  
  doc.setFontSize(14);
  doc.setTextColor(0);
  doc.text(`Proveedor: ${provider}`, 14, 60);

  // Table Data
  const tableColumn = ["Cód.", "Producto", "Cant.", "Precio U. (C$)", "Subtotal (C$)"];
  const tableRows = items.map(item => [
    item.selectedOffer.providerCode,
    item.product.name,
    item.quantity.toString(),
    item.selectedOffer.netPrice.toFixed(2),
    (item.quantity * item.selectedOffer.netPrice).toFixed(2)
  ]);

  const total = items.reduce((a, c) => a + (c.quantity * c.selectedOffer.netPrice), 0);

  autoTable(doc, {
    startY: 65,
    head: [tableColumn],
    body: tableRows,
    theme: 'grid',
    headStyles: { fillColor: [139, 92, 246] }, // Violeta Axia
    styles: { fontSize: 9 },
    columnStyles: {
      0: { cellWidth: 25 },
      2: { halign: 'center' },
      3: { halign: 'right' },
      4: { halign: 'right', fontStyle: 'bold' }
    },
    didDrawPage: (data) => {
      // Footer con firma
      const str = 'Autorizado por: _________________________';
      doc.setFontSize(10);
      const pageSize = doc.internal.pageSize;
      const pageHeight = pageSize.height ? pageSize.height : pageSize.getHeight();
      doc.text(str, data.settings.margin.left, pageHeight - 20);
    }
  });

  const finalY = (doc as any).lastAutoTable.finalY || 65;
  doc.setFontSize(12);
  doc.setTextColor(0);
  doc.text(`Total Interno: C$ ${total.toFixed(2)}`, 140, finalY + 10);

  doc.save(`Orden_Compra_${provider.replace(/\s+/g, '_')}_${new Date().getTime()}.pdf`);
};
