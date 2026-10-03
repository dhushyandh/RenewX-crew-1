import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Product } from '@/types';
import { api } from '@/services/api';

export const INITIAL_WISHLIST_ITEMS: Product[] = [];

const WISHLIST_STORAGE_KEY = '@renewx_persistent_wishlist_v1';

interface WishlistContextType {
  wishlist: Product[];
  totalWishlistItems: number;
  isInWishlist: (productId: string | number) => boolean;
  addToWishlist: (product: Product) => void;
  removeFromWishlist: (productId: string | number) => void;
  toggleWishlist: (product: Product) => boolean; // returns new isWishlisted state
  clearWishlist: () => void;
  refreshWishlist: () => Promise<void>;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

export function WishlistProvider({ children }: { children: ReactNode }) {
  const [wishlist, setWishlist] = useState<Product[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // Load from AsyncStorage
  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(WISHLIST_STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            // Filter out any mock/seed products that start with 'wish_'
            const realOnly = parsed.filter(
              (p: any) => p && p.id && !String(p.id).startsWith('wish_')
            );
            setWishlist(realOnly);
          }
        }
      } catch {
        // ignore
      } finally {
        setHydrated(true);
      }
    })();
  }, []);

  // Save changes to AsyncStorage
  const persistWishlist = useCallback((newList: Product[]) => {
    setWishlist(newList);
    AsyncStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(newList)).catch(() => {});
  }, []);

  const isInWishlist = useCallback(
    (productId: string | number) => {
      const pid = String(productId);
      return wishlist.some((p) => String(p.id) === pid || String((p as any)._uuid) === pid);
    },
    [wishlist]
  );

  const addToWishlist = useCallback(
    (product: Product) => {
      if (isInWishlist(product.id)) return;
      const updated = [product, ...wishlist];
      persistWishlist(updated);
    },
    [wishlist, isInWishlist, persistWishlist]
  );

  const removeFromWishlist = useCallback(
    (productId: string | number) => {
      const pid = String(productId);
      const updated = wishlist.filter(
        (p) => String(p.id) !== pid && String((p as any)._uuid) !== pid
      );
      persistWishlist(updated);
    },
    [wishlist, persistWishlist]
  );

  const toggleWishlist = useCallback(
    (product: Product): boolean => {
      const exists = isInWishlist(product.id);
      if (exists) {
        removeFromWishlist(product.id);
        return false;
      } else {
        addToWishlist(product);
        return true;
      }
    },
    [isInWishlist, removeFromWishlist, addToWishlist]
  );

  const clearWishlist = useCallback(() => {
    persistWishlist([]);
  }, [persistWishlist]);

  const refreshWishlist = useCallback(async () => {
    try {
      const saved = await AsyncStorage.getItem(WISHLIST_STORAGE_KEY);
      let currentItems: Product[] = wishlist;
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          currentItems = parsed.filter(
            (p: any) => p && p.id && !String(p.id).startsWith('wish_')
          );
        }
      }
      if (!currentItems.length) {
        setWishlist([]);
        return;
      }
      // Re-fetch latest price and stock for wishlist items from live api
      const updated = await Promise.all(
        currentItems.map(async (item) => {
          try {
            const pid = String(item.id || (item as any)._id || '');
            if (!pid) return item;
            const res: any = await api.products.getById(pid);
            const live = res?.data || res;
            if (live && (live.id || live._id)) {
              return {
                ...item,
                price: Number(live.price ?? item.price),
                originalPrice: Number(live.original_price ?? live.originalPrice ?? item.originalPrice),
                stock: live.stock !== undefined ? Number(live.stock) : item.stock,
                name: live.name || item.name,
              };
            }
          } catch {
            // Keep existing if network/error
          }
          return item;
        })
      );
      setWishlist(updated);
      await AsyncStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // ignore
    }
  }, [wishlist]);

  return (
    <WishlistContext.Provider
      value={{
        wishlist,
        totalWishlistItems: wishlist.length,
        isInWishlist,
        addToWishlist,
        removeFromWishlist,
        toggleWishlist,
        clearWishlist,
        refreshWishlist,
      }}
    >
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error('useWishlist must be used within a WishlistProvider');
  }
  return context;
}
