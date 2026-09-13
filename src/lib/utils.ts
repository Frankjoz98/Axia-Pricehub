import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { CartItem } from '../types';

export function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

export function removeAccents(str: string): string {
  if (!str) return "";
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export function formatCurrency(amount: number): string {
  return `C$ ${amount.toLocaleString('es-NI', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function exportCartToCSV(cart: CartItem[], providerName?: string) {
  const headers = ['Proveedor', 'Código', 'Producto', 'Presentación', 'Cantidad'];
  let csvContent = headers.join(',') + '\n';
  const sortedCart = [...cart].sort((a, b) => a.selectedOffer.provider.localeCompare(b.selectedOffer.provider));

  sortedCart.forEach(item => {
    csvContent += `${item.selectedOffer.provider},${item.selectedOffer.providerCode},"${item.product.name.replace(/"/g, '""')}","${item.product.activeIngredient.replace(/"/g, '""')}",${item.quantity}\n`;
  });

  const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  const fileName = providerName ? `Axia_Pedido_${providerName.replace(/\\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv` : `Axia_Pedido_${new Date().toISOString().split('T')[0]}.csv`;
  link.download = fileName;
  link.click();
}

export function generateWhatsAppMessage(cart: CartItem[]): string {
  const grouped = cart.reduce((acc, item) => {
    const prov = item.selectedOffer.provider;
    if (!acc[prov]) acc[prov] = [];
    acc[prov].push(item);
    return acc;
  }, {} as Record<string, CartItem[]>);

  let message = `*PEDIDO AXIA 24/7*\n\n`;
  Object.entries(grouped).forEach(([provider, items]) => {
    message += `🛒 *Proveedor:* ${provider}\n`;
    items.forEach(item => {
      message += `- ${item.quantity}x ${item.product.name} (Cód: ${item.selectedOffer.providerCode})\n`;
    });
    message += `\n`;
  });
  return encodeURIComponent(message);
}

export function downloadFile(data: any, filename: string, type: string = 'application/json') {
  const blob = new Blob([typeof data === 'string' ? data : JSON.stringify(data, null, 2)], { type });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
}
