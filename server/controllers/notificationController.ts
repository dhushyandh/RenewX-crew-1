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


function validatePushToken(value: unknown): string | null {
  const token = typeof value === 'string' ? value.trim() : '';
  if (!token || token.length > 256 || !/^(Expo(nent)?PushToken)\[[A-Za-z0-9_-]+\]$/.test(token)) {
    return null;
  }
  return token;
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

    const token = validatePushToken(req.body?.token);
    if (!token) {
      res.status(400).json({ success: false, error: { message: 'A valid Expo push token is required', code: 'INVALID_PUSH_TOKEN' } });
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

    const token = validatePushToken(req.body?.token);
    if (!token) {
      res.status(400).json({ success: false, error: { message: 'A valid Expo push token is required', code: 'INVALID_PUSH_TOKEN' } });
      return;
    }

    await User.findByIdAndUpdate(req.user.id, { $pull: { push_tokens: token } }).exec();
    res.json({ success: true, message: 'Push token removed' });
  } catch (err) {
    next(err);
  }
}
