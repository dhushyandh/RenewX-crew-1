import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import crypto from 'crypto';
import { OrderModel, CreateOrderDTO, IOrder } from '../models/Order';
import { ProductModel } from '../models/Product';
import { AuthenticatedRequest } from '../middleware/auth';
import {
  createRazorpayOrder,
  fetchRazorpayPayment,
  getRazorpayKeyId,
  refundRazorpayPayment,
} from '../services/razorpay';
import { env } from '../config/env';

const MAX_ORDER_ITEMS = 50;
const MAX_ITEM_QUANTITY = 20;

const isValidPhone = (value: unknown): value is string => /^\d{10}$/.test(String(value ?? ''));
const isValidPincode = (value: unknown): value is string => /^\d{6}$/.test(String(value ?? ''));

function httpError(message: string, statusCode: number, code: string): Error & { statusCode: number; code: string } {
  return Object.assign(new Error(message), { statusCode, code });
}

function verifySignature(orderId: string, paymentId: string, signature: string): boolean {
  if (!env.RAZORPAY_KEY_SECRET || !signature) return false;
  const expected = crypto
    .createHmac('sha256', env.RAZORPAY_KEY_SECRET)
    .update(orderId + '|' + paymentId)
    .digest('hex');

  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(signature, 'utf8');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function verifyWebhookSignature(rawBody: Buffer, signature: string): boolean {
  if (!env.RAZORPAY_WEBHOOK_SECRET || !signature) return false;
  const expected = crypto.createHmac('sha256', env.RAZORPAY_WEBHOOK_SECRET).update(rawBody).digest('hex');
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(signature, 'utf8');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function normalizeCheckoutKey(value: unknown): string {
  const key = String(value ?? '').trim();
  if (key.length < 16 || key.length > 100) {
    throw httpError('A valid idempotency key is required', 400, 'INVALID_IDEMPOTENCY_KEY');
  }
  return key;
}

function buildOrderItems(products: any[], requested: Map<string, number>) {
  let subtotal = 0;
  let savings = 0;
  const orderItems: {
    product_id: string;
    product_name: string;
    quantity: number;
    price: number;
  }[] = [];

  for (const [productId, quantity] of requested.entries()) {
    const product = products.find((p) => p._id.toString() === productId);
    if (!product) throw httpError('Product not found: ' + productId, 404, 'PRODUCT_NOT_FOUND');

    if (product.stock < quantity) {
      throw httpError('Insufficient stock for ' + product.name, 409, 'INSUFFICIENT_STOCK');
    }

    subtotal += Number(product.price) * quantity;
    savings += Math.max(0, Number(product.original_price || product.price) - Number(product.price)) * quantity;
    orderItems.push({
      product_id: productId,
      product_name: product.name,
      quantity,
      price: Number(product.price),
    });
  }

  return {
    subtotal: Math.round(subtotal),
    savings: Math.round(savings),
    orderItems,
  };
}

function parseOrderPayload(payload: CreateOrderDTO) {
  if (!payload || !Array.isArray(payload.items) || payload.items.length === 0 || payload.items.length > MAX_ORDER_ITEMS) {
    throw httpError('Order must contain 1-' + MAX_ORDER_ITEMS + ' items', 400, 'INVALID_ITEMS');
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
    throw httpError(
      'Valid name, 10-digit phone, address and 6-digit pincode are required',
      400,
      'INVALID_CUSTOMER_INFO'
    );
  }

  const requested = new Map<string, number>();
  for (const item of payload.items) {
    const productId = String(item?.product_id || '');
    const quantity = Number(item?.quantity);

    if (
      !mongoose.Types.ObjectId.isValid(productId) ||
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      quantity > MAX_ITEM_QUANTITY
    ) {
      throw httpError('Each item must contain a valid product ID and quantity', 400, 'INVALID_ITEM');
    }

    requested.set(productId, (requested.get(productId) || 0) + quantity);
  }

  for (const [productId, quantity] of requested.entries()) {
    if (quantity > MAX_ITEM_QUANTITY) {
      throw httpError('Maximum quantity per product is ' + MAX_ITEM_QUANTITY, 400, 'QUANTITY_LIMIT');
    }
  }

  return { customer, requested };
}

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

export async function createCheckoutOrder(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) throw httpError('Authentication required', 401, 'UNAUTHORIZED');

    const checkoutKey = normalizeCheckoutKey(req.header('Idempotency-Key'));
    const { customer, requested } = parseOrderPayload(req.body as CreateOrderDTO);

    const existing = await OrderModel.findOne({
      user_id: req.user.id,
      checkout_key: checkoutKey,
    }).select('+checkout_key');

    if (existing) {
      res.status(200).json({
        success: true,
        data: {
          order: existing,
          razorpay_key_id: getRazorpayKeyId(),
          razorpay_order_id: existing.razorpay_order_id,
          amount: existing.subtotal * 100,
          currency: 'INR',
        },
      });
      return;
    }

    const productIds = [...requested.keys()].map((id) => new mongoose.Types.ObjectId(id));
    const products = await ProductModel.find({ _id: { $in: productIds } }).lean();
    if (products.length !== requested.size) {
      const ids = new Set(products.map((p) => p._id.toString()));
      const missing = [...requested.keys()].find((id) => !ids.has(id));
      throw httpError('Product not found: ' + missing, 404, 'PRODUCT_NOT_FOUND');
    }

    const { subtotal, savings, orderItems } = buildOrderItems(products, requested);
    if (subtotal < 100) throw httpError('Minimum payable amount is ₹1', 400, 'INVALID_AMOUNT');

    const draft = await OrderModel.create({
      user_id: req.user.id,
      subtotal,
      savings,
      status: 'pending',
      payment_status: 'created',
      payment_method: 'razorpay',
      currency: 'INR',
      checkout_key: checkoutKey,
      customer_info: {
        name: customer.name.trim(),
        phone: customer.phone,
        address: customer.address.trim(),
        pincode: customer.pincode,
      },
      order_items: orderItems,
    });

    try {
      const receipt = 'RNX-' + draft.id.slice(-12);
      const razorpayOrder = await createRazorpayOrder({
        amount: subtotal * 100,
        receipt,
        notes: {
          renewx_order_id: draft.id,
          user_id: req.user.id,
        },
      });

      draft.razorpay_order_id = razorpayOrder.id;
      await draft.save();

      res.status(201).json({
        success: true,
        data: {
          order: draft,
          razorpay_key_id: getRazorpayKeyId(),
          razorpay_order_id: razorpayOrder.id,
          amount: subtotal * 100,
          currency: 'INR',
        },
      });
    } catch (paymentError) {
      await OrderModel.deleteOne({ _id: draft._id }).exec();
      throw paymentError;
    }
  } catch (err: any) {
    if (err?.code === 11000) {
      const checkoutKey = String(req.header('Idempotency-Key') || '');
      const existing = await OrderModel.findOne({ user_id: req.user?.id, checkout_key: checkoutKey }).select('+checkout_key');
      if (existing) {
        res.json({
          success: true,
          data: {
            order: existing,
            razorpay_key_id: getRazorpayKeyId(),
            razorpay_order_id: existing.razorpay_order_id,
            amount: existing.subtotal * 100,
            currency: 'INR',
          },
        });
        return;
      }
    }

    if (err?.statusCode) {
      res.status(err.statusCode).json({
        success: false,
        error: { message: err.message, code: err.code || 'CHECKOUT_FAILED' },
      });
      return;
    }

    next(err);
  }
}

