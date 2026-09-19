import mongoose, { Schema } from 'mongoose';

export interface DeviceModel {
  id: string;
  brand_id: string;
  brand_name: string;
  name: string;
  category: string;
  release_year: number;
  base_price: number;
  storage_options: string[];
  is_featured: boolean;
  created_at?: string;
}

export interface IDeviceModel {
  id: string;
  brand_id: string;
  brand_name: string;
  name: string;
  category: string;
  release_year: number;
  base_price: number;
  storage_options: string[];
  is_featured: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface CreateDeviceModelDTO {
  id?: string;
  brand_id: string;
  brand_name?: string;
  name: string;
  category: string;
  release_year?: number;
  base_price: number;
  storage_options?: string[];
  is_featured?: boolean;
}

export interface UpdateDeviceModelDTO {
  name?: string;
  category?: string;
  release_year?: number;
  base_price?: number;
  storage_options?: string[];
  is_featured?: boolean;
}

export function validateDeviceModelInput(data: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!data || typeof data !== 'object') {
    return { valid: false, errors: ['Invalid request payload'] };
  }
  if (!data.name || typeof data.name !== 'string' || data.name.trim().length === 0) {
    errors.push('Device model name is required');
  }
  if (!data.brand_id && !data.brandId) {
    errors.push('brand_id is required');
  }
  if (data.base_price !== undefined && (typeof Number(data.base_price) !== 'number' || Number(data.base_price) < 0)) {
    errors.push('base_price must be a positive number');
  }
  return { valid: errors.length === 0, errors };
}

const DeviceModelSchema = new Schema<IDeviceModel>(
  {
    brand_id: { type: String, required: true, index: true },
    brand_name: { type: String, required: true, index: true },
    name: { type: String, required: true, trim: true },
    category: { type: String, default: 'smartphones', index: true },
    release_year: { type: Number, default: 2024 },
    base_price: { type: Number, required: true, default: 50000 },
    storage_options: { type: [String], default: ['128GB', '256GB', '512GB'] },
    is_featured: { type: Boolean, default: false },
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

export const DeviceModelModel =
  (mongoose.models.DeviceModel as mongoose.Model<IDeviceModel>) || mongoose.model<IDeviceModel>('DeviceModel', DeviceModelSchema);
