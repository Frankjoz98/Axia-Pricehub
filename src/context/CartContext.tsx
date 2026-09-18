import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { UnifiedProduct, SupplierOffer, CartItem, PurchaseOrder } from '../types';

interface CartContextType {
  cart: CartItem[];
  addToCart: (product: UnifiedProduct, offer: SupplierOffer, quantity?: number) => void;
  updateQuantity: (index: number, delta: number) => void;
  clearProviderCart: (provider: string) => void;
  clearCart: () => void;
  /** Devuelve cuántos ítems de la orden no pudieron reconstruirse (0 = todo encontrado). */
  handleReopenOrder: (order: PurchaseOrder, productos: UnifiedProduct[]) => number;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem('axia_pricehub_cart');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return [];
      }
    }
    return [];
  });

  const [isCartOpen, setIsCartOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem('axia_pricehub_cart', JSON.stringify(cart));
  }, [cart]);

  const addToCart = (product: UnifiedProduct, offer: SupplierOffer, quantity: number = 1) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id && item.selectedOffer.provider === offer.provider);
      if (existing) {
        return prev.map(item => item === existing ? { ...item, quantity: item.quantity + quantity } : item);
      }
      return [...prev, { product, selectedOffer: offer, quantity }];
    });
  };

  const updateQuantity = (index: number, delta: number) => {
    setCart(prev => {
      const next = [...prev];
      const newQty = next[index].quantity + delta;
      if (newQty <= 0) {
        next.splice(index, 1);
      } else {
        next[index] = { ...next[index], quantity: newQty };
      }
      return next;
    });
  };

  const handleReopenOrder = (order: PurchaseOrder, productos: UnifiedProduct[]): number => {
    let missing = 0;

    for (const item of order.items) {
      const fullProduct = productos.find(p => p.id === item.productId);
      const offer = fullProduct?.offers.find(o => o.provider === order.provider && o.providerCode === item.providerCode);
      if (fullProduct && offer) {
        // Se fusiona con lo que ya haya en el carrito (misma regla que addToCart)
        addToCart(fullProduct, offer, item.orderedQuantity);
      } else {
        missing++;
      }
    }

    setIsCartOpen(true);
    return missing;
  };

  const clearProviderCart = (provider: string) => {
    setCart(prev => prev.filter(item => item.selectedOffer.provider !== provider));
  };

  const clearCart = () => setCart([]);

  return (
    <CartContext.Provider value={{ cart, addToCart, updateQuantity, clearProviderCart, clearCart, handleReopenOrder, isCartOpen, setIsCartOpen }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
