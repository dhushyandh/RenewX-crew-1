import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { BrandModel, CreateBrandDTO, UpdateBrandDTO } from '../models/Brand';

export async function getBrands(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { category, search } = req.query;

    const filter: Record<string, any> = {};

    if (category && category !== 'All' && typeof category === 'string') {
      filter.category = new RegExp(`^${category}$`, 'i');
    }

    if (search && typeof search === 'string' && search.trim()) {
      filter.name = new RegExp(search.trim(), 'i');
    }

    const brands = await BrandModel.find(filter).sort({ name: 1 });

    res.json({ success: true, count: brands.length, data: brands });
  } catch (err) {
    next(err);
  }
}

export async function getBrandById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;

    let brand = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
      brand = await BrandModel.findById(id);
    }
    if (!brand) {
      brand = await BrandModel.findOne({
        $or: [{ _id: id }, { name: new RegExp(`^${id}$`, 'i') }],
      }).catch(() => null);
    }

    if (!brand) {
      res.status(404).json({ success: false, error: { message: 'Brand not found', code: 'NOT_FOUND' } });
      return;
    }

    res.json({ success: true, data: brand });
  } catch (err) {
    next(err);
  }
}

export async function createBrand(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const payload: CreateBrandDTO = req.body;

    const brandName = payload.name.trim();
    const existing = await BrandModel.findOne({ name: new RegExp(`^${brandName}$`, 'i') });
    if (existing) {
      res.status(409).json({ success: false, error: { message: 'Brand already exists' } });
      return;
    }

    const newBrand = await BrandModel.create({
      name: brandName,
      logo_url: payload.logo_url?.trim() || '',
      category: payload.category?.trim().toUpperCase() || 'SMARTPHONES',
      description: payload.description?.trim() || '',
    });

    res.status(201).json({ success: true, data: newBrand });
  } catch (err) {
    next(err);
  }
}

export async function updateBrand(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const updates: UpdateBrandDTO = req.body;

    let updated = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
      updated = await BrandModel.findByIdAndUpdate(id, updates, { new: true, runValidators: true });
    } else {
      updated = await BrandModel.findOneAndUpdate({ name: id }, updates, { new: true });
    }

    if (!updated) {
      res.status(404).json({ success: false, error: { message: 'Brand not found' } });
      return;
    }

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
}

export async function deleteBrand(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;

    if (mongoose.Types.ObjectId.isValid(id)) {
      await BrandModel.findByIdAndDelete(id);
    } else {
      await BrandModel.findOneAndDelete({ name: id });
    }

    res.json({ success: true, message: 'Brand deleted successfully' });
  } catch (err) {
    next(err);
  }
}