export async function verifyPayment(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) throw httpError('Authentication required', 401, 'UNAUTHORIZED');

    const {
      order_id,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = req.body || {};

    if (!mongoose.Types.ObjectId.isValid(String(order_id))) {
      throw httpError('Invalid order ID', 400, 'INVALID_ID');
    }

    const order = await OrderModel.findById(order_id);
    if (!order) throw httpError('Order not found', 404, 'NOT_FOUND');

    if (order.user_id !== req.user.id && req.user.role !== 'admin') {
      throw httpError('You cannot access this order', 403, 'FORBIDDEN');
    }

    if (order.payment_status === 'paid') {
      res.json({ success: true, data: order, already_processed: true });
      return;
    }

    if (!order.razorpay_order_id || order.razorpay_order_id !== razorpay_order_id) {
      throw httpError('Payment order mismatch', 400, 'PAYMENT_ORDER_MISMATCH');
    }

    if (!verifySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature)) {
      throw httpError('Payment signature verification failed', 400, 'INVALID_PAYMENT_SIGNATURE');
    }

    const duplicatePayment = await OrderModel.findOne({
      razorpay_payment_id,
      _id: { $ne: order._id },
    });
    if (duplicatePayment) {
      throw httpError('Payment has already been associated with another order', 409, 'PAYMENT_REUSED');
    }

    const payment: any = await fetchRazorpayPayment(razorpay_payment_id);
    if (
      payment.order_id !== order.razorpay_order_id ||
      Number(payment.amount) !== order.subtotal * 100 ||
      payment.currency !== 'INR'
    ) {
      throw httpError('Payment amount or order could not be verified', 400, 'PAYMENT_MISMATCH');
    }

    if (payment.status !== 'captured') {
      await OrderModel.findByIdAndUpdate(order._id, {
        payment_status: payment.status === 'failed' ? 'failed' : 'created',
        razorpay_payment_id,
      }).exec();
      throw httpError('Payment is not captured yet. Please retry after confirmation.', 409, 'PAYMENT_NOT_CAPTURED');
    }

    const finalized = await finalizePaidOrder(order, razorpay_payment_id);

    res.json({ success: true, data: finalized });
  } catch (err: any) {
    if (err?.statusCode) {
      res.status(err.statusCode).json({
        success: false,
        error: { message: err.message, code: err.code || 'PAYMENT_FAILED' },
      });
      return;
    }
    next(err);
  }
}

