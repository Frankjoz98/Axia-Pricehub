import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { UnifiedProduct, SupplierOffer, CartItem } from '../types';

interface CartContextType {
  cart: CartItem[];
  addToCart: (product: UnifiedProduct, offer: SupplierOffer, quantity?: number) => void;
  updateQuantity: (index: number, delta: number) => void;
  clearProviderCart: (provider: string) => void;
  handleReopenOrder: (order: any, productos: UnifiedProduct[]) => boolean;
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

  const handleReopenOrder = (order: any, productos: UnifiedProduct[]): boolean => {
    const newCartItems: CartItem[] = [];
    let allFound = true;
    
    for (const item of order.items) {
      const fullProduct = productos.find(p => p.id === item.productId);
      if (fullProduct) {
        const offer = fullProduct.offers.find(o => o.provider === order.provider && o.providerCode === item.providerCode);
        if (offer) {
          newCartItems.push({
            product: fullProduct,
            selectedOffer: offer,
            quantity: item.orderedQuantity
          });
        } else {
          allFound = false;
        }
      } else {
        allFound = false;
      }
    }
    
    if (newCartItems.length > 0) {
      setCart(prev => [...prev, ...newCartItems]);
    }
    
    setIsCartOpen(true);
    return allFound;
  };

  const clearProviderCart = (provider: string) => {
    setCart(prev => prev.filter(item => item.selectedOffer.provider !== provider));
  };

  return (
    <CartContext.Provider value={{ cart, addToCart, updateQuantity, clearProviderCart, handleReopenOrder, isCartOpen, setIsCartOpen }}>
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
