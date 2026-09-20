import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Product, CartItem } from '@/types';

interface CartContextValue {
  items: CartItem[];
  addToCart: (product: Product) => void;
  removeFromCart: (id: string | number) => void;
  updateQuantity: (id: string | number, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  subtotal: number;
  savings: number;
  hydrated: boolean;
}

const CartContext = createContext<CartContextValue | undefined>(undefined);
const CART_STORAGE_KEY = '@renewx_cart';

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem(CART_STORAGE_KEY)
      .then((raw) => {
        if (!mounted || !raw) return;
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) setItems(parsed);
        } catch {
          // Ignore corrupt local cart data.
        }
      })
      .finally(() => {
        if (mounted) setHydrated(true);
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      const sanitized = items.map((item) => {
        let image = item.image;
        if (typeof image === 'string' && image.startsWith('data:') && image.length > 30000) {
          image = '';
        }
        const extra = item as any;
        let image_url = extra.image_url;
        if (typeof image_url === 'string' && image_url.startsWith('data:') && image_url.length > 30000) {
          image_url = '';
        }
        return {
          ...item,
          image,
          ...(extra.image_url !== undefined ? { image_url } : {}),
          ...(Array.isArray(extra.images)
            ? { images: extra.images.filter((img: any) => typeof img === 'string' && (!img.startsWith('data:') || img.length <= 30000)) }
            : {}),
        };
      });

      AsyncStorage.setItem(CART_STORAGE_KEY, JSON.stringify(sanitized)).catch(async (err) => {
        console.warn('[Cart] Failed to persist cart, storing minimal items:', err);
        try {
          const minimal = items.map((item) => ({
            id: item.id,
            name: item.name,
            price: item.price,
            brand: item.brand,
            quantity: item.quantity,
            stock: item.stock,
          }));
          await AsyncStorage.setItem(CART_STORAGE_KEY, JSON.stringify(minimal));
        } catch {
          // ignore
        }
      });
    } catch (err) {
      console.warn('[Cart] Error preparing cart persistence:', err);
    }
  }, [items, hydrated]);

  const addToCart = useCallback((product: Product) => {
    if (product.stock <= 0) return;
    setItems((prev) => {
      const pId = String(product.id || product._uuid || (product as any)._id || '');
      const existing = prev.find((i) => {
        const iId = String(i.id || i._uuid || (i as any)._id || '');
        return iId === pId;
      });
      if (existing) {
        if (existing.quantity >= product.stock) return prev;
        return prev.map((i) => {
          const iId = String(i.id || i._uuid || (i as any)._id || '');
          return iId === pId
            ? { ...i, quantity: Math.min(i.quantity + 1, product.stock) }
            : i;
        });
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  }, []);

  const removeFromCart = useCallback((id: string | number) => {
    const targetId = String(id);
    setItems((prev) =>
      prev.filter((i) => {
        const iId = String(i.id || i._uuid || (i as any)._id || '');
        return (
          iId !== targetId &&
          String(i.id) !== targetId &&
          String(i._uuid) !== targetId &&
          String((i as any)._id) !== targetId
        );
      })
    );
  }, []);

  const updateQuantity = useCallback((id: string | number, quantity: number) => {
    const targetId = String(id);
    if (quantity <= 0) {
      setItems((prev) =>
        prev.filter((i) => {
          const iId = String(i.id || i._uuid || (i as any)._id || '');
          return (
            iId !== targetId &&
            String(i.id) !== targetId &&
            String(i._uuid) !== targetId &&
            String((i as any)._id) !== targetId
          );
        })
      );
      return;
    }
    setItems((prev) =>
      prev
        .map((i) => {
          const iId = String(i.id || i._uuid || (i as any)._id || '');
          if (
            iId !== targetId &&
            String(i.id) !== targetId &&
            String(i._uuid) !== targetId &&
            String((i as any)._id) !== targetId
          ) {
            return i;
          }
          const maxStock = Number.isFinite(i.stock) ? Math.max(0, i.stock) : quantity;
          return { ...i, quantity: Math.min(quantity, maxStock) };
        })
        .filter((i) => i.quantity > 0)
    );
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const savings = items.reduce(
    (sum, i) => sum + Math.max(0, i.originalPrice - i.price) * i.quantity,
    0
  );

  return (
    <CartContext.Provider
      value={{
        items,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        totalItems,
        subtotal,
        savings,
        hydrated,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