async function finalizePaidOrder(order: IOrder, paymentId: string): Promise<IOrder> {
  if (order.payment_status === 'paid') return order;

  const reserved: { id: string; quantity: number }[] = [];

  try {
    for (const item of order.order_items) {
      const product = await ProductModel.findOneAndUpdate(
        { _id: item.product_id, stock: { $gte: item.quantity } },
        { $inc: { stock: -item.quantity } },
        { new: true }
      );

      if (!product) {
        throw httpError('Product became unavailable before order confirmation', 409, 'INSUFFICIENT_STOCK_AFTER_PAYMENT');
      }

      reserved.push({ id: item.product_id, quantity: item.quantity });
    }

    order.payment_status = 'paid';
    order.razorpay_payment_id = paymentId;
    order.payment_verified_at = new Date();
    order.status = 'verified';
    order.courier = order.courier || 'BlueDart Express';
    order.tracking_number = order.tracking_number || 'RNX' + Date.now().toString().slice(-9);
    order.estimated_delivery = order.estimated_delivery || '2-3 Business Days';
    await order.save();

    return order;
  } catch (error) {
    if (reserved.length) {
      await Promise.all(
        reserved.map(({ id, quantity }) =>
          ProductModel.updateOne({ _id: id }, { $inc: { stock: quantity } }).exec()
        )
      );
    }

    try {
      await refundRazorpayPayment(paymentId, order.subtotal * 100);
      order.payment_status = 'refunded';
    } catch (refundError) {
      console.error('[Payments] Refund failed after stock conflict:', refundError);
      order.payment_status = 'refund_pending';
    }

    order.razorpay_payment_id = paymentId;
    order.status = 'cancelled';
    await order.save();

    throw error;
  }
}

export async function handleRazorpayWebhook(req: Request, res: Response): Promise<void> {
  try {
    const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from('');
    const signature = String(req.headers['x-razorpay-signature'] || '');

    if (!verifyWebhookSignature(rawBody, signature)) {
      res.status(401).json({ success: false, error: { message: 'Invalid webhook signature' } });
      return;
    }

    const payload = JSON.parse(rawBody.toString('utf8'));
    const event = String(payload.event || '');
    const payment = payload.payload?.payment?.entity;
    const razorpayOrderId = payment?.order_id || payload.payload?.order?.entity?.id;

    if (!razorpayOrderId) {
      res.json({ success: true, ignored: true });
      return;
    }

    const order = await OrderModel.findOne({ razorpay_order_id: razorpayOrderId });
    if (!order) {
      res.json({ success: true, ignored: true });
      return;
    }

    if (event === 'payment.failed') {
      if (order.payment_status !== 'paid') {
        order.payment_status = 'failed';
        if (payment?.id) order.razorpay_payment_id = payment.id;
        await order.save();
      }
      res.json({ success: true });
      return;
    }

    if (event === 'payment.captured') {
      if (order.payment_status !== 'paid') {
        const paymentId = payment?.id || order.razorpay_payment_id;
        if (paymentId) await finalizePaidOrder(order, paymentId);
      }
    }

    res.json({ success: true });
  } catch (error) {
    console.error('[Payments] Webhook processing failed:', error);
    res.status(500).json({ success: false, error: { message: 'Webhook processing failed' } });
  }
}

export async function updateOrderStatus(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user || req.user.role !== 'admin') {
      res.status(403).json({ success: false, error: { message: 'Admin access required', code: 'FORBIDDEN' } });
      return;
    }

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

    const order = await OrderModel.findById(id);
    if (!order) {
      res.status(404).json({ success: false, error: { message: 'Order not found', code: 'NOT_FOUND' } });
      return;
    }

    if (status === 'cancelled' && order.payment_status === 'paid') {
      res.status(409).json({
        success: false,
        error: { message: 'Paid orders require the refund flow before cancellation', code: 'REFUND_REQUIRED' },
      });
      return;
    }

    if (status) order.status = status;
    if (courier !== undefined) order.courier = String(courier).trim();
    if (tracking_number !== undefined) order.tracking_number = String(tracking_number).trim();
    if (estimated_delivery !== undefined) order.estimated_delivery = String(estimated_delivery).trim();

    await order.save();
    res.json({ success: true, data: order });
  } catch (err) {
    next(err);
  }
}

export async function createOrder(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  // Backward-compatible alias intentionally routes all new mobile checkout traffic
  // through the production payment-order flow.
  return createCheckoutOrder(req, res, next);
}
