import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { OrderModel, CreateOrderDTO } from '../models/Order';
import { ProductModel } from '../models/Product';
import { AuthenticatedRequest } from '../middleware/auth';

const MAX_ORDER_ITEMS = 50;
const MAX_ITEM_QUANTITY = 20;

const isValidPhone = (value: unknown): value is string => /^\d{10}$/.test(String(value ?? ''));
const isValidPincode = (value: unknown): value is string => /^\d{6}$/.test(String(value ?? ''));

export async function getOrders(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { status, limit, user_id } = req.query;
    const filter: Record<string, any> = {};

    if (status && typeof status === 'string') filter.status = status;

    if (req.user && req.user.role !== 'admin') {
      filter.user_id = req.user.id;
    } else if (user_id && typeof user_id === 'string') {
      filter.user_id = user_id;
    }

    const parsedLimit = Number(limit);
    const safeLimit = Number.isInteger(parsedLimit) && parsedLimit > 0 ? Math.min(parsedLimit, 50) : 20;
    const orders = await OrderModel.find(filter).sort({ created_at: -1 }).limit(safeLimit).exec();

    res.json({ success: true, count: orders.length, data: orders });
  } catch (err) {
    next(err);
  }
}

export async function getOrderById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: { message: 'Authentication required', code: 'UNAUTHORIZED' } });
      return;
    }

    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, error: { message: 'Invalid order ID', code: 'INVALID_ID' } });
      return;
    }

    const order = await OrderModel.findById(id);
    if (!order) {
      res.status(404).json({ success: false, error: { message: 'Order not found', code: 'NOT_FOUND' } });
      return;
    }

    if (req.user.role !== 'admin' && order.user_id !== req.user.id) {
      res.status(403).json({ success: false, error: { message: 'You cannot access this order', code: 'FORBIDDEN' } });
      return;
    }

    res.json({ success: true, data: order });
  } catch (err) {
    next(err);
  }
}

