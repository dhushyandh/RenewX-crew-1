import { Request, Response, NextFunction } from 'express';
import {
  TradeInValuationRequest,
  TradeInPickupRequest,
  calculateInstantQuote,
  TradeInModel,
} from '../models/TradeIn';
import { AuthenticatedRequest } from '../middleware/auth';
import { createUserNotification } from '../services/notificationService';
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

    const newRequest = await TradeInModel.create({
      user_id: req.user.id,
      category: payload.category,
      brand: payload.brand,
      model: payload.model,
      storage: payload.storage,
      valuation_amount: Number(payload.valuationAmount || 0),
      customer_name: payload.customerName,
      customer_phone: payload.customerPhone,
      pincode: payload.pincode,
      address: payload.address || '',
      status: 'pending',
      condition: payload.condition || {},
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
    request.status = status;
    if (approvedAmount !== undefined && Number.isFinite(Number(approvedAmount))) {
      request.valuation_amount = Number(approvedAmount);
    }
    if (adminNote !== undefined) {
      (request as any).admin_note = String(adminNote).trim();
    }
    await request.save();

    if (request.user_id && previousStatus !== status) {
      const targetUser = await User.findById(request.user_id).select('notification_preferences');
      const shouldNotify = targetUser?.notification_preferences?.sell_request_updates ?? true;
      if (!shouldNotify) {
        res.json({ success: true, message: 'Trade-in status updated', data: request });
        return;
      }
      const title =
        status === 'approved' ? 'Sell request approved' :
        status === 'rejected' ? 'Sell request rejected' :
        'Sell request updated';
      const body =
        status === 'approved'
          ? `Your ${request.brand} ${request.model} sell request was approved.`
          : status === 'rejected'
          ? `Your ${request.brand} ${request.model} sell request was rejected.`
          : `Your ${request.brand} ${request.model} sell request is now ${status.replace(/_/g, ' ')}.`;

      await createUserNotification(request.user_id, {
        type: 'trade_in',
        title,
        body,
        reference_id: request.id,
        reference_type: 'trade_in',
        data: { screen: 'Notifications', tradeInId: request.id },
      });
    }

    res.json({ success: true, message: 'Trade-in status updated', data: request });
  } catch (err) {
    next(err);
  }
}
