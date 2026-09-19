export type Category = 'Laptops' | 'Phones' | 'Audio' | 'Wearables' | 'Cameras' | 'Tablets';

export interface Product {
  id: number;
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
