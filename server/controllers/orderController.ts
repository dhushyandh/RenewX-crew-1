import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import crypto from 'crypto';
import PDFDocument from 'pdfkit';
import { OrderModel, CreateOrderDTO, IOrder } from '../models/Order';
import { ProductModel } from '../models/Product';
import { AuthenticatedRequest } from '../middleware/auth';
import {
  createRazorpayOrder,
  fetchRazorpayPayment,
  captureRazorpayPayment,
  getRazorpayKeyId,
  refundRazorpayPayment,
} from '../services/razorpay';
import { env } from '../config/env';
import { User } from '../models/User';
import { NotificationModel } from '../models/Notification';
import { createUserNotification, notifyUserEvent, notifyAdminsNewOrder } from '../services/notificationService';

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
    if (!req.user) {
      res.status(401).json({ success: false, error: { message: 'Authentication required', code: 'UNAUTHORIZED' } });
      return;
    }

    const { status, limit, user_id } = req.query;
    const filter: mongoose.FilterQuery<IOrder> = {};

    if (status && typeof status === 'string') filter.status = status;

    if (req.user.role !== 'admin') {
      filter.user_id = req.user.id;
    } else if (user_id && typeof user_id === 'string') {
      filter.user_id = user_id;
    }

    const parsedLimit = Number(limit);
    const safeLimit = Number.isInteger(parsedLimit) && parsedLimit > 0 ? Math.min(parsedLimit, 50) : 20;
    const orders = await OrderModel.find(filter).sort({ created_at: -1 }).limit(safeLimit).lean().exec();
    const normalizedOrders = orders.map(({ _id, ...order }: any) => ({
      ...order,
      id: _id ? _id.toString() : order.id,
    }));

    res.json({ success: true, count: normalizedOrders.length, data: normalizedOrders });
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

    const id = String(req.params.id ?? '');
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, error: { message: 'Invalid order ID', code: 'INVALID_ID' } });
      return;
    }

    const order = await OrderModel.findById(id).lean();
    if (!order) {
      res.status(404).json({ success: false, error: { message: 'Order not found', code: 'NOT_FOUND' } });
      return;
    }

    if (req.user.role !== 'admin' && order.user_id !== req.user.id) {
      res.status(403).json({ success: false, error: { message: 'You cannot access this order', code: 'FORBIDDEN' } });
      return;
    }

    const { _id, ...orderData } = order as any;
    res.json({ success: true, data: { ...orderData, id: _id ? _id.toString() : orderData.id } });
  } catch (err) {
    next(err);
  }
}

