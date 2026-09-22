import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { NotificationModel } from '../models/Notification';
import { User } from '../models/User';

export async function getNotifications(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: { message: 'Authentication required', code: 'UNAUTHORIZED' } });
      return;
    }

    const list = await NotificationModel.find({ user_id: req.user.id })
      .sort({ created_at: -1 })
      .limit(100);

    const unreadCount = list.filter((item) => !item.read_at).length;
    res.json({ success: true, count: list.length, unreadCount, data: list });
  } catch (err) {
    next(err);
  }
}

export async function markNotificationRead(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: { message: 'Authentication required', code: 'UNAUTHORIZED' } });
      return;
    }

    const notification = await NotificationModel.findOneAndUpdate(
      { _id: req.params.id, user_id: req.user.id },
      { $set: { read_at: new Date() } },
      { new: true }
    );

    if (!notification) {
      res.status(404).json({ success: false, error: { message: 'Notification not found', code: 'NOT_FOUND' } });
      return;
    }

    res.json({ success: true, data: notification });
  } catch (err) {
    next(err);
  }
}

export async function markAllNotificationsRead(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: { message: 'Authentication required', code: 'UNAUTHORIZED' } });
      return;
    }

    await NotificationModel.updateMany(
      { user_id: req.user.id, read_at: null },
      { $set: { read_at: new Date() } }
    );

    res.json({ success: true, message: 'Notifications marked as read' });
  } catch (err) {
    next(err);
  }
}


import { isExpoPushToken } from '../services/notificationService';

function validatePushToken(value: unknown): string | null {
  if (isExpoPushToken(value)) {
    return (value as string).trim();
  }
  return null;
}

export async function registerPushToken(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: { message: 'Authentication required', code: 'UNAUTHORIZED' } });
      return;
    }

    const rawToken = req.body?.token ?? req.body?.pushToken ?? req.body?.push_token;
    const token = validatePushToken(rawToken);
    if (!token) {
      console.warn(`[PushToken] 400 Rejected registration for user ${req.user.id}. Payload:`, req.body);
      res.status(400).json({
        success: false,
        error: {
          message: 'A valid Expo push token is required',
          code: 'INVALID_PUSH_TOKEN',
          received: typeof rawToken === 'string' ? `${rawToken.slice(0, 30)}...` : null,
        },
      });
      return;
    }

    // A physical device token should belong to only one signed-in account.
    await User.updateMany(
      { _id: { $ne: req.user.id }, push_tokens: token },
      { $pull: { push_tokens: token } }
    ).exec();

    await User.findByIdAndUpdate(
      req.user.id,
      { $addToSet: { push_tokens: token } },
      { new: false }
    ).exec();

    console.log(`[PushToken] Successfully registered push token for user ${req.user.id}: ${token.slice(0, 25)}...`);
    res.json({ success: true, message: 'Push token registered' });
  } catch (err) {
    next(err);
  }
}

export async function unregisterPushToken(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: { message: 'Authentication required', code: 'UNAUTHORIZED' } });
      return;
    }

    const rawToken = req.body?.token ?? req.body?.pushToken ?? req.body?.push_token;
    const token = validatePushToken(rawToken);
    if (!token) {
      res.status(400).json({ success: false, error: { message: 'A valid Expo push token is required', code: 'INVALID_PUSH_TOKEN' } });
      return;
    }

    await User.findByIdAndUpdate(req.user.id, { $pull: { push_tokens: token } }).exec();
    console.log(`[PushToken] Removed push token for user ${req.user.id}`);
    res.json({ success: true, message: 'Push token removed' });
  } catch (err) {
    next(err);
  }
}

export async function triggerTestNotification(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { action = 'out_for_delivery' } = req.body || {};
    const orderId = 'RNX' + Date.now().toString().slice(-6);

    if (action === 'new_arrival') {
      const { broadcastNewProductArrival } = await import('../services/notificationService');
      await broadcastNewProductArrival({
        id: 'sample-' + Date.now().toString().slice(-4),
        name: 'iPhone 15 Pro Max 256GB',
        brand: 'Apple',
        price: 89999,
      });
      res.json({ success: true, message: "New arrival notification broadcasted to all users" });
      return;
    }

    let targetUserId = req.user?.id;
    if (!targetUserId) {
      const firstUser = await User.findOne({}).select('_id');
      targetUserId = firstUser ? firstUser._id.toString() : '';
    }

    if (!targetUserId) {
      res.status(401).json({ success: false, error: { message: 'Authentication or registered user required', code: 'UNAUTHORIZED' } });
      return;
    }

    let event: any;
    if (action === 'order_placed') {
      event = { action: 'order_placed', userId: targetUserId, orderId, subtotal: 34999, paymentMethod: 'Cash on Delivery' };
    } else if (action === 'payment_successful') {
      event = { action: 'payment_successful', userId: targetUserId, orderId, subtotal: 34999 };
    } else if (action === 'order_shipped') {
      event = { action: 'order_shipped', userId: targetUserId, orderId, courier: 'BlueDart Express', trackingNumber: 'RNX829104812' };
    } else if (action === 'out_for_delivery') {
      event = { action: 'out_for_delivery', userId: targetUserId, orderId };
    } else if (action === 'order_delivered') {
      event = { action: 'order_delivered', userId: targetUserId, orderId };
    } else if (action === 'order_cancelled') {
      event = { action: 'order_cancelled', userId: targetUserId, orderId, reason: 'Customer request' };
    } else if (action === 'refund_update') {
      event = { action: 'refund_update', userId: targetUserId, orderId, amount: 34999, status: 'completed' };
    } else if (action === 'trade_in_submitted') {
      event = { action: 'trade_in_submitted', userId: targetUserId, tradeInId: orderId, brand: 'Apple', model: 'iPhone 13 Pro', valuation: 38500 };
    } else if (action === 'trade_in_status_changed') {
      event = { action: 'trade_in_status_changed', userId: targetUserId, tradeInId: orderId, brand: 'Apple', model: 'iPhone 13 Pro', status: 'approved' };
    } else if (action === 'trade_in_valuation_changed') {
      event = { action: 'trade_in_valuation_changed', userId: targetUserId, tradeInId: orderId, brand: 'Apple', model: 'iPhone 13 Pro', amount: 39500 };
    } else if (action === 'pickup_scheduled') {
      event = { action: 'pickup_scheduled', userId: targetUserId, tradeInId: orderId, brand: 'Apple', model: 'iPhone 13 Pro' };
    } else if (action === 'pickup_completed') {
      event = { action: 'pickup_completed', userId: targetUserId, tradeInId: orderId, brand: 'Apple', model: 'iPhone 13 Pro' };
    } else if (action === 'account_security_update') {
      event = { action: 'account_security_update', userId: targetUserId, title: 'Account/security update', message: 'Your account password was successfully updated.' };
    } else {
      event = { action: 'order_status_changed', userId: targetUserId, orderId, status: 'processing' };
    }

    const { notifyUserEvent } = await import('../services/notificationService');
    await notifyUserEvent(event);

    res.json({ success: true, message: `Notification '${event.action}' dispatched`, event });
  } catch (err) {
    next(err);
  }
}
