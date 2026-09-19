export interface BrandItem {
  id: string;
  name: string;
  logo: string;
  category: string;
  description: string;
}

export interface DeviceModelItem {
  id: string;
  brandId: string;
  brandName: string;
  name: string;
  category: string;
  releaseYear: number;
  basePrice: number;
  storageOptions: string[];
  isFeatured: boolean;
}

export const initialBrands: BrandItem[] = [
  {
    id: 'apple',
    name: 'Apple',
    logo: 'https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?w=128&auto=format&fit=crop&q=80',
    category: 'SMARTPHONES',
    description: 'Official certified Apple hardware.',
  },
  {
    id: 'samsung',
    name: 'Samsung',
    logo: 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=128&auto=format&fit=crop&q=80',
    category: 'SMARTPHONES',
    description: 'Galaxy flagship and premium foldable devices.',
  },
  {
    id: 'google',
    name: 'Google',
    logo: 'https://images.unsplash.com/photo-1573804633927-bfcbcd909acd?w=128&auto=format&fit=crop&q=80',
    category: 'SMARTPHONES',
    description: 'Pixel computational photography & pure Android experience.',
  },
  {
    id: 'dell',
    name: 'Dell',
    logo: 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=128&auto=format&fit=crop&q=80',
    category: 'LAPTOPS',
    description: 'High performance XPS and enterprise Latitude laptops.',
  },
  {
    id: 'lenovo',
    name: 'Lenovo',
    logo: 'https://images.unsplash.com/photo-1593642702821-c8da6771f0c6?w=128&auto=format&fit=crop&q=80',
    category: 'LAPTOPS',
    description: 'Legendary ThinkPad and innovative Yoga 2-in-1 laptops.',
  },
  {
    id: 'hp',
    name: 'HP',
    logo: 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=128&auto=format&fit=crop&q=80',
    category: 'LAPTOPS',
    description: 'Premium Spectre x360 and durable Envy ultrabooks.',
  },
  {
    id: 'oneplus',
    name: 'OnePlus',
    logo: 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=128&auto=format&fit=crop&q=80',
    category: 'SMARTPHONES',
    description: 'Never Settle performance, fast charging & Hasselblad cameras.',
  },
  {
    id: 'sony',
    name: 'Sony',
    logo: 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=128&auto=format&fit=crop&q=80',
    category: 'AUDIO',
    description: 'Industry-leading noise cancelling audio and Alpha imaging.',
  },
];

