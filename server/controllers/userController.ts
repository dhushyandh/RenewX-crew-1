import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { User } from '../models/User';
import { env } from '../config/env';
import { AuthenticatedRequest } from '../middleware/auth';
import { notifyUserEvent } from '../services/notificationService';
import { sendEmailVerificationCode } from '../services/emailService';

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

    // Role persistence must not fail because a notification provider is unavailable.
    try {
      await notifyUserEvent({
        action: 'account_security_update',
        userId: targetUser.id,
        title: 'Account/security update',
        message: `Your account role has been updated to ${role}.`,
      });
    } catch (notificationError) {
      console.warn('[Users] Role updated but notification failed:', notificationError);
    }

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

export async function updateProfile(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: { message: 'Authentication required', code: 'UNAUTHORIZED' } });
      return;
    }

    const { full_name, avatar_url, phone, address, city, state, pincode, bio } = req.body || {};
    const updates: Record<string, any> = {};

    if (full_name !== undefined) {
      updates.full_name = typeof full_name === 'string' ? full_name.trim() : '';
    }

    if (avatar_url !== undefined) {
      updates.avatar_url = typeof avatar_url === 'string' ? avatar_url.trim() : '';
    }

    if (phone !== undefined) {
      updates.phone = typeof phone === 'string' ? phone.trim() : '';
    }

    if (address !== undefined) {
      updates.address = typeof address === 'string' ? address.trim() : '';
    }

    if (city !== undefined) {
      updates.city = typeof city === 'string' ? city.trim() : '';
    }

    if (state !== undefined) {
      updates.state = typeof state === 'string' ? state.trim() : '';
    }

    if (pincode !== undefined) {
      updates.pincode = typeof pincode === 'string' ? pincode.trim() : '';
    }

    if (bio !== undefined) {
      updates.bio = typeof bio === 'string' ? bio.trim() : '';
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      { $set: updates },
      { new: true }
    );

    if (!updatedUser) {
      res.status(404).json({ success: false, error: { message: 'User not found', code: 'NOT_FOUND' } });
      return;
    }

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        id: updatedUser.id,
        email: updatedUser.email,
        role: updatedUser.role,
        full_name: updatedUser.full_name,
        avatar_url: updatedUser.avatar_url,
        phone: updatedUser.phone,
        address: updatedUser.address,
        city: updatedUser.city,
        state: updatedUser.state,
        pincode: updatedUser.pincode,
        bio: updatedUser.bio,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function requestEmailVerification(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: { message: 'Authentication required', code: 'UNAUTHORIZED' } });
      return;
    }

    const newEmail = req.body?.new_email?.trim()?.toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!newEmail || !emailRegex.test(newEmail)) {
      res.status(400).json({ success: false, error: { message: 'A valid new email address is required', code: 'INVALID_EMAIL' } });
      return;
    }

    if (newEmail === req.user.email.toLowerCase()) {
      res.status(400).json({ success: false, error: { message: 'This is already your active email address', code: 'SAME_EMAIL' } });
      return;
    }

    // Check if new email is already used by another account
    const existing = await User.findOne({ email: newEmail, _id: { $ne: req.user.id } });
    if (existing) {
      res.status(400).json({ success: false, error: { message: 'This email address is already registered with another account', code: 'EMAIL_IN_USE' } });
      return;
    }

    // Generate 6-digit random code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes expiry

    await User.findByIdAndUpdate(req.user.id, {
      $set: {
        pending_email: newEmail,
        email_verification_code: verificationCode,
        email_verification_expires: expiresAt,
      },
    });

    await sendEmailVerificationCode({
      email: newEmail,
      name: req.user.full_name,
      code: verificationCode,
    });

    res.json({
      success: true,
      message: `Verification code sent to ${newEmail}. Please enter the 6-digit code to confirm.`,
      data: {
        pending_email: newEmail,
        expires_at: expiresAt,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function verifyEmailUpdate(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: { message: 'Authentication required', code: 'UNAUTHORIZED' } });
      return;
    }

    const { code } = req.body || {};
    const cleanCode = typeof code === 'string' ? code.trim() : '';

    if (!cleanCode || cleanCode.length !== 6) {
      res.status(400).json({ success: false, error: { message: 'A 6-digit verification code is required', code: 'INVALID_CODE' } });
      return;
    }

    const user = await User.findById(req.user.id).select('+pending_email +email_verification_code +email_verification_expires');
    if (!user || !user.pending_email || !user.email_verification_code) {
      res.status(400).json({ success: false, error: { message: 'No pending email change request found. Please request a new verification code.', code: 'NO_PENDING_REQUEST' } });
      return;
    }

    if (user.email_verification_expires && new Date() > user.email_verification_expires) {
      res.status(400).json({ success: false, error: { message: 'Verification code has expired. Please request a new code.', code: 'CODE_EXPIRED' } });
      return;
    }

    if (user.email_verification_code !== cleanCode) {
      res.status(400).json({ success: false, error: { message: 'Invalid verification code. Please check and try again.', code: 'INCORRECT_CODE' } });
      return;
    }

    // Double check email collision right before committing
    const collision = await User.findOne({ email: user.pending_email, _id: { $ne: user._id } });
    if (collision) {
      res.status(400).json({ success: false, error: { message: 'This email is already registered with another account.', code: 'EMAIL_IN_USE' } });
      return;
    }

    const oldEmail = user.email;
    const verifiedEmail = user.pending_email;

    user.email = verifiedEmail;
    user.pending_email = undefined;
    user.email_verification_code = undefined;
    user.email_verification_expires = undefined;
    await user.save();

    await notifyUserEvent({
      action: 'account_security_update',
      userId: user.id,
      title: 'Account email updated',
      message: `Your account email address was changed from ${oldEmail} to ${verifiedEmail}.`,
    });

    res.json({
      success: true,
      message: 'Email address successfully verified and updated',
      data: {
        id: user.id,
        email: user.email,
        role: user.role,
        full_name: user.full_name,
        avatar_url: user.avatar_url,
      },
    });
  } catch (err) {
    next(err);
  }
}

