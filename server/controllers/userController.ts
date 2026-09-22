import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { User } from '../models/User';
import { env } from '../config/env';
import { AuthenticatedRequest } from '../middleware/auth';
import { notifyUserEvent } from '../services/notificationService';

export async function getUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { role, search } = req.query;

    const filter: Record<string, any> = {};

    if (role && typeof role === 'string') {
      filter.role = role;
    }

    if (search && typeof search === 'string' && search.trim()) {
      filter.email = new RegExp(search.trim(), 'i');
    }

    const users = await User.find(filter).sort({ created_at: -1 });

    res.json({ success: true, count: users.length, data: users });
  } catch (err) {
    next(err);
  }
}

export async function updateUserRole(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!role || !['admin', 'customer'].includes(role)) {
      res.status(400).json({ success: false, error: { message: "Role must be 'admin' or 'customer'" } });
      return;
    }

    let targetUser = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
      targetUser = await User.findById(id);
    }

    if (!targetUser) {
      res.status(404).json({ success: false, error: { message: 'User not found' } });
      return;
    }

    // Safety check: protect primary admin from demotion
    if (targetUser.email.toLowerCase() === env.ADMIN_EMAIL.toLowerCase() && role !== 'admin') {
      res.status(400).json({
        success: false,
        error: { message: 'Primary administrator role cannot be demoted.', code: 'PROTECTED_USER' },
      });
      return;
    }

    targetUser.role = role;
    await targetUser.save();

    await notifyUserEvent({
      action: 'account_security_update',
      userId: targetUser.id,
      title: 'Account/security update',
      message: `Your account role has been updated to ${role}.`,
    });

    res.json({ success: true, data: targetUser });
  } catch (err) {
    next(err);
  }
}

export async function deleteUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;

    let targetUser = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
      targetUser = await User.findById(id);
    }

    if (!targetUser) {
      res.status(404).json({ success: false, error: { message: 'User not found' } });
      return;
    }

    // Safety check: protect primary admin from deletion
    if (targetUser.email.toLowerCase() === env.ADMIN_EMAIL.toLowerCase()) {
      res.status(400).json({
        success: false,
        error: { message: 'Primary administrator account cannot be deleted.', code: 'PROTECTED_USER' },
      });
      return;
    }

    await User.findByIdAndDelete(targetUser._id);
    res.json({ success: true, message: 'User deleted successfully', data: { id: targetUser._id } });
  } catch (err) {
    next(err);
  }
}


export async function getMyNotificationPreferences(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: { message: 'Authentication required', code: 'UNAUTHORIZED' } });
      return;
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      res.status(404).json({ success: false, error: { message: 'User not found', code: 'NOT_FOUND' } });
      return;
    }

    res.json({
      success: true,
      data: {
        order_updates: user.notification_preferences?.order_updates ?? true,
        sell_request_updates: user.notification_preferences?.sell_request_updates ?? true,
        marketing: user.notification_preferences?.marketing ?? false,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function updateMyNotificationPreferences(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: { message: 'Authentication required', code: 'UNAUTHORIZED' } });
      return;
    }

    const allowed = ['order_updates', 'sell_request_updates', 'marketing'] as const;
    const updates: Record<string, boolean> = {};

    for (const key of allowed) {
      if (req.body?.[key] !== undefined) {
        if (typeof req.body[key] !== 'boolean') {
          res.status(400).json({ success: false, error: { message: `${key} must be a boolean`, code: 'VALIDATION_ERROR' } });
          return;
        }
        updates[`notification_preferences.${key}`] = req.body[key];
      }
    }

    if (!Object.keys(updates).length) {
      res.status(400).json({ success: false, error: { message: 'At least one preference is required', code: 'VALIDATION_ERROR' } });
      return;
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: updates },
      { new: true }
    );

    if (!user) {
      res.status(404).json({ success: false, error: { message: 'User not found', code: 'NOT_FOUND' } });
      return;
    }

    await notifyUserEvent({
      action: 'account_security_update',
      userId: req.user.id,
      title: 'Account/security update',
      message: 'Your notification preferences have been successfully updated.',
    });

    res.json({
      success: true,
      data: {
        order_updates: user.notification_preferences?.order_updates ?? true,
        sell_request_updates: user.notification_preferences?.sell_request_updates ?? true,
        marketing: user.notification_preferences?.marketing ?? false,
      },
    });
  } catch (err) {
    next(err);
  }
}