export async function getOrderInvoice(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: { message: 'Authentication required', code: 'UNAUTHORIZED' } });
      return;
    }

    const id = String(req.params.id ?? '');
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

    const user = await User.findById(order.user_id).select('full_name email phone');
    const orderId = order.id || id;
    const orderDate = order.created_at ? new Date(order.created_at).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }) : new Date().toLocaleDateString('en-IN');

    const customerName = order.customer_info?.name || user?.full_name || 'Valued Customer';
    const customerPhone = order.customer_info?.phone || user?.phone || 'Not provided';
    const customerEmail = user?.email || '';
    const address = order.customer_info?.address || 'Standard Delivery Address';
    const pincode = order.customer_info?.pincode || '';

    const items = (order.order_items && order.order_items.length > 0)
      ? order.order_items
      : [{ product_name: 'Certified RenewX Tech Device', quantity: 1, price: order.subtotal }];

    const itemsHtml = items.map((item: any, idx: number) => {
      const quantity = item.quantity || 1;
      const price = item.price || 0;
      const lineTotal = quantity * price;
      return `
        <tr>
          <td style="padding: 12px 14px; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #64748b; text-align: center;">${idx + 1}</td>
          <td style="padding: 12px 14px; border-bottom: 1px solid #e2e8f0; font-size: 13px; font-weight: 700; color: #0f172a;">
            ${item.product_name || 'Certified RenewX Device'}
            <div style="font-size: 11px; font-weight: 600; color: #16a34a; margin-top: 3px;">
              ✓ Inspected & Quality Verified Pre-Owned
            </div>
          </td>
          <td style="padding: 12px 14px; border-bottom: 1px solid #e2e8f0; font-size: 13px; text-align: center; color: #334155;">${quantity}</td>
          <td style="padding: 12px 14px; border-bottom: 1px solid #e2e8f0; font-size: 13px; text-align: right; color: #334155;">₹${price.toLocaleString('en-IN')}</td>
          <td style="padding: 12px 14px; border-bottom: 1px solid #e2e8f0; font-size: 13px; font-weight: 700; text-align: right; color: #0f172a;">₹${lineTotal.toLocaleString('en-IN')}</td>
        </tr>
      `;
    }).join('');

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>RenewX Invoice #${orderId}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    * { box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 32px 24px; color: #0f172a; background: #f8fafc; }
    .invoice-card { max-width: 800px; margin: 0 auto; background: #ffffff; border-radius: 18px; border: 1px solid #e2e8f0; padding: 40px 36px; box-shadow: 0 4px 20px rgba(0,0,0,0.04); }
    .header-row { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0f172a; padding-bottom: 24px; margin-bottom: 28px; }
    .brand-title { font-size: 28px; font-weight: 900; letter-spacing: -0.8px; color: #0f172a; margin: 0; }
    .brand-title span { color: #f59e0b; }
    .brand-subtitle { font-size: 11px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: #64748b; margin-top: 4px; }
    .badge-tax { display: inline-block; background: #0f172a; color: #ffffff; font-size: 11px; font-weight: 800; letter-spacing: 1px; padding: 5px 12px; border-radius: 6px; text-transform: uppercase; margin-bottom: 6px; }
    .invoice-id { font-size: 17px; font-weight: 800; color: #0f172a; margin: 0; }
    .invoice-date { font-size: 13px; color: #64748b; margin-top: 4px; }
    .grid-parties { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-bottom: 28px; }
    .party-title { font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: #64748b; margin-bottom: 8px; }
    .party-name { font-size: 15px; font-weight: 700; color: #0f172a; margin-bottom: 4px; }
    .party-detail { font-size: 13px; line-height: 1.5; color: #475569; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 28px; }
    th { background: #f1f5f9; padding: 12px 14px; font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; color: #334155; border-bottom: 2px solid #cbd5e1; }
    .totals-wrap { display: flex; justify-content: flex-end; margin-bottom: 32px; }
    .totals-box { width: 320px; background: #fafafa; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px 20px; }
    .totals-row { display: flex; justify-content: space-between; font-size: 13px; color: #475569; margin-bottom: 10px; }
    .totals-row.grand { border-top: 2px solid #0f172a; padding-top: 10px; margin-top: 10px; font-size: 17px; font-weight: 900; color: #0f172a; margin-bottom: 0; }
    .guarantee-box { display: flex; align-items: center; gap: 14px; background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 12px; padding: 16px 20px; margin-bottom: 28px; }
    .guarantee-badge { background: #10b981; color: #ffffff; width: 38px; height: 38px; border-radius: 19px; display: flex; align-items: center; justify-content: center; font-size: 20px; font-weight: 900; flex-shrink: 0; }
    .guarantee-title { font-size: 14px; font-weight: 800; color: #065f46; }
    .guarantee-sub { font-size: 12px; color: #047857; margin-top: 2px; }
    .footer { border-top: 1px solid #e2e8f0; padding-top: 20px; text-align: center; font-size: 12px; color: #94a3b8; line-height: 1.6; }
    .actions-bar { margin-bottom: 20px; text-align: right; }
    .download-btn { display: inline-flex; align-items: center; gap: 8px; background: #0f172a; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 700; font-size: 13px; box-shadow: 0 4px 12px rgba(15, 23, 42, 0.15); transition: background 0.2s; }
    .download-btn:hover { background: #1e293b; }
    @media print {
      body { background: #ffffff; padding: 0; }
      .invoice-card { box-shadow: none; border: none; padding: 0; }
      .actions-bar { display: none; }
    }
  </style>
</head>
<body>
  <div class="actions-bar">
    <a class="download-btn" href="/api/orders/${orderId}/invoice/pdf${req.query.token ? `?token=${encodeURIComponent(String(req.query.token))}` : ''}" download>⬇️ Download Tax Invoice (PDF)</a>
  </div>
  <div class="invoice-card">
    <div class="header-row">
      <div>
        <h1 class="brand-title">Renew<span>X</span></h1>
        <div class="brand-subtitle">Certified Pre-Owned Tech Crew</div>
      </div>
      <div style="text-align: right;">
        <div class="badge-tax">Tax Invoice / Bill of Supply</div>
        <div class="invoice-id">Invoice #${orderId}</div>
        <div class="invoice-date">Date: ${orderDate}</div>
      </div>
    </div>
    <div class="grid-parties">
      <div>
        <div class="party-title">Sold By (Seller)</div>
        <div class="party-name">RenewX Crew India Pvt Ltd</div>
        <div class="party-detail">
          Pre-Owned Electronics Marketplace<br />
          Email: support@renewx.in<br />
          Web: https://renewx.expo.app<br />
          GSTIN: 33AAACR2938L1Z8
        </div>
      </div>
      <div>
        <div class="party-title">Billed & Shipped To (Customer)</div>
        <div class="party-name">${customerName}</div>
        <div class="party-detail">
          ${address}${pincode ? ` - ${pincode}` : ''}<br />
          Phone: ${customerPhone}<br />
          ${customerEmail ? `Email: ${customerEmail}<br />` : ''}
          Order Status: <strong>${(order.status || 'Confirmed').toUpperCase()}</strong>
        </div>
      </div>
    </div>
    <table>
      <thead>
        <tr>
          <th style="width: 40px; text-align: center;">#</th>
          <th style="text-align: left;">Item Description</th>
          <th style="width: 60px; text-align: center;">Qty</th>
          <th style="width: 120px; text-align: right;">Unit Price</th>
          <th style="width: 120px; text-align: right;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHtml}
      </tbody>
    </table>
    <div class="totals-wrap">
      <div class="totals-box">
        <div class="totals-row">
          <span>Subtotal</span>
          <span>₹${order.subtotal.toLocaleString('en-IN')}</span>
        </div>
        <div class="totals-row">
          <span>Certified Express Shipping</span>
          <span style="color: #16a34a; font-weight: 700;">FREE</span>
        </div>
        ${order.savings > 0 ? `
        <div class="totals-row">
          <span>Special Savings</span>
          <span style="color: #16a34a; font-weight: 700;">-₹${order.savings.toLocaleString('en-IN')}</span>
        </div>` : ''}
        <div class="totals-row">
          <span>Payment Method</span>
          <span style="font-weight: 600;">${(order.payment_method || 'Online').toUpperCase()}</span>
        </div>
        <div class="totals-row">
          <span>Payment Status</span>
          <span style="color: #16a34a; font-weight: 700;">${(order.payment_status || 'Paid').toUpperCase()}</span>
        </div>
        <div class="totals-row grand">
          <span>Total Paid</span>
          <span>₹${order.subtotal.toLocaleString('en-IN')}</span>
        </div>
      </div>
    </div>
    <div class="guarantee-box">
      <div class="guarantee-badge">✓</div>
      <div>
        <div class="guarantee-title">RenewX Inspected & Quality Verified</div>
        <div class="guarantee-sub">
          This pre-owned device passed our hardware inspection & functional verification before dispatch.
        </div>
      </div>
    </div>
    <div class="footer">
      Questions about your order? Reach out at <strong>support@renewx.in</strong> or through the RenewX app.<br />
      Thank you for championing sustainable, circular electronics with RenewX Crew.
    </div>
  </div>
</body>
</html>`;

    if (req.query.format === 'json') {
      res.json({
        success: true,
        data: {
          order_id: orderId,
          order,
          invoice_html: html,
        },
      });
      return;
    }

    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Content-Disposition', `inline; filename="invoice-${orderId}.html"`);
    res.send(html);
  } catch (err) {
    next(err);
  }
}

export async function downloadOrderInvoicePdfController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const id = String(req.params.id ?? '');
    let order: any = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
      order = await OrderModel.findById(id);
    }
    if (!order) {
      order = await OrderModel.findOne({
        $or: [{ id }, { razorpay_order_id: id }, { order_number: id }],
      });
    }

    if (!order) {
      res.status(404).json({ success: false, error: { message: 'Order not found', code: 'NOT_FOUND' } });
      return;
    }

    if (req.user && req.user.role !== 'admin' && String(order.user_id) !== String(req.user.id)) {
      res.status(403).json({ success: false, error: { message: 'You cannot access this order', code: 'FORBIDDEN' } });
      return;
    }

    const user = await User.findById(order.user_id).select('full_name email phone');
    const orderId = String(order.order_number || order.id || id).replace(/[^a-zA-Z0-9-_]/g, '_');
    const filename = `RenewX_Tax_Invoice_${orderId}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    doc.pipe(res);

    // Header: RenewX Brand
    doc.fillColor('#0f172a').fontSize(22).font('Helvetica-Bold').text('RenewX', 40, 40, { continued: true });
    doc.fillColor('#f59e0b').text(' Crew');
    doc.fillColor('#64748b').fontSize(8.5).font('Helvetica').text('CERTIFIED PRE-OWNED ELECTRONICS & CIRCULAR TECH', 40, 68);

    // Invoice badge & details (right side)
    doc.fillColor('#0f172a').fontSize(11).font('Helvetica-Bold').text('TAX INVOICE / BILL OF SUPPLY', 300, 40, { align: 'right' });
    doc.fillColor('#475569').fontSize(9).font('Helvetica').text(`Invoice #: ${order.order_number || order.id || id}`, 300, 56, { align: 'right' });
    const orderDate = order.created_at
      ? new Date(order.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
      : new Date().toLocaleDateString('en-IN');
    doc.text(`Date: ${orderDate}`, 300, 70, { align: 'right' });
    doc.text(`Status: ${(order.status || 'Confirmed').toUpperCase()}`, 300, 84, { align: 'right' });

    doc.moveTo(40, 104).lineTo(555, 104).strokeColor('#e2e8f0').lineWidth(1).stroke();

    // Seller & Customer Info
    const startY = 116;
    doc.fillColor('#64748b').fontSize(8).font('Helvetica-Bold').text('SOLD BY (SELLER)', 40, startY);
    doc.fillColor('#0f172a').fontSize(9.5).font('Helvetica-Bold').text('RenewX Crew India Pvt Ltd', 40, startY + 12);
    doc.fillColor('#475569').fontSize(8.5).font('Helvetica').text('Certified Hub, GSTIN: 33AAACR2938L1Z8\nEmail: support@renewx.in\nWeb: https://renewx.in', 40, startY + 26);

    const customerName = order.customer_info?.name || user?.full_name || 'Valued Customer';
    const customerPhone = order.customer_info?.phone || user?.phone || 'Not provided';
    const customerEmail = user?.email || order.customer_info?.email || '';
    const address = order.customer_info?.address || 'Standard Delivery Address';
    const pincode = order.customer_info?.pincode ? ` - ${order.customer_info.pincode}` : '';

    doc.fillColor('#64748b').fontSize(8).font('Helvetica-Bold').text('BILLED & SHIPPED TO (CUSTOMER)', 320, startY);
    doc.fillColor('#0f172a').fontSize(9.5).font('Helvetica-Bold').text(customerName, 320, startY + 12);
    doc.fillColor('#475569').fontSize(8.5).font('Helvetica').text(`${address}${pincode}\nPhone: ${customerPhone}${customerEmail ? `\nEmail: ${customerEmail}` : ''}`, 320, startY + 26);

    // Table Header
    const tableTop = 195;
    doc.rect(40, tableTop, 515, 20).fill('#f1f5f9');
    doc.fillColor('#334155').fontSize(8.5).font('Helvetica-Bold');
    doc.text('#', 50, tableTop + 5);
    doc.text('ITEM DESCRIPTION & COVERAGE', 80, tableTop + 5);
    doc.text('QTY', 370, tableTop + 5, { width: 35, align: 'center' });
    doc.text('PRICE', 415, tableTop + 5, { width: 60, align: 'right' });
    doc.text('TOTAL', 485, tableTop + 5, { width: 60, align: 'right' });

    let currentY = tableTop + 24;
    const items = (order.order_items && order.order_items.length > 0)
      ? order.order_items
      : [{ product_name: 'Certified RenewX Tech Device', quantity: 1, price: order.subtotal }];

    items.forEach((item: any, idx: number) => {
      const qty = item.quantity || 1;
      const price = item.price || 0;
      const total = qty * price;

      doc.fillColor('#64748b').fontSize(8.5).font('Helvetica').text(String(idx + 1), 50, currentY + 5);
      doc.fillColor('#0f172a').fontSize(9).font('Helvetica-Bold').text(item.product_name || 'Certified RenewX Device', 80, currentY + 5);
      doc.fillColor('#16a34a').fontSize(7.5).font('Helvetica').text('✓ Inspected & Quality Verified Pre-Owned', 80, currentY + 17);

      doc.fillColor('#334155').fontSize(8.5).font('Helvetica').text(String(qty), 370, currentY + 5, { width: 35, align: 'center' });
      doc.text(`₹${Number(price).toLocaleString('en-IN')}`, 415, currentY + 5, { width: 60, align: 'right' });
      doc.fillColor('#0f172a').font('Helvetica-Bold').text(`₹${Number(total).toLocaleString('en-IN')}`, 485, currentY + 5, { width: 60, align: 'right' });

      doc.moveTo(40, currentY + 32).lineTo(555, currentY + 32).strokeColor('#f1f5f9').lineWidth(0.5).stroke();
      currentY += 34;
    });

    // Totals Box
    const totalsY = currentY + 12;
    doc.rect(340, totalsY, 215, 82).fillAndStroke('#f8fafc', '#e2e8f0');
    doc.fillColor('#475569').fontSize(8.5).font('Helvetica');
    doc.text('Subtotal:', 355, totalsY + 8);
    doc.text(`₹${Number(order.subtotal || 0).toLocaleString('en-IN')}`, 450, totalsY + 8, { width: 95, align: 'right' });

    doc.text('Express Shipping:', 355, totalsY + 22);
    doc.text(Number(order.shipping_fee) > 0 ? `₹${Number(order.shipping_fee).toLocaleString('en-IN')}` : 'FREE', 450, totalsY + 22, { width: 95, align: 'right' });

    doc.text('GST / Taxes (18% Incl.):', 355, totalsY + 36);
    doc.text('Included', 450, totalsY + 36, { width: 95, align: 'right' });

    doc.moveTo(340, totalsY + 52).lineTo(555, totalsY + 52).strokeColor('#0f172a').lineWidth(1).stroke();
    doc.fillColor('#0f172a').fontSize(10.5).font('Helvetica-Bold');
    doc.text('Grand Total:', 355, totalsY + 58);
    doc.text(`₹${Number(order.total_amount || order.subtotal || 0).toLocaleString('en-IN')}`, 450, totalsY + 58, { width: 95, align: 'right' });

    // Quality Assurance Box
    const guaranteeY = totalsY + 95;
    doc.rect(40, guaranteeY, 515, 42).fillAndStroke('#ecfdf5', '#a7f3d0');
    doc.fillColor('#065f46').fontSize(9.5).font('Helvetica-Bold').text('🛡️ Inspected & Quality Verified Pre-Owned', 55, guaranteeY + 9);
    doc.fillColor('#047857').fontSize(8).font('Helvetica').text('Passed hardware inspection & functional testing. Keep this tax invoice as proof of purchase.', 55, guaranteeY + 23);

    // Payment details & Footer
    const footerY = guaranteeY + 56;
    doc.fillColor('#64748b').fontSize(8).font('Helvetica');
    if (order.razorpay_payment_id) {
      doc.text(`Payment ID: ${order.razorpay_payment_id} | Paid via Razorpay Secure Gateway`, 40, footerY, { align: 'center' });
    }
    doc.text('This is a computer-generated tax invoice and requires no physical signature.', 40, footerY + 13, { align: 'center' });
    doc.text('RenewX Crew • Circular Economy Electronics • support@renewx.in', 40, footerY + 25, { align: 'center' });

    doc.end();
  } catch (error) {
    next(error);
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
      if (existing.payment_method === 'cod') {
        res.status(200).json({
          success: true,
          data: {
            order: existing,
            is_cod: true,
          },
        });
        return;
      }

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

    const isCod = (req.body as CreateOrderDTO)?.payment_method === 'cod';

    if (isCod) {
      const reserved: { id: string; quantity: number }[] = [];
      try {
        for (const item of orderItems) {
          const product = await ProductModel.findOneAndUpdate(
            { _id: item.product_id, stock: { $gte: item.quantity } },
            { $inc: { stock: -item.quantity } },
            { new: true }
          );

          if (!product) {
            throw httpError('Product became unavailable: ' + item.product_name, 409, 'INSUFFICIENT_STOCK');
          }

          reserved.push({ id: item.product_id, quantity: item.quantity });
        }

        const codOrder = await OrderModel.create({
          user_id: req.user.id,
          subtotal,
          savings,
          status: 'verified',
          payment_status: 'created',
          payment_method: 'cod',
          currency: 'INR',
          checkout_key: checkoutKey,
          courier: '',
          tracking_number: '',
          estimated_delivery: '3-5 Business Days',
          customer_info: {
            name: customer.name.trim(),
            phone: customer.phone,
            address: customer.address.trim(),
            pincode: customer.pincode,
          },
          order_items: orderItems,
        });

        // Dispatch notifications asynchronously in background to ensure instant order placement response (<100ms)
        setImmediate(async () => {
          try {
            await notifyUserEvent({
              action: 'order_placed',
              userId: req.user.id,
              orderId: codOrder.id,
              subtotal: codOrder.subtotal,
              paymentMethod: 'Cash on Delivery',
            });

            await notifyAdminsNewOrder({
              orderId: codOrder.id,
              subtotal: codOrder.subtotal,
              customerName: customer.name.trim(),
              customerPhone: customer.phone,
              customerAddress: customer.address.trim(),
              paymentMethod: 'Cash on Delivery',
              itemCount: orderItems.reduce((acc, it) => acc + it.quantity, 0),
              items: orderItems.map((it) => ({
                name: it.product_name,
                quantity: it.quantity,
                price: it.price,
              })),
            });
          } catch (notifErr) {
            console.error('[Orders] Failed to dispatch background COD notifications:', notifErr);
          }
        });

        res.status(201).json({
          success: true,
          data: {
            order: codOrder,
            is_cod: true,
          },
        });
        return;
      } catch (stockError) {
        if (reserved.length) {
          await Promise.all(
            reserved.map(({ id, quantity }) =>
              ProductModel.updateOne({ _id: id }, { $inc: { stock: quantity } }).exec()
            )
          );
        }
        throw stockError;
      }
    }

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
        if (existing.payment_method === 'cod') {
          res.json({
            success: true,
            data: {
              order: existing,
              is_cod: true,
            },
          });
          return;
        }
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

    let order = null;
    if (order_id && mongoose.Types.ObjectId.isValid(String(order_id))) {
      order = await OrderModel.findById(order_id);
    }
    if (!order && razorpay_order_id) {
      order = await OrderModel.findOne({ razorpay_order_id: String(razorpay_order_id) });
    }
    if (!order && order_id) {
      order = await OrderModel.findOne({
        $or: [
          { razorpay_order_id: String(order_id) },
          { checkout_key: String(order_id) },
        ],
      });
    }

    if (!order) throw httpError('Order not found', 404, 'NOT_FOUND');

    if (order.user_id !== req.user.id && req.user.role !== 'admin') {
      throw httpError('You cannot access this order', 403, 'FORBIDDEN');
    }

    if (order.payment_status === 'paid') {
      res.json({ success: true, data: order, already_processed: true });
      return;
    }

    if (!order.razorpay_order_id && razorpay_order_id) {
      order.razorpay_order_id = razorpay_order_id;
    }

    // A client must never be able to mark an order paid without a complete
    // Razorpay response. The HMAC signature binds the payment to this order.
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      throw httpError('Incomplete payment verification payload', 400, 'INCOMPLETE_PAYMENT_VERIFICATION');
    }

    if (!order.razorpay_order_id || String(order.razorpay_order_id) !== String(razorpay_order_id)) {
      throw httpError('Razorpay order does not match this checkout', 400, 'PAYMENT_ORDER_MISMATCH');
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

    // Verify the gateway state before mutating inventory or marking the order paid.
    // A temporary Razorpay/API failure must leave the order recoverable, not falsely paid.
    const payment: any = await fetchRazorpayPayment(razorpay_payment_id);
    if (!payment) {
      throw httpError('Payment could not be verified with Razorpay', 502, 'PAYMENT_VERIFICATION_UNAVAILABLE');
    }

    if (payment.order_id && String(payment.order_id) !== String(order.razorpay_order_id)) {
      throw httpError('Payment does not belong to this Razorpay order', 400, 'PAYMENT_ORDER_MISMATCH');
    }

    if (payment.amount !== undefined && Number(payment.amount) !== Math.round(order.subtotal * 100)) {
      throw httpError('Payment amount does not match the order total', 400, 'PAYMENT_AMOUNT_MISMATCH');
    }

    if (payment.status === 'authorized') {
      const captured: any = await captureRazorpayPayment(
        razorpay_payment_id,
        Math.round(order.subtotal * 100),
      );
      if (captured?.status) payment.status = captured.status;
    }

    if (payment.status !== 'captured') {
      if (payment.status === 'failed') {
        await OrderModel.findByIdAndUpdate(order._id, {
          payment_status: 'failed',
          razorpay_payment_id,
        }).exec();
        throw httpError('Payment failed on payment gateway.', 400, 'PAYMENT_FAILED');
      }
      throw httpError(
        'Payment is not captured yet. Please wait a moment and try again.',
        409,
        'PAYMENT_NOT_CAPTURED',
      );
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

async function finalizePaidOrder(order: any, paymentId: string): Promise<any> {
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
        throw httpError('Product became unavailable: ' + item.product_name, 409, 'INSUFFICIENT_STOCK');
      }

      reserved.push({ id: item.product_id, quantity: item.quantity });
    }

    order.payment_status = 'paid';
    order.razorpay_payment_id = paymentId;
    order.payment_verified_at = new Date();
    order.status = 'verified';
    // Courier, tracking number and ETA are assigned by admin after dispatch.
    await order.save();

    // Dispatch payment & order notifications asynchronously in background
    setImmediate(async () => {
      try {
        await notifyUserEvent({
          action: 'payment_successful',
          userId: order.user_id,
          orderId: order.id,
          subtotal: order.subtotal,
        });
        await notifyUserEvent({
          action: 'order_placed',
          userId: order.user_id,
          orderId: order.id,
          subtotal: order.subtotal,
          paymentMethod: 'Razorpay',
        });

        await notifyAdminsNewOrder({
          orderId: order.id,
          subtotal: order.subtotal,
          customerName: order.customer_info?.name || 'Customer',
          customerPhone: order.customer_info?.phone || '',
          customerAddress: order.customer_info?.address || '',
          paymentMethod: 'Razorpay (Paid)',
          itemCount: order.order_items?.reduce((acc: number, it: any) => acc + it.quantity, 0) || 1,
          items: order.order_items?.map((it: any) => ({
            name: it.product_name,
            quantity: it.quantity,
            price: it.price,
          })) || [],
        });
      } catch (notifErr) {
        console.error('[Orders] Failed to dispatch background payment notifications:', notifErr);
      }
    });

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
      await notifyUserEvent({
        action: 'refund_update',
        userId: order.user_id,
        orderId: order.id,
        amount: order.subtotal,
        status: 'completed',
      });
    } catch (refundError) {
      console.error('[Payments] Refund failed after stock conflict:', refundError);
      order.payment_status = 'refund_pending';
      await notifyUserEvent({
        action: 'refund_update',
        userId: order.user_id,
        orderId: order.id,
        amount: order.subtotal,
        status: 'pending',
      });
    }

    order.razorpay_payment_id = paymentId;
    order.status = 'cancelled';
    await order.save();

    await notifyUserEvent({
      action: 'order_cancelled',
      userId: order.user_id,
      orderId: order.id,
      reason: 'Items became unavailable',
    });

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
    const { status, courier, courier_phone, tracking_number, estimated_delivery, refund, payment_status } = req.body;

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

    // Support admin initiating refund during cancellation or directly
    if (refund && order.payment_status === 'paid' && order.razorpay_payment_id) {
      try {
        await refundRazorpayPayment(order.razorpay_payment_id, order.subtotal * 100);
        order.payment_status = 'refunded';
        if (order.user_id) {
          await notifyUserEvent({
            action: 'refund_update',
            userId: order.user_id,
            orderId: order.id,
            amount: order.subtotal,
            status: 'completed',
          });
        }
      } catch (refundErr) {
        order.payment_status = 'refund_pending';
        if (order.user_id) {
          await notifyUserEvent({
            action: 'refund_update',
            userId: order.user_id,
            orderId: order.id,
            amount: order.subtotal,
            status: 'pending',
          });
        }
      }
    } else if (payment_status && payment_status !== order.payment_status) {
      order.payment_status = payment_status;
      if ((payment_status === 'refunded' || payment_status === 'refund_pending') && order.user_id) {
        await notifyUserEvent({
          action: 'refund_update',
          userId: order.user_id,
          orderId: order.id,
          amount: order.subtotal,
          status: payment_status === 'refunded' ? 'completed' : 'pending',
        });
      }
    }

    if (status === 'cancelled' && order.payment_status === 'paid' && !refund) {
      res.status(409).json({
        success: false,
        error: { message: 'Paid orders require the refund flow before cancellation', code: 'REFUND_REQUIRED' },
      });
      return;
    }

    const previousStatus = order.status;
    const previousTracking = order.tracking_number;

    if (status) order.status = status;
    if (courier !== undefined) order.courier = String(courier).trim();
    if (courier_phone !== undefined) {
      const cleanPhone = String(courier_phone).trim();
      if (cleanPhone && !/^[0-9+()\-\s]{7,20}$/.test(cleanPhone)) {
        res.status(400).json({ success: false, error: { message: 'Invalid courier mobile number', code: 'INVALID_COURIER_PHONE' } });
        return;
      }
      order.courier_phone = cleanPhone;
    }
    if (tracking_number !== undefined) order.tracking_number = String(tracking_number).trim();
    if (estimated_delivery !== undefined) order.estimated_delivery = String(estimated_delivery).trim();

    await order.save();

    const statusChanged = Boolean(status && status !== previousStatus);
    const trackingChanged = Boolean(tracking_number !== undefined && tracking_number !== previousTracking);

    if (order.user_id && (statusChanged || trackingChanged)) {
      if (order.status === 'shipped') {
        await notifyUserEvent({
          action: 'order_shipped',
          userId: order.user_id,
          orderId: order.id,
          courier: order.courier,
          trackingNumber: order.tracking_number,
        });
      } else if (order.status === 'out_for_delivery') {
        await notifyUserEvent({
          action: 'out_for_delivery',
          userId: order.user_id,
          orderId: order.id,
          courier: order.courier,
        });
      } else if (order.status === 'delivered') {
        await notifyUserEvent({
          action: 'order_delivered',
          userId: order.user_id,
          orderId: order.id,
        });
      } else if (order.status === 'cancelled') {
        await notifyUserEvent({
          action: 'order_cancelled',
          userId: order.user_id,
          orderId: order.id,
        });
      } else if (statusChanged) {
        await notifyUserEvent({
          action: 'order_status_changed',
          userId: order.user_id,
          orderId: order.id,
          status: order.status,
          courier: order.courier,
          trackingNumber: order.tracking_number,
        });
      }
    }

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

export async function deleteOrder(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user || req.user.role !== 'admin') {
      res.status(403).json({ success: false, error: { message: 'Admin access required', code: 'FORBIDDEN' } });
      return;
    }

    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, error: { message: 'Invalid order ID', code: 'INVALID_ID' } });
      return;
    }

    const deletedOrder = await OrderModel.findByIdAndDelete(id);
    if (!deletedOrder) {
      res.status(404).json({ success: false, error: { message: 'Order not found', code: 'NOT_FOUND' } });
      return;
    }

    // Clean up any notifications referencing this deleted order
    await NotificationModel.deleteMany({ reference_id: id, reference_type: 'order' }).catch(() => {});

    res.json({ success: true, message: 'Order deleted successfully' });
  } catch (err) {
    next(err);
  }
}
