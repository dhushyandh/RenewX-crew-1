import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { DeviceModelModel, CreateDeviceModelDTO, UpdateDeviceModelDTO } from '../models/DeviceModel';
import { BrandModel } from '../models/Brand';
import { invalidateCachePrefix } from '../utils/cache';

export async function getModels(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { brand_id, category, featured, search } = req.query;

    const filter: Record<string, any> = {};

    if (brand_id && typeof brand_id === 'string' && brand_id !== 'all') {
      filter.brand_id = brand_id;
    }

    if (category && typeof category === 'string' && category !== 'all') {
      filter.category = new RegExp(`^${category}$`, 'i');
    }

    if (featured === 'true') {
      filter.is_featured = true;
    }

    if (search && typeof search === 'string' && search.trim()) {
      filter.name = new RegExp(search.trim(), 'i');
    }

    const models = await DeviceModelModel.find(filter).sort({ release_year: -1, name: 1 }).lean();

    res.json({ success: true, count: models.length, data: models });
  } catch (err) {
    next(err);
  }
}

export async function getModelById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;

    let model = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
      model = await DeviceModelModel.findById(id).lean();
    }
    if (!model) {
      model = await DeviceModelModel.findOne({
        $or: [{ _id: id }, { name: new RegExp(`^${id}$`, 'i') }],
      }).lean().catch(() => null);
    }

    if (!model) {
      res.status(404).json({ success: false, error: { message: 'Device model not found', code: 'NOT_FOUND' } });
      return;
    }

    res.json({ success: true, data: model });
  } catch (err) {
    next(err);
  }
}

export async function createModel(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const payload: CreateDeviceModelDTO = req.body;

    let brandId = payload.brand_id || (payload as any).brandId || '';
    let brandName = payload.brand_name || (payload as any).brandName || '';

    if (!brandName && brandId) {
      const brand =
        (await BrandModel.findById(brandId).catch(() => null)) ||
        (await BrandModel.findOne({ name: new RegExp(`^${brandId}$`, 'i') }).catch(() => null));
      brandName = brand ? brand.name : brandId;
    } else if (brandName && !brandId) {
      const brand = await BrandModel.findOne({ name: new RegExp(`^${brandName}$`, 'i') }).catch(() => null);
      brandId = brand ? brand.id : brandName.toLowerCase().replace(/[^a-z0-9]/g, '-');
    }

    if (!brandId) brandId = 'other';
    if (!brandName) brandName = 'Other';

    const modelName = payload.name.trim();

    // Check if model already exists (prevent duplicate insertions)
    const existing = await DeviceModelModel.findOne({
      $or: [
        { brand_id: brandId, name: new RegExp(`^${modelName}$`, 'i') },
        { brand_name: new RegExp(`^${brandName}$`, 'i'), name: new RegExp(`^${modelName}$`, 'i') },
      ],
    });

    if (existing) {
      const incomingImg = payload.image_url?.trim() || (payload as any).imageUrl?.trim();
      if (incomingImg && !existing.image_url) {
        existing.image_url = incomingImg;
        await existing.save();
        invalidateCachePrefix('models');
        invalidateCachePrefix('brand_models');
      }
      res.status(200).json({ success: true, data: existing, message: 'Model already exists in catalog' });
      return;
    }

    const imgUrl = payload.image_url?.trim() || (payload as any).imageUrl?.trim() || '';

    const newModel = await DeviceModelModel.create({
      brand_id: brandId,
      brand_name: brandName,
      name: modelName,
      category: payload.category?.trim().toLowerCase() || 'smartphones',
      release_year: payload.release_year ? Number(payload.release_year) : new Date().getFullYear(),
      base_price: Number(payload.base_price) || 25000,
      storage_options:
        Array.isArray(payload.storage_options) && payload.storage_options.length > 0
          ? payload.storage_options
          : ['64GB', '128GB', '256GB', '512GB'],
      is_featured: Boolean(payload.is_featured),
      image_url: imgUrl,
    });

    invalidateCachePrefix('models');
    invalidateCachePrefix('brand_models');

    res.status(201).json({ success: true, data: newModel });
  } catch (err) {
    next(err);
  }
}

export async function updateModel(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const updates: UpdateDeviceModelDTO = req.body;

    const imgUrl = updates.image_url?.trim() || (updates as any).imageUrl?.trim();
    if (imgUrl !== undefined) {
      updates.image_url = imgUrl;
    }

    let updated = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
      updated = await DeviceModelModel.findByIdAndUpdate(id, updates, { new: true, runValidators: true });
    }

    if (!updated) {
      res.status(404).json({ success: false, error: { message: 'Device model not found' } });
      return;
    }

    invalidateCachePrefix('models');
    invalidateCachePrefix('brand_models');

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
}

export async function deleteModel(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;

    let deleted = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
      deleted = await DeviceModelModel.findByIdAndDelete(id);
    }
    if (!deleted) {
      deleted = await DeviceModelModel.findOneAndDelete({
        $or: [{ name: new RegExp(`^${id}$`, 'i') }, { name: id }],
      });
    }

    invalidateCachePrefix('models');
    invalidateCachePrefix('brand_models');

    res.json({ success: true, message: 'Device model deleted successfully', data: deleted ? { id: deleted.id } : null });
  } catch (err) {
    next(err);
  }
}
