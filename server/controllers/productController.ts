import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { ProductModel, CreateProductDTO, UpdateProductDTO } from '../models/Product';
import { broadcastNewProductArrival } from '../services/notificationService';

const escapeRegex = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const parsePositiveInt = (value: unknown, fallback: number, max: number): number => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? Math.min(parsed, max) : fallback;
};

const productFields = [
  'name', 'brand', 'model', 'category', 'original_price', 'price', 'condition',
  'warranty_months', 'image_url', 'images', 'rating', 'reviews', 'stock',
  'description', 'specs',
] as const;

const normalizeProductPayload = (payload: any) => {
  const normalized: Record<string, unknown> = {};
  const data = { ...payload };

  if (data.originalPrice !== undefined && data.original_price === undefined) {
    data.original_price = data.originalPrice;
  }
  if (data.warrantyMonths !== undefined && data.warranty_months === undefined) {
    data.warranty_months = data.warrantyMonths;
  }
  if (data.image !== undefined && data.image_url === undefined) {
    data.image_url = data.image;
  }

  for (const field of productFields) {
    if (data[field] !== undefined) {
      const value = data[field];
      normalized[field] =
        typeof value === 'string' ? value.trim() :
        Array.isArray(value) ? value.map((item) => String(item).trim()).filter(Boolean) :
        value;
    }
  }
  return normalized;
};

export async function getProducts(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { category, brand, condition, search, sort } = req.query;
    const page = parsePositiveInt(req.query.page, 1, 100000);
    const limit = parsePositiveInt(req.query.limit, 24, 100);
    const filter: Record<string, any> = {};

    if (typeof category === 'string' && category !== 'All') filter.category = new RegExp(`^${escapeRegex(category)}$`, 'i');
    if (typeof brand === 'string' && brand !== 'All Brands') filter.brand = new RegExp(`^${escapeRegex(brand)}$`, 'i');
    if (typeof condition === 'string' && condition.trim()) filter.condition = new RegExp(`^${escapeRegex(condition.trim())}$`, 'i');

    if (typeof search === 'string' && search.trim()) {
      const searchRegex = new RegExp(escapeRegex(search.trim()), 'i');
      filter.$or = [{ name: searchRegex }, { brand: searchRegex }, { description: searchRegex }];
    }

    let sortBy: Record<string, 1 | -1> = { created_at: -1 };
    if (sort === 'price_asc') sortBy = { price: 1 };
    if (sort === 'price_desc') sortBy = { price: -1 };
    if (sort === 'name_asc') sortBy = { name: 1 };
    if (sort === 'name_desc') sortBy = { name: -1 };

    const [products, total] = await Promise.all([
      ProductModel.find(filter).sort(sortBy).skip((page - 1) * limit).limit(limit).lean(),
      ProductModel.countDocuments(filter),
    ]);
    const normalizedProducts = products.map(({ _id, ...product }) => ({
      ...product,
      id: _id.toString(),
    }));

    res.json({
      success: true,
      count: normalizedProducts.length,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      data: normalizedProducts,
    });
  } catch (err) {
    next(err);
  }
}

export async function getProductById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      res.status(400).json({ success: false, error: { message: 'Invalid product ID', code: 'INVALID_ID' } });
      return;
    }

    const product = await ProductModel.findById(req.params.id);
    if (!product) {
      res.status(404).json({ success: false, error: { message: 'Product not found', code: 'NOT_FOUND' } });
      return;
    }

    res.json({ success: true, data: product });
  } catch (err) {
    next(err);
  }
}

export async function createProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const saved = await ProductModel.create(normalizeProductPayload(req.body));
    res.status(201).json({ success: true, data: saved });

    // Broadcast "New Arrival" notification to ALL users & devices
    broadcastNewProductArrival({
      id: saved.id || (saved as any)._id?.toString(),
      name: saved.name,
      brand: (saved as any).brand,
      category: (saved as any).category,
      price: saved.price,
      image: (saved as any).image_url || (saved as any).image,
    }).catch((notifErr) => {
      console.error('[Products] Failed to dispatch new arrival broadcast:', notifErr);
    });
  } catch (err) {
    next(err);
  }
}


export async function updateProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      res.status(400).json({ success: false, error: { message: 'Invalid product ID', code: 'INVALID_ID' } });
      return;
    }

    const updated = await ProductModel.findByIdAndUpdate(
      req.params.id,
      { $set: normalizeProductPayload(req.body) },
      { new: true, runValidators: true, context: 'query' },
    );

    if (!updated) {
      res.status(404).json({ success: false, error: { message: 'Product not found', code: 'NOT_FOUND' } });
      return;
    }

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
}

export async function deleteProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      res.status(400).json({ success: false, error: { message: 'Invalid product ID', code: 'INVALID_ID' } });
      return;
    }

    const deleted = await ProductModel.findByIdAndDelete(req.params.id);
    if (!deleted) {
      res.status(404).json({ success: false, error: { message: 'Product not found', code: 'NOT_FOUND' } });
      return;
    }

    res.json({ success: true, message: 'Product deleted successfully', data: { id: deleted.id } });
  } catch (err) {
    next(err);
  }
}

export async function getLowStockAlerts(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const thresholdRaw = Number(req.query.threshold ?? 3);
    const threshold = Number.isInteger(thresholdRaw) && thresholdRaw >= 0 ? Math.min(thresholdRaw, 1000) : 3;
    const alerts = await ProductModel.find({ stock: { $lte: threshold } }).sort({ stock: 1, created_at: -1 }).lean();
    res.json({ success: true, threshold, count: alerts.length, data: alerts });
  } catch (err) {
    next(err);
  }
}
