import { Request, Response, NextFunction } from 'express';
import {
  TradeInValuationRequest,
  TradeInPickupRequest,
  calculateInstantQuote,
  TradeInModel,
} from '../models/TradeIn';
import { AuthenticatedRequest } from '../middleware/auth';
import { createUserNotification, notifyUserEvent, notifyAdminsNewTradeIn } from '../services/notificationService';
import { User } from '../models/User';
import { DeviceModelModel } from '../models/DeviceModel';
import { BrandModel } from '../models/Brand';
import { invalidateCachePrefix } from '../utils/cache';

export async function getValuationQuote(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const payload: TradeInValuationRequest = req.body;

    if (!payload.category || !payload.model) {
      res.status(400).json({ success: false, error: { message: 'Category and model are required for valuation' } });
      return;
    }

    const quote = calculateInstantQuote(payload);
    res.json({ success: true, data: quote });
  } catch (err) {
    next(err);
  }
}

export async function createPickupRequest(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const rawBody: any = req.body || {};
    const payload: TradeInPickupRequest = rawBody;

    if (!req.user) {
      res.status(401).json({ success: false, error: { message: 'Authentication required. Please sign in to submit a sell request.', code: 'UNAUTHORIZED' } });
      return;
    }

    const customerName = (
      payload.customerName ||
      rawBody.name ||
      rawBody.fullName ||
      req.user.full_name ||
      (req.user as any).name ||
      'Customer'
    ).trim();

    const customerPhone = (
      payload.customerPhone ||
      rawBody.phone ||
      rawBody.mobileNumber ||
      req.user.phone ||
      ''
    ).trim();

    const address = (
      payload.address ||
      rawBody.pickupAddress ||
      req.user.address ||
      ''
    ).trim();

    const pincode = (
      payload.pincode ||
      rawBody.zipcode ||
      rawBody.zip ||
      address.match(/\b\d{6}\b/)?.[0] ||
      req.user.pincode ||
      '600001'
    ).toString().trim();

    const category = (payload.category || rawBody.categoryParam || 'Smartphone').trim();
    const brand = (payload.brand || rawBody.selectedBrandName || 'General').trim();
    const model = (payload.model || rawBody.selectedModel || 'Device').trim();
    const storage = (payload.storage || 'Standard').trim();

    if (!customerPhone && !address) {
      res.status(400).json({
        success: false,
        error: { message: 'Customer phone number and pickup address are required.' },
      });
      return;
    }

    const candidates: string[] = [];
    if (Array.isArray(payload.photos)) {
      candidates.push(...payload.photos);
    }
    const cond = (payload.condition || {}) as Record<string, any>;
    if (Array.isArray(cond.photos)) {
      candidates.push(...cond.photos);
    } else if (cond.photos && typeof cond.photos === 'object') {
      Object.values(cond.photos).forEach((val) => {
        if (typeof val === 'string' && val.trim()) candidates.push(val);
      });
    }
    if (cond.photoMap && typeof cond.photoMap === 'object') {
      Object.values(cond.photoMap).forEach((val) => {
        if (typeof val === 'string' && val.trim()) candidates.push(val);
      });
    }
    ['front', 'back', 'edges', 'side', 'bill', 'billBox', 'photo', 'device_image'].forEach((k) => {
      if (typeof cond[k] === 'string' && cond[k].trim()) candidates.push(cond[k]);
    });
    if (Array.isArray((payload as any).images)) {
      candidates.push(...(payload as any).images);
    }

    const photosList = Array.from(
      new Set(candidates.filter((p: any) => typeof p === 'string' && p.trim().length > 0))
    );

    // Provide default transparent cutout image if client did not supply photos
    if (photosList.length === 0) {
      photosList.push('https://pngimg.com/uploads/iphone_12/iphone_12_PNG36.png');
    }

    const quoteAmount = Number(
      payload.expectedSellingPrice ||
      rawBody.expectedPrice ||
      rawBody.quotedPrice ||
      payload.valuationAmount ||
      0
    );

    // Auto-register model in catalog database if not already present
    if (model && brand) {
      try {
        const cleanModelName = model.trim();
        const existingModel = await DeviceModelModel.findOne({
          name: new RegExp(`^${cleanModelName}$`, 'i'),
        });
        if (!existingModel) {
          const brandDoc = await BrandModel.findOne({
            name: new RegExp(`^${brand.trim()}$`, 'i'),
          });
          await DeviceModelModel.create({
            brand_id: brandDoc ? brandDoc.id : brand.toLowerCase().replace(/[^a-z0-9]/g, '-'),
            brand_name: brandDoc ? brandDoc.name : brand,
            name: cleanModelName,
            category: category.toLowerCase() || 'smartphones',
            release_year: new Date().getFullYear(),
            storage_options: storage
              ? Array.from(new Set(['64GB', storage.replace(/\s+/g, ''), '128GB', '256GB']))
              : ['64GB', '128GB', '256GB', '512GB'],
            image_url: photosList[0] || '',
          });
          invalidateCachePrefix('models');
          invalidateCachePrefix('brand_models');
        }
      } catch (err) {
        console.warn('[TradeInController] Auto-add model error:', err);
      }
    }

    const newRequest = await TradeInModel.create({
      user_id: req.user.id,
      category,
      brand,
      model,
      storage,
      valuation_amount: quoteAmount,
      expected_price: quoteAmount,
      customer_name: customerName,
      customer_phone: customerPhone,
      customer_email: payload.customerEmail || rawBody.email || req.user.email || '',
      pincode,
      address,
      photos: photosList,
      status: 'pending',
      condition: {
        ...(payload.condition || {}),
        photos: photosList,
      },
    });

    await notifyUserEvent({
      action: 'trade_in_submitted',
      userId: req.user.id,
      tradeInId: newRequest.id,
      brand: newRequest.brand,
      model: newRequest.model,
      valuation: newRequest.valuation_amount,
    });

    await notifyAdminsNewTradeIn({
      tradeInId: newRequest.id,
      customerName: newRequest.customer_name || req.user.full_name || 'Customer',
      customerEmail: newRequest.customer_email || req.user.email,
      customerPhone: newRequest.customer_phone,
      brand: newRequest.brand,
      model: newRequest.model,
      valuation: newRequest.valuation_amount,
      pickupAddress: newRequest.address,
    });

    res.status(201).json({
      success: true,
      message: 'Sell request submitted successfully and is awaiting admin approval',
      data: {
        ...newRequest.toJSON(),
        id: (newRequest._id || newRequest.id).toString(),
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function getTradeInRequests(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { status, user_id, page: rawPage, limit: rawLimit } = req.query;

    const filter: Record<string, any> = {};
    if (status && typeof status === 'string') filter.status = status;
    if (user_id && typeof user_id === 'string') filter.user_id = user_id;

    const page = Number(rawPage) > 0 ? Number(rawPage) : 1;
    const limit = Number(rawLimit) > 0 ? Math.min(Number(rawLimit), 100) : 25;

    const [list, total] = await Promise.all([
      TradeInModel.find(filter)
        .sort({ created_at: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      TradeInModel.countDocuments(filter),
    ]);

    const normalized = list.map(({ _id, ...item }: any) => ({
      ...item,
      id: _id ? _id.toString() : item.id,
    }));

    res.json({
      success: true,
      count: normalized.length,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      data: normalized,
    });
  } catch (err) {
    next(err);
  }
}

export async function getMyTradeInRequests(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: { message: 'Authentication required', code: 'UNAUTHORIZED' } });
      return;
    }

    const { page: rawPage, limit: rawLimit } = req.query;
    const page = Number(rawPage) > 0 ? Number(rawPage) : 1;
    const limit = Number(rawLimit) > 0 ? Math.min(Number(rawLimit), 50) : 25;

    const filter = { user_id: req.user.id };
    const [list, total] = await Promise.all([
      TradeInModel.find(filter)
        .sort({ created_at: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      TradeInModel.countDocuments(filter),
    ]);

    const normalized = list.map(({ _id, ...item }: any) => ({
      ...item,
      id: _id ? _id.toString() : item.id,
    }));

    res.json({
      success: true,
      count: normalized.length,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      data: normalized,
    });
  } catch (err) {
    next(err);
  }
}

export async function updateTradeInStatus(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const { status, approvedAmount, adminNote } = req.body as {
      status?: string;
      approvedAmount?: number;
      adminNote?: string;
    };

    const allowedStatuses = ['pending', 'approved', 'rejected', 'scheduled', 'picked_up', 'inspected', 'completed', 'cancelled'];
    if (!status || !allowedStatuses.includes(status)) {
      res.status(400).json({
        success: false,
        error: { message: `Invalid trade-in status. Allowed: ${allowedStatuses.join(', ')}` },
      });
      return;
    }

    const request = await TradeInModel.findById(id);
    if (!request) {
      res.status(404).json({ success: false, error: { message: 'Trade-in request not found', code: 'NOT_FOUND' } });
      return;
    }

    // Decision can be corrected between approved/rejected. Once pickup starts,
    // the request becomes forward-only and cannot be returned to a decision state.
    const decisionStatuses = new Set(['pending', 'approved', 'rejected']);
    const lifecycleAfterApproval = new Set(['scheduled', 'picked_up', 'inspected', 'completed', 'cancelled']);
    const canTransition =
      (request.status === 'pending' && (status === 'approved' || status === 'rejected')) ||
      ((request.status === 'approved' || request.status === 'rejected') &&
        (status === 'approved' || status === 'rejected' || status === 'scheduled')) ||
      (!decisionStatuses.has(request.status) && lifecycleAfterApproval.has(status));

    if (!canTransition && request.status !== status) {
      res.status(409).json({
        success: false,
        error: { message: `Cannot change sell request from ${request.status} to ${status}.`, code: 'INVALID_TRANSITION' },
      });
      return;
    }

    const previousStatus = request.status;
    const previousValuation = request.valuation_amount;
    request.status = status;
    let valuationChanged = false;
    if (approvedAmount !== undefined && Number.isFinite(Number(approvedAmount))) {
      const newAmount = Number(approvedAmount);
      if (newAmount !== previousValuation) {
        valuationChanged = true;
      }
      request.valuation_amount = newAmount;
    }
    if (adminNote !== undefined) {
      (request as any).admin_note = String(adminNote).trim();
    }
    await request.save();

    if (request.user_id) {
      if (valuationChanged) {
        await notifyUserEvent({
          action: 'trade_in_valuation_changed',
          userId: request.user_id,
          tradeInId: request.id,
          brand: request.brand,
          model: request.model,
          amount: request.valuation_amount,
        });
      }

      if (previousStatus !== status) {
        if (status === 'scheduled') {
          await notifyUserEvent({
            action: 'pickup_scheduled',
            userId: request.user_id,
            tradeInId: request.id,
            brand: request.brand,
            model: request.model,
          });
        } else if (status === 'picked_up') {
          await notifyUserEvent({
            action: 'pickup_completed',
            userId: request.user_id,
            tradeInId: request.id,
            brand: request.brand,
            model: request.model,
          });
        } else {
          await notifyUserEvent({
            action: 'trade_in_status_changed',
            userId: request.user_id,
            tradeInId: request.id,
            brand: request.brand,
            model: request.model,
            status,
          });
        }
      }
    }

    res.json({ success: true, message: 'Trade-in status updated', data: request });
  } catch (err) {
    next(err);
  }
}

export async function cancelMyTradeInRequest(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: { message: 'Authentication required', code: 'UNAUTHORIZED' } });
      return;
    }

    const { id } = req.params;
    const { reason } = req.body;

    const request = await TradeInModel.findById(id);
    if (!request) {
      res.status(404).json({ success: false, error: { message: 'Sell request not found', code: 'NOT_FOUND' } });
      return;
    }

    // Only owner of the request or admin can cancel
    if (request.user_id && request.user_id !== req.user.id && req.user.role !== 'admin') {
      res.status(403).json({ success: false, error: { message: 'Not authorized to cancel this request', code: 'FORBIDDEN' } });
      return;
    }

    if (request.status === 'cancelled') {
      res.json({ success: true, message: 'Sell request is already cancelled', data: request });
      return;
    }

    if (request.status === 'completed') {
      res.status(400).json({ success: false, error: { message: 'Completed sell requests cannot be cancelled' } });
      return;
    }

    // Once a sell request is approved by admin (or progressed beyond pending), seller cannot cancel it
    if (req.user.role !== 'admin' && request.status !== 'pending') {
      res.status(400).json({
        success: false,
        error: {
          message: 'This sell request has already been approved by an admin and cannot be cancelled.',
          code: 'CANNOT_CANCEL_APPROVED',
        },
      });
      return;
    }

    request.status = 'cancelled';
    const note = reason ? `Cancelled: ${String(reason).trim()}` : 'Cancelled by customer';
    (request as any).admin_note = [(request as any).admin_note, note].filter(Boolean).join(' | ');

    await request.save();

    if (request.user_id) {
      await notifyUserEvent({
        action: 'trade_in_status_changed',
        userId: request.user_id,
        tradeInId: request.id,
        brand: request.brand,
        model: request.model,
        status: 'cancelled',
      });
    }

    res.json({ success: true, message: 'Sell request cancelled successfully', data: request });
  } catch (err) {
    next(err);
  }
}

