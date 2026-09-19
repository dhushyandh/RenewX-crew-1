import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { ProductModel, CreateProductDTO } from '../models/Product';

export async function getProducts(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { category, brand, condition, search, sort } = req.query;

    const filter: Record<string, any> = {};

    if (category && category !== 'All' && typeof category === 'string') {
      filter.category = new RegExp(`^${category}$`, 'i');
    }
    if (brand && brand !== 'All Brands' && typeof brand === 'string') {
      filter.brand = new RegExp(`^${brand}$`, 'i');
    }
    if (condition && typeof condition === 'string') {
      filter.condition = condition;
    }
    if (search && typeof search === 'string' && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      filter.$or = [
        { name: searchRegex },
        { brand: searchRegex },
        { description: searchRegex },
      ];
    }

    let query = ProductModel.find(filter);

    if (sort === 'price_asc') {
      query = query.sort({ price: 1 });
    } else if (sort === 'price_desc') {
      query = query.sort({ price: -1 });
    } else {
      query = query.sort({ created_at: -1 });
    }

    const products = await query.exec();

    res.json({ success: true, count: products.length, data: products });
  } catch (err) {
    next(err);
  }
}

export async function getProductById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;

    let product = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
      product = await ProductModel.findById(id);
    }
    if (!product) {
      product = await ProductModel.findOne({ _id: id }).catch(() => null);
    }

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
    const payload: CreateProductDTO = req.body;

    const newProduct = {
      name: payload.name.trim(),
      brand: payload.brand.trim(),
      category: payload.category.trim(),
      original_price: Number(payload.original_price),
      price: Number(payload.price),
      condition: payload.condition || 'Like New',
      warranty_months: Number(payload.warranty_months) || 12,
      image_url: payload.image_url?.trim() || '',
      rating: Number(payload.rating) || 4.8,
      reviews: Number(payload.reviews) || 0,
      stock: Number(payload.stock) || 1,
      description: payload.description?.trim() || '',
      specs: Array.isArray(payload.specs) ? payload.specs : [],
    };

    const saved = await ProductModel.create(newProduct);

    res.status(201).json({ success: true, data: saved });
  } catch (err) {
    next(err);
  }
}

export async function updateProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const updates = req.body;

    let updated = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
      updated = await ProductModel.findByIdAndUpdate(id, updates, { new: true, runValidators: true });
    }

    if (!updated) {
      res.status(404).json({ success: false, error: { message: 'Product not found' } });
      return;
    }

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
}

export async function deleteProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;

    if (mongoose.Types.ObjectId.isValid(id)) {
      await ProductModel.findByIdAndDelete(id);
    }

    res.json({ success: true, message: 'Product deleted successfully' });
  } catch (err) {
    next(err);
  }
}

export async function getLowStockAlerts(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const threshold = parseInt((req.query.threshold as string) || '3', 10);

    const alerts = await ProductModel.find({ stock: { $lte: threshold } }).sort({ stock: 1 });

    res.json({ success: true, threshold, count: alerts.length, data: alerts });
  } catch (err) {
    next(err);
  }
}
