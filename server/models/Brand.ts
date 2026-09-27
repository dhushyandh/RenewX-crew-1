import mongoose, { Schema } from 'mongoose';

export interface Brand {
  id: string;
  name: string;
  logo_url?: string;
  image_url?: string;
  imageUrl?: string;
  category: string;
  description: string;
  created_at?: string;
}

export interface IBrand {
  id: string;
  name: string;
  logo_url?: string;
  image_url?: string;
  category: string;
  description: string;
  created_at: Date;
  updated_at: Date;
}

export interface CreateBrandDTO {
  id?: string;
  name: string;
  logo_url?: string;
  image_url?: string;
  imageUrl?: string;
  category?: string;
  description?: string;
}

export interface UpdateBrandDTO {
  name?: string;
  logo_url?: string;
  image_url?: string;
  imageUrl?: string;
  category?: string;
  description?: string;
}

export function validateBrandInput(data: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!data || typeof data !== 'object') {
    return { valid: false, errors: ['Invalid request payload'] };
  }
  if (!data.name || typeof data.name !== 'string' || data.name.trim().length === 0) {
    errors.push('Brand name is required');
  }
  if (data.category && typeof data.category !== 'string') {
    errors.push('Category must be a string');
  }
  return { valid: errors.length === 0, errors };
}

const BrandSchema = new Schema<IBrand>(
  {
    name: { type: String, required: true, unique: true, trim: true },
    logo_url: { type: String, default: '' },
    image_url: { type: String, default: '' },
    category: { type: String, default: 'SMARTPHONES' },
    description: { type: String, default: '' },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    toJSON: {
      virtuals: true,
      transform: (_doc, ret: any) => {
        ret.id = ret._id.toString();
        // Keep image_url and logo_url in sync
        const img = ret.image_url || ret.logo_url || '';
        ret.image_url = img;
        ret.imageUrl = img;
        ret.logo_url = img;
        ret.logo = img;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

BrandSchema.index({ category: 1, name: 1 });

export const BrandModel = (mongoose.models.Brand as mongoose.Model<IBrand>) || mongoose.model<IBrand>('Brand', BrandSchema);
