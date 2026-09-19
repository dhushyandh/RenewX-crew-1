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
  updated_at?: string;
}

export interface IProduct extends Document {
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
  condition?: string;
  warranty_months?: number;
  image_url?: string;
  rating?: number;
  reviews?: number;
  stock?: number;
  description?: string;
  specs?: string[];
}

export interface UpdateProductDTO extends Partial<CreateProductDTO> {}

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const toNumber = (value: unknown): number | null => {
  if (value === '' || value === null || value === undefined) return null;
  const number = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(number) ? number : null;
};

const validateCommon = (data: any, partial = false): string[] => {
  const errors: string[] = [];
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return ['Invalid product payload'];
  }

  if (!partial || data.name !== undefined) {
    if (typeof data.name !== 'string' || !data.name.trim()) errors.push('Product name is required');
    else if (data.name.trim().length > 160) errors.push('Product name must be 160 characters or fewer');
  }
  if (!partial || data.brand !== undefined) {
    if (typeof data.brand !== 'string' || !data.brand.trim()) errors.push('Brand is required');
  }
  if (!partial || data.category !== undefined) {
    if (typeof data.category !== 'string' || !data.category.trim()) errors.push('Category is required');
  }

  for (const field of ['price', 'original_price'] as const) {
    if (!partial || data[field] !== undefined) {
      const value = toNumber(data[field]);
      if (value === null || value <= 0) errors.push(`${field} must be greater than zero`);
    }
  }

  if (data.stock !== undefined || !partial) {
    const value = toNumber(data.stock);
    if (value === null || value < 0 || !Number.isInteger(value)) errors.push('Stock must be a non-negative integer');
  }
  if (data.warranty_months !== undefined) {
    const value = toNumber(data.warranty_months);
    if (value === null || value < 0 || !Number.isInteger(value)) errors.push('Warranty months must be a non-negative integer');
  }
  if (data.rating !== undefined) {
    const value = toNumber(data.rating);
    if (value === null || value < 0 || value > 5) errors.push('Rating must be between 0 and 5');
  }
  if (data.reviews !== undefined) {
    const value = toNumber(data.reviews);
    if (value === null || value < 0 || !Number.isInteger(value)) errors.push('Reviews must be a non-negative integer');
  }
  if (data.image_url !== undefined && typeof data.image_url !== 'string') errors.push('Image URL must be a string');
  if (data.description !== undefined && typeof data.description !== 'string') errors.push('Description must be a string');
  if (data.condition !== undefined && (typeof data.condition !== 'string' || !data.condition.trim())) errors.push('Condition must be a non-empty string');
  if (data.specs !== undefined && (!Array.isArray(data.specs) || data.specs.some((item: unknown) => typeof item !== 'string'))) {
    errors.push('Specs must be an array of strings');
  }

  return errors;
};

export function validateProductInput(data: any): { valid: boolean; errors: string[] } {
  const errors = validateCommon(data, false);
  return { valid: errors.length === 0, errors };
}

export function validateProductUpdate(data: any): { valid: boolean; errors: string[] } {
  const errors = validateCommon(data, true);
  const allowed = new Set([
    'name', 'brand', 'category', 'original_price', 'price', 'condition',
    'warranty_months', 'image_url', 'rating', 'reviews', 'stock',
    'description', 'specs',
  ]);
  if (data && typeof data === 'object') {
    const unknown = Object.keys(data).filter((key) => !allowed.has(key));
    if (unknown.length) errors.push(`Unsupported fields: ${unknown.join(', ')}`);
  }
  return { valid: errors.length === 0, errors };
}

const ProductSchema = new Schema<IProduct>(
  {
    name: { type: String, required: true, trim: true, maxlength: 160, index: true },
    brand: { type: String, required: true, trim: true, index: true },
    category: { type: String, required: true, trim: true, index: true },
    original_price: { type: Number, required: true, min: 0.01 },
    price: { type: Number, required: true, min: 0.01, index: true },
    condition: { type: String, required: true, trim: true, default: 'Like New' },
    warranty_months: { type: Number, min: 0, default: 12 },
    image_url: { type: String, default: '' },
    rating: { type: Number, min: 0, max: 5, default: 0 },
    reviews: { type: Number, min: 0, default: 0 },
    stock: { type: Number, min: 0, default: 0 },
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
  },
);

ProductSchema.index({ name: 'text', brand: 'text', description: 'text' });
ProductSchema.index({ category: 1, brand: 1, price: 1 });

export const ProductModel =
  mongoose.models.Product || mongoose.model<IProduct>('Product', ProductSchema);
