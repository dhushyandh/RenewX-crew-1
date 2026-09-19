import { useState, useCallback } from 'react';
import { api } from '@/services/api';
import type { Product } from '@/types';

export type ProductRow = {
  id: string;
  name: string;
  brand: string;
  category: string;
  original_price: number;
  price: number;
  condition: string;
  warranty_months: number;
  image_url: string;
  rating?: number;
  reviews?: number;
  stock: number;
  description: string;
  specs: string[];
  created_at?: string;
};

function mapRowToProduct(row: any): Product {
  return {
    id: 0,
    _uuid: row.id || row._id,
    name: row.name,
    brand: row.brand,
    category: row.category as Product['category'],
    originalPrice: row.original_price || row.originalPrice,
    price: row.price,
    condition: row.condition as Product['condition'],
    warrantyMonths: row.warranty_months || row.warrantyMonths || 12,
    image: row.image_url || row.image,
    rating: row.rating || 4.8,
    reviews: row.reviews || 0,
    stock: row.stock !== undefined ? row.stock : 1,
    description: row.description || '',
    specs: Array.isArray(row.specs) ? row.specs : [],
  };
}

export function useProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.products.getAll();
      if (Array.isArray(data)) {
        setProducts(data.map(mapRowToProduct));
      }
    } catch {
      setError('Could not load products. Please try again.');
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  return { products, loading, error, fetchProducts };
}

export function useProductMutations() {
  const createProduct = useCallback(async (product: any) => {
    return await api.products.create(product);
  }, []);

  const updateProduct = useCallback(async (id: string, updates: any) => {
    return await api.products.update(id, updates);
  }, []);

  const deleteProduct = useCallback(async (id: string) => {
    return await api.products.delete(id);
  }, []);

  return { createProduct, updateProduct, deleteProduct };
}
