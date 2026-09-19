import { Request, Response, NextFunction } from 'express';
import {
  TradeInValuationRequest,
  TradeInPickupRequest,
  calculateInstantQuote,
  TradeInModel,
} from '../models/TradeIn';

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

export async function createPickupRequest(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const payload: TradeInPickupRequest = req.body;

    if (!payload.customerName || !payload.customerPhone || !payload.pincode) {
      res.status(400).json({
        success: false,
        error: { message: 'Customer name, phone number, and pickup pincode are required' },
      });
      return;
    }

    const newRequest = await TradeInModel.create({
      user_id: payload.userId || null,
      category: payload.category,
      brand: payload.brand,
      model: payload.model,
      storage: payload.storage,
      valuation_amount: payload.valuationAmount,
      customer_name: payload.customerName,
      customer_phone: payload.customerPhone,
      pincode: payload.pincode,
      address: payload.address || '',
      status: 'scheduled',
    });

    res.status(201).json({
      success: true,
      message: 'Pickup request scheduled successfully',
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
