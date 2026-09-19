import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { OrderModel, CreateOrderDTO } from '../models/Order';
import { AuthenticatedRequest } from '../middleware/auth';

export async function getOrders(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { status, limit, user_id } = req.query;

    const filter: Record<string, any> = {};

    if (status && typeof status === 'string') {
      filter.status = status;
    }

    // Non-admin can only view their own orders
    if (req.user && req.user.role !== 'admin') {
      filter.user_id = req.user.id;
    } else if (user_id && typeof user_id === 'string') {
      filter.user_id = user_id;
    }

    let query = OrderModel.find(filter).sort({ created_at: -1 });

    if (limit) {
      query = query.limit(Number(limit));
    }

    const orders = await query.exec();

    res.json({ success: true, count: orders.length, data: orders });
  } catch (err) {
    next(err);
  }
}

export async function getOrderById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;

    let order = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
      order = await OrderModel.findById(id);
    }
    if (!order) {
      order = await OrderModel.findOne({ _id: id }).catch(() => null);
    }

    if (!order) {
      res.status(404).json({ success: false, error: { message: 'Order not found', code: 'NOT_FOUND' } });
      return;
    }

    res.json({ success: true, data: order });
  } catch (err) {
    next(err);
  }
}

export async function createOrder(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const payload: CreateOrderDTO = req.body;
    const userId = req.user?.id || payload.user_id || 'guest-user';

    const newOrder = await OrderModel.create({
      user_id: userId,
      subtotal: payload.subtotal,
      savings: payload.savings || 0,
      status: 'pending',
      courier: 'BlueDart Express',
      tracking_number: `RNX${Math.floor(100000000 + Math.random() * 900000000)}`,
      customer_info: payload.customer_info || {},
      order_items: payload.items || [],
    });

    res.status(201).json({ success: true, data: newOrder });
  } catch (err) {
    next(err);
  }
}

export async function updateOrderStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const { status, courier, tracking_number, estimated_delivery } = req.body;

    const updates: Record<string, any> = {};
    if (status) updates.status = status;
    if (courier) updates.courier = courier;
    if (tracking_number) updates.tracking_number = tracking_number;
    if (estimated_delivery) updates.estimated_delivery = estimated_delivery;

    let order = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
      order = await OrderModel.findByIdAndUpdate(id, updates, { new: true });
    }

    if (!order) {
      res.status(404).json({ success: false, error: { message: 'Order not found' } });
      return;
    }

    res.json({ success: true, data: order });
  } catch (err) {
    next(err);
  }
}