export const initialModels: DeviceModelItem[] = [
  // Apple Models (matching screenshot 2)
  {
    id: 'iphone-16-pro-max',
    brandId: 'apple',
    brandName: 'Apple',
    name: 'iPhone 16 Pro Max',
    category: 'smartphones',
    releaseYear: 2024,
    basePrice: 95000,
    storageOptions: ['256GB', '512GB', '1TB'],
    isFeatured: true,
  },
  {
    id: 'iphone-16-pro',
    brandId: 'apple',
    brandName: 'Apple',
    name: 'iPhone 16 Pro',
    category: 'smartphones',
    releaseYear: 2024,
    basePrice: 82000,
    storageOptions: ['128GB', '256GB', '512GB', '1TB'],
    isFeatured: true,
  },
  {
    id: 'iphone-16-plus',
    brandId: 'apple',
    brandName: 'Apple',
    name: 'iPhone 16 Plus',
    category: 'smartphones',
    releaseYear: 2024,
    basePrice: 62000,
    storageOptions: ['128GB', '256GB', '512GB'],
    isFeatured: true,
  },
  {
    id: 'iphone-16',
    brandId: 'apple',
    brandName: 'Apple',
    name: 'iPhone 16',
    category: 'smartphones',
    releaseYear: 2024,
    basePrice: 58000,
    storageOptions: ['128GB', '256GB', '512GB'],
    isFeatured: true,
  },
  {
    id: 'iphone-15-pro-max',
    brandId: 'apple',
    brandName: 'Apple',
    name: 'iPhone 15 Pro Max',
    category: 'smartphones',
    releaseYear: 2023,
    basePrice: 76000,
    storageOptions: ['256GB', '512GB', '1TB'],
    isFeatured: true,
  },
  {
    id: 'macbook-pro-16-m3',
    brandId: 'apple',
    brandName: 'Apple',
    name: 'MacBook Pro 16 M3 Max',
    category: 'laptops',
    releaseYear: 2023,
    basePrice: 145000,
    storageOptions: ['512GB', '1TB', '2TB'],
    isFeatured: true,
  },
  {
    id: 'macbook-air-15-m2',
    brandId: 'apple',
    brandName: 'Apple',
    name: 'MacBook Air 15 M2',
    category: 'laptops',
    releaseYear: 2023,
    basePrice: 78000,
    storageOptions: ['256GB', '512GB'],
    isFeatured: false,
  },
  {
    id: 'ipad-pro-13-m4',
    brandId: 'apple',
    brandName: 'Apple',
    name: 'iPad Pro 13 M4',
    category: 'tablets',
    releaseYear: 2024,
    basePrice: 88000,
    storageOptions: ['256GB', '512GB', '1TB'],
    isFeatured: true,
  },

  // Samsung Models
  {
    id: 'galaxy-s24-ultra',
    brandId: 'samsung',
    brandName: 'Samsung',
    name: 'Galaxy S24 Ultra',
    category: 'smartphones',
    releaseYear: 2024,
    basePrice: 72000,
    storageOptions: ['256GB', '512GB', '1TB'],
    isFeatured: true,
  },
  {
    id: 'galaxy-z-fold-6',
    brandId: 'samsung',
    brandName: 'Samsung',
    name: 'Galaxy Z Fold 6',
    category: 'smartphones',
    releaseYear: 2024,
    basePrice: 98000,
    storageOptions: ['256GB', '512GB', '1TB'],
    isFeatured: true,
  },
  {
    id: 'galaxy-s24-plus',
    brandId: 'samsung',
    brandName: 'Samsung',
    name: 'Galaxy S24+',
    category: 'smartphones',
    releaseYear: 2024,
    basePrice: 56000,
    storageOptions: ['256GB', '512GB'],
    isFeatured: false,
  },

  // Google Models
  {
    id: 'pixel-9-pro-xl',
    brandId: 'google',
    brandName: 'Google',
    name: 'Pixel 9 Pro XL',
    category: 'smartphones',
    releaseYear: 2024,
    basePrice: 68000,
    storageOptions: ['128GB', '256GB', '512GB'],
    isFeatured: true,
  },
  {
    id: 'pixel-8-pro',
    brandId: 'google',
    brandName: 'Google',
    name: 'Pixel 8 Pro',
    category: 'smartphones',
    releaseYear: 2023,
    basePrice: 48000,
    storageOptions: ['128GB', '256GB'],
    isFeatured: false,
  },

  // Dell Models
  {
    id: 'dell-xps-16',
    brandId: 'dell',
    brandName: 'Dell',
    name: 'Dell XPS 16 (9640)',
    category: 'laptops',
    releaseYear: 2024,
    basePrice: 110000,
    storageOptions: ['512GB', '1TB', '2TB'],
    isFeatured: true,
  },
  {
    id: 'dell-xps-14',
    brandId: 'dell',
    brandName: 'Dell',
    name: 'Dell XPS 14 (9440)',
    category: 'laptops',
    releaseYear: 2024,
    basePrice: 94000,
    storageOptions: ['512GB', '1TB'],
    isFeatured: false,
  },

  // Lenovo Models
  {
    id: 'thinkpad-x1-carbon-gen-12',
    brandId: 'lenovo',
    brandName: 'Lenovo',
    name: 'ThinkPad X1 Carbon Gen 12',
    category: 'laptops',
    releaseYear: 2024,
    basePrice: 105000,
    storageOptions: ['512GB', '1TB'],
    isFeatured: true,
  },

  // Sony Models
  {
    id: 'sony-wh-1000xm5',
    brandId: 'sony',
    brandName: 'Sony',
    name: 'WH-1000XM5 Wireless Headphones',
    category: 'audio',
    releaseYear: 2023,
    basePrice: 18500,
    storageOptions: ['Standard'],
    isFeatured: true,
  },
];

const BRANDS_KEY = 'renewx_admin_brands_v1';
const MODELS_KEY = 'renewx_admin_models_v1';

export function getStoredBrands(): BrandItem[] {
  try {
    const raw = localStorage.getItem(BRANDS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn('LocalStorage not available:', e);
  }
  return initialBrands;
}

export function saveStoredBrands(brands: BrandItem[]) {
  try {
    localStorage.setItem(BRANDS_KEY, JSON.stringify(brands));
  } catch (e) {
    console.warn('Failed to save brands:', e);
  }
}

export function getStoredModels(): DeviceModelItem[] {
  try {
    const raw = localStorage.getItem(MODELS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn('LocalStorage not available:', e);
  }
  return initialModels;
}

export function saveStoredModels(models: DeviceModelItem[]) {
  try {
    localStorage.setItem(MODELS_KEY, JSON.stringify(models));
  } catch (e) {
    console.warn('Failed to save models:', e);
  }
}
