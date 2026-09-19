export type Category = 'Laptops' | 'Phones' | 'Audio' | 'Wearables' | 'Cameras' | 'Tablets';

export interface Product {
  id: string | number;
  _uuid?: string;
  name: string;
  brand: string;
  category: Category;
  originalPrice: number;
  price: number;
  condition: 'Fair' | 'Good' | 'Excellent' | 'Like New';
  warrantyMonths: number;
  image: string;
  rating: number;
  reviews: number;
  stock: number;
  description: string;
  specs: string[];
}

export interface CartItem extends Product {
  quantity: number;
}
