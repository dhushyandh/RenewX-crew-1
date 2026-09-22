import { Request, Response, NextFunction } from 'express';
import {
  TradeInValuationRequest,
  TradeInPickupRequest,
  calculateInstantQuote,
  TradeInModel,
} from '../models/TradeIn';
import { AuthenticatedRequest } from '../middleware/auth';
import { createUserNotification, notifyUserEvent } from '../services/notificationService';
import { User } from '../models/User';

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
    const payload: TradeInPickupRequest = req.body;

    if (!req.user) {
      res.status(401).json({ success: false, error: { message: 'Authentication required', code: 'UNAUTHORIZED' } });
      return;
    }

    if (!payload.customerName || !payload.customerPhone || !payload.pincode || !payload.category || !payload.model) {
      res.status(400).json({
        success: false,
        error: { message: 'Customer name, phone number, and pickup pincode are required' },
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

    const newRequest = await TradeInModel.create({
      user_id: req.user.id,
      category: payload.category,
      brand: payload.brand,
      model: payload.model,
      storage: payload.storage,
      valuation_amount: Number(payload.valuationAmount || 0),
      expected_price: Number(payload.expectedSellingPrice || payload.valuationAmount || 0),
      customer_name: payload.customerName,
      customer_phone: payload.customerPhone,
      customer_email: payload.customerEmail || req.user.email || '',
      pincode: payload.pincode,
      address: payload.address || '',
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

    res.status(201).json({
      success: true,
      message: 'Sell request submitted successfully and is awaiting admin approval',
      data: newRequest,
    });
  } catch (err) {
    next(err);
  }
}

export async function getTradeInRequests(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { status, user_id } = req.query;

    const filter: Record<string, any> = {};
    if (status && typeof status === 'string') filter.status = status;
    if (user_id && typeof user_id === 'string') filter.user_id = user_id;

    const list = await TradeInModel.find(filter).sort({ created_at: -1 });

    res.json({ success: true, count: list.length, data: list });
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

    const list = await TradeInModel.find({ user_id: req.user.id }).sort({ created_at: -1 });
    res.json({ success: true, count: list.length, data: list });
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
