import type { Product } from '@/types';

export function mapProductRow(row: any): Product {
  const price = Number(row?.price ?? 0);
  const originalPrice = Number(row?.original_price ?? row?.originalPrice ?? price);

  return {
    id: row?.id ?? row?._id ?? '',
    _uuid: row?.id ?? row?._id,
    name: row?.name ?? 'Unnamed product',
    brand: row?.brand ?? 'Unknown brand',
    model: row?.model ?? '',
    images: Array.isArray(row?.images) ? row.images.filter((url: unknown) => typeof url === 'string' && url.trim()) : [],
    category: row?.category as Product['category'],
    originalPrice: Number.isFinite(originalPrice) ? originalPrice : price,
    price: Number.isFinite(price) ? price : 0,
    condition: row?.condition as Product['condition'],
    warrantyMonths: Number(row?.warranty_months ?? row?.warrantyMonths ?? 0) || 0,
    image: row?.image_url ?? row?.image ?? '',
    rating: Number(row?.rating) || 0,
    reviews: Number(row?.reviews) || 0,
    stock: Number(row?.stock) || 0,
    description: row?.description ?? '',
    specs: Array.isArray(row?.specs) ? row.specs : [],
  };
}