export async function createOrder(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  const reserved: { id: string; quantity: number }[] = [];

  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: { message: 'Authentication required', code: 'UNAUTHORIZED' } });
      return;
    }

    const payload = req.body as CreateOrderDTO;
    if (!payload || !Array.isArray(payload.items) || payload.items.length === 0 || payload.items.length > MAX_ORDER_ITEMS) {
      res.status(400).json({ success: false, error: { message: 'Order must contain 1-' + MAX_ORDER_ITEMS + ' items', code: 'INVALID_ITEMS' } });
      return;
    }

    const customer = payload.customer_info;
    if (
      !customer ||
      typeof customer.name !== 'string' ||
      customer.name.trim().length < 2 ||
      customer.name.trim().length > 120 ||
      !isValidPhone(customer.phone) ||
      typeof customer.address !== 'string' ||
      customer.address.trim().length < 8 ||
      customer.address.trim().length > 500 ||
      !isValidPincode(customer.pincode)
    ) {
      res.status(400).json({
        success: false,
        error: { message: 'Valid name, 10-digit phone, address and 6-digit pincode are required', code: 'INVALID_CUSTOMER_INFO' },
      });
      return;
    }

    const requested = new Map<string, number>();
    for (const item of payload.items) {
      const productId = String(item?.product_id || '');
      const quantity = Number(item?.quantity);

      if (!mongoose.Types.ObjectId.isValid(productId) || !Number.isInteger(quantity) || quantity < 1 || quantity > MAX_ITEM_QUANTITY) {
        res.status(400).json({
          success: false,
          error: { message: 'Each item must contain a valid product ID and quantity', code: 'INVALID_ITEM' },
        });
        return;
      }

      requested.set(productId, (requested.get(productId) || 0) + quantity);
    }

    for (const [productId, quantity] of requested.entries()) {
      if (quantity > MAX_ITEM_QUANTITY) {
        res.status(400).json({
          success: false,
          error: { message: 'Maximum quantity per product is ' + MAX_ITEM_QUANTITY, code: 'QUANTITY_LIMIT' },
        });
        return;
      }
    }

    const productIds = [...requested.keys()].map((id) => new mongoose.Types.ObjectId(id));
    const existingProducts = await ProductModel.find({ _id: { $in: productIds } }).lean();
    if (existingProducts.length !== requested.size) {
      const existingIds = new Set(existingProducts.map((product) => product._id.toString()));
      const missing = [...requested.keys()].find((id) => !existingIds.has(id));
      res.status(404).json({
        success: false,
        error: { message: 'Product not found: ' + missing, code: 'PRODUCT_NOT_FOUND' },
      });
      return;
    }

    let subtotal = 0;
    let savings = 0;
    const orderItems: {
      product_id: string;
      product_name: string;
      quantity: number;
      price: number;
    }[] = [];

    // Atomically reserve each product's stock. Price/name are taken from
    // the document returned by the reservation query, never from the client.
    for (const [productId, quantity] of requested.entries()) {
      const product = await ProductModel.findOneAndUpdate(
        { _id: productId, stock: { $gte: quantity } },
        { $inc: { stock: -quantity } },
        { new: true }
      );

      if (!product) {
        throw Object.assign(new Error('Insufficient stock for product ' + productId), {
          statusCode: 409,
          code: 'INSUFFICIENT_STOCK',
        });
      }

      reserved.push({ id: productId, quantity });
      subtotal += product.price * quantity;
      savings += Math.max(0, product.original_price - product.price) * quantity;
      orderItems.push({
        product_id: productId,
        product_name: product.name,
        quantity,
        price: product.price,
      });
    }

    const newOrder = await OrderModel.create({
      user_id: req.user.id,
      subtotal: Math.round(subtotal),
      savings: Math.round(savings),
      status: 'pending',
      courier: 'BlueDart Express',
      tracking_number: 'RNX' + Date.now().toString().slice(-9),
      estimated_delivery: '2-3 Business Days',
      customer_info: {
        name: customer.name.trim(),
        phone: customer.phone,
        address: customer.address.trim(),
        pincode: customer.pincode,
      },
      order_items: orderItems,
    });

    res.status(201).json({ success: true, data: newOrder });
  } catch (err: any) {
    // Restore any stock reserved before a later item or order write failed.
    if (reserved.length) {
      await Promise.all(
        reserved.map(({ id, quantity }) =>
          ProductModel.updateOne({ _id: id }, { $inc: { stock: quantity } }).exec()
        )
      );
    }

    if (err?.statusCode) {
      res.status(err.statusCode).json({
        success: false,
        error: { message: err.message, code: err.code || 'ORDER_FAILED' },
      });
      return;
    }

    next(err);
  }
}

export async function updateOrderStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const { status, courier, tracking_number, estimated_delivery } = req.body;

    const allowedStatuses = new Set([
      'pending', 'verified', 'processing', 'shipped', 'out_for_delivery', 'delivered', 'cancelled',
    ]);

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, error: { message: 'Invalid order ID', code: 'INVALID_ID' } });
      return;
    }
    if (status && !allowedStatuses.has(status)) {
      res.status(400).json({ success: false, error: { message: 'Invalid order status', code: 'INVALID_STATUS' } });
      return;
    }

    const updates: Record<string, any> = {};
    if (status) updates.status = status;
    if (courier !== undefined) updates.courier = String(courier).trim();
    if (tracking_number !== undefined) updates.tracking_number = String(tracking_number).trim();
    if (estimated_delivery !== undefined) updates.estimated_delivery = String(estimated_delivery).trim();

    const order = await OrderModel.findByIdAndUpdate(id, updates, { new: true, runValidators: true });
    if (!order) {
      res.status(404).json({ success: false, error: { message: 'Order not found', code: 'NOT_FOUND' } });
      return;
    }

    res.json({ success: true, data: order });
  } catch (err) {
    next(err);
  }
}
