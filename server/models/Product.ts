import mongoose, { Schema, Document } from 'mongoose';

export interface Product {
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
}

export interface IProduct extends Document {
  id: string;
  name: string;
  brand: string;
  category: string;
  original_price: number;
  price: number;
  condition: string;
  warranty_months: number;
  image_url: string;
  rating: number;
  reviews: number;
  stock: number;
  description: string;
  specs: string[];
  created_at: Date;
  updated_at: Date;
}

export interface CreateProductDTO {
  name: string;
  brand: string;
  category: string;
  original_price: number;
  price: number;
  condition: string;
  warranty_months?: number;
  image_url: string;
  rating?: number;
  reviews?: number;
  stock: number;
  description: string;
  specs?: string[];
}

export function validateProductInput(data: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!data || typeof data !== 'object') {
    return { valid: false, errors: ['Invalid product payload'] };
  }
  if (!data.name || typeof data.name !== 'string' || !data.name.trim()) {
    errors.push('Product name is required');
  }
  if (!data.brand || typeof data.brand !== 'string') {
    errors.push('Brand is required');
  }
  if (!data.category || typeof data.category !== 'string') {
    errors.push('Category is required');
  }
  if (typeof Number(data.price) !== 'number' || Number(data.price) <= 0) {
    errors.push('Price must be greater than zero');
  }
  if (typeof Number(data.original_price) !== 'number' || Number(data.original_price) <= 0) {
    errors.push('Original price must be greater than zero');
  }
  if (typeof Number(data.stock) !== 'number' || Number(data.stock) < 0) {
    errors.push('Stock count must be zero or higher');
  }
  return { valid: errors.length === 0, errors };
}

const ProductSchema = new Schema<IProduct>(
  {
    name: { type: String, required: true, trim: true, index: true },
    brand: { type: String, required: true, trim: true, index: true },
    category: { type: String, required: true, trim: true, index: true },
    original_price: { type: Number, required: true },
    price: { type: Number, required: true, index: true },
    condition: { type: String, required: true, default: 'Like New' },
    warranty_months: { type: Number, default: 12 },
    image_url: { type: String, required: true },
    rating: { type: Number, default: 4.8 },
    reviews: { type: Number, default: 0 },
    stock: { type: Number, default: 1 },
    description: { type: String, default: '' },
    specs: { type: [String], default: [] },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    toJSON: {
      virtuals: true,
      transform: (_doc, ret: any) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

export const ProductModel = mongoose.models.Product || mongoose.model<IProduct>('Product', ProductSchema);
