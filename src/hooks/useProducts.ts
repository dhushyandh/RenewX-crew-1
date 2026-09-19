import { useState, useCallback } from 'react';
import { supabase, type ProductRow } from '@/lib/supabase';
import type { Product } from '@/types';

function mapRowToProduct(row: ProductRow): Product {
  return {
    id: 0,
    _uuid: row.id,
    name: row.name,
    brand: row.brand,
    category: row.category as Product['category'],
    originalPrice: row.original_price,
    price: row.price,
    condition: row.condition as Product['condition'],
    warrantyMonths: row.warranty_months,
    image: row.image_url,
    rating: row.rating,
    reviews: row.reviews,
    stock: row.stock,
    description: row.description,
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
    const { data, error: err } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: true });

    if (err) {
      setError('Could not load products. Please try again.');
      setProducts([]);
    } else if (data) {
      setProducts((data as ProductRow[]).map(mapRowToProduct));
    }
    setLoading(false);
  }, []);

  return { products, loading, error, fetchProducts };
}

export function useProductMutations() {
  const createProduct = useCallback(async (product: Omit<ProductRow, 'id' | 'created_at' | 'rating' | 'reviews'>) => {
    const { data, error } = await supabase
      .from('products')
      .insert(product)
      .select()
      .maybeSingle();

    if (error) throw error;
    return data;
  }, []);

  const updateProduct = useCallback(async (id: string, updates: Partial<ProductRow>) => {
    const { error } = await supabase
      .from('products')
      .update(updates)
      .eq('id', id);

    if (error) throw error;
  }, []);

  const deleteProduct = useCallback(async (id: string) => {
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }, []);

  return { createProduct, updateProduct, deleteProduct };
}
