import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Product } from '@/types';

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
