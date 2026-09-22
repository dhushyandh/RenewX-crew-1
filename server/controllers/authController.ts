import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import { generateToken, AuthenticatedRequest } from '../middleware/auth';
import { env } from '../config/env';
import { sendPasswordResetEmail } from '../services/emailService';
import { notifyUserEvent } from '../services/notificationService';

export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, password, full_name } = req.body;

    if (!email || !password) {
      res.status(400).json({
        success: false,
        error: { message: 'Email and password are required', code: 'VALIDATION_ERROR' },
      });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({
        success: false,
        error: { message: 'Password must be at least 6 characters long', code: 'VALIDATION_ERROR' },
      });
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      res.status(409).json({
        success: false,
        error: { message: 'An account with this email already exists', code: 'USER_EXISTS' },
      });
      return;
    }

    // Assign admin role if email matches designated ADMIN_EMAIL
    const role: 'admin' | 'customer' =
      normalizedEmail === env.ADMIN_EMAIL.toLowerCase() ? 'admin' : 'customer';

    const newUser = await User.create({
      email: normalizedEmail,
      password,
      full_name: full_name?.trim() || '',
      role,
    });

    const token = generateToken({
      id: newUser.id,
      email: newUser.email,
      role: newUser.role,
    });

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      data: {
        token,
        user: {
          id: newUser.id,
          email: newUser.email,
          role: newUser.role,
          full_name: newUser.full_name,
        },
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({
        success: false,
        error: { message: 'Email and password are required', code: 'VALIDATION_ERROR' },
      });
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    // Select password because schema has select: false
    const user = await User.findOne({ email: normalizedEmail }).select('+password');

    if (!user) {
      res.status(401).json({
        success: false,
        error: { message: 'Invalid email or password', code: 'INVALID_CREDENTIALS' },
      });
      return;
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      res.status(401).json({
        success: false,
        error: { message: 'Invalid email or password', code: 'INVALID_CREDENTIALS' },
      });
      return;
    }

    // Auto-promote admin email if not already admin
    if (normalizedEmail === env.ADMIN_EMAIL.toLowerCase() && user.role !== 'admin') {
      user.role = 'admin';
      await user.save();
    }

    const token = generateToken({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    res.json({
      success: true,
      message: 'Logged in successfully',
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          full_name: user.full_name,
        },
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function getMe(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: { message: 'Unauthorized', code: 'UNAUTHORIZED' } });
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
        id: user.id,
        email: user.email,
        role: user.role,
        full_name: user.full_name,
        avatar_url: user.avatar_url,
        created_at: user.created_at,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function makeAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email } = req.body;
    if (!email) {
      res.status(400).json({ success: false, error: { message: 'Email is required' } });
      return;
    }

    const user = await User.findOneAndUpdate(
      { email: email.trim().toLowerCase() },
      { role: 'admin' },
      { new: true }
    );

    if (!user) {
      res.status(404).json({ success: false, error: { message: 'User not found' } });
      return;
    }

    res.json({ success: true, message: `User ${email} promoted to admin`, data: user });
  } catch (err) {
    next(err);
  }
}

/**
 * 1. Request Password Reset Verification Link
 * Generates single-use token, saves SHA-256 hash to user, and dispatches email
 */
export async function requestPasswordReset(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, redirectUrl } = req.body;

    if (!email || typeof email !== 'string') {
      res.status(400).json({
        success: false,
        error: { message: 'Valid email address is required', code: 'VALIDATION_ERROR' },
      });
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      // Return ambiguous success to protect against email enumeration
      res.json({
        success: true,
        message: 'If an account exists with this email, a verification link has been sent.',
      });
      return;
    }

    // Generate 32-byte cryptographically secure token
    const rawToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

    // 30-minute expiration
    user.reset_password_token = hashedToken;
    user.reset_password_expires = new Date(Date.now() + 30 * 60 * 1000);
    await user.save();

    // Determine target frontend base URL
    const origin =
      redirectUrl ||
      process.env.FRONTEND_URL ||
      process.env.APP_URL ||
      req.get('origin') ||
      req.get('referer')?.replace(/\/$/, '') ||
      'http://localhost:8081';

    const cleanOrigin = origin.split('#')[0].replace(/\/$/, '');
    const resetUrl = `${cleanOrigin}/security?token=${rawToken}&email=${encodeURIComponent(user.email)}`;

    // Dispatch verification email
    const emailPromise = sendPasswordResetEmail({
      email: user.email,
      name: user.full_name,
      token: rawToken,
      resetUrl,
    }).catch((err) => {
      console.error('[Email Error] Failed to send password reset email:', err);
      return { success: false, simulated: false };
    });

    // Wait up to 2.5s for fast delivery or simulated mode; otherwise continue sending in background
    let emailResult: any = { success: true, simulated: false };
    try {
      emailResult = await Promise.race([
        emailPromise,
        new Promise((resolve) => setTimeout(() => resolve({ success: true, simulated: false, pending: true }), 2500)),
      ]);
    } catch {
      // SMTP continuing in background
    }

    res.json({
      success: true,
      message: 'Password verification link has been sent to your email address.',
      data: {
        email: user.email,
        expiresInMinutes: 30,
        // In local development, provide the direct link for rapid testing
        ...(env.NODE_ENV !== 'production' || emailResult?.simulated
          ? { simulated: true, resetUrl, token: rawToken }
          : {}),
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * 2. Verify Reset Token Validity
 */
export async function verifyResetToken(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { token, email } = req.body;

    if (!token || typeof token !== 'string') {
      res.status(400).json({
        success: false,
        error: { message: 'Verification token is required', code: 'INVALID_TOKEN' },
      });
      return;
    }

    const hashedToken = crypto.createHash('sha256').update(token.trim()).digest('hex');

    const query: any = {
      reset_password_token: hashedToken,
      reset_password_expires: { $gt: new Date() },
    };

    if (email && typeof email === 'string') {
      query.email = email.trim().toLowerCase();
    }

    const user = await User.findOne(query);

    if (!user) {
      res.status(400).json({
        success: false,
        error: {
          message: 'The password verification link is invalid or has expired. Please request a new link.',
          code: 'EXPIRED_OR_INVALID_TOKEN',
        },
      });
      return;
    }

    res.json({
      success: true,
      message: 'Token is valid',
      data: {
        email: user.email,
        name: user.full_name,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * 3. Set New Password using Verification Token
 */
export async function resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { token, newPassword, email } = req.body;

    if (!token || !newPassword) {
      res.status(400).json({
        success: false,
        error: { message: 'Token and new password are required', code: 'VALIDATION_ERROR' },
      });
      return;
    }

    if (newPassword.length < 6) {
      res.status(400).json({
        success: false,
        error: { message: 'Password must be at least 6 characters long', code: 'VALIDATION_ERROR' },
      });
      return;
    }

    const hashedToken = crypto.createHash('sha256').update(token.trim()).digest('hex');

    const query: any = {
      reset_password_token: hashedToken,
      reset_password_expires: { $gt: new Date() },
    };

    if (email && typeof email === 'string') {
      query.email = email.trim().toLowerCase();
    }

    const user = await User.findOne(query);

    if (!user) {
      res.status(400).json({
        success: false,
        error: {
          message: 'This password verification link is invalid or has expired. Please request a new link.',
          code: 'EXPIRED_OR_INVALID_TOKEN',
        },
      });
      return;
    }

    // Assign new password and clear reset token fields
    user.password = newPassword;
    user.reset_password_token = undefined;
    user.reset_password_expires = undefined;
    await user.save(); // pre-save hook securely hashes the new password

    await notifyUserEvent({
      action: 'account_security_update',
      userId: user.id,
      title: 'Account/security update',
      message: 'Your account password was successfully reset.',
    });

    // Issue session token so user is automatically authenticated
    const authToken = generateToken({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    res.json({
      success: true,
      message: 'Your password has been changed successfully. You are now logged in.',
      data: {
        token: authToken,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          full_name: user.full_name,
        },
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * 4. Direct Password Change (for Signed-in Users)
 */
export async function changePassword(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: { message: 'Unauthorized', code: 'UNAUTHORIZED' } });
      return;
    }

    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      res.status(400).json({
        success: false,
        error: { message: 'Current password and new password are required', code: 'VALIDATION_ERROR' },
      });
      return;
    }

    if (newPassword.length < 6) {
      res.status(400).json({
        success: false,
        error: { message: 'New password must be at least 6 characters long', code: 'VALIDATION_ERROR' },
      });
      return;
    }

    const user = await User.findById(req.user.id).select('+password');
    if (!user) {
      res.status(404).json({ success: false, error: { message: 'User not found', code: 'NOT_FOUND' } });
      return;
    }

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      res.status(400).json({
        success: false,
        error: { message: 'Current password is incorrect', code: 'INVALID_CURRENT_PASSWORD' },
      });
      return;
    }

    user.password = newPassword;
    await user.save();

    await notifyUserEvent({
      action: 'account_security_update',
      userId: user.id,
      title: 'Account/security update',
      message: 'Your account password was successfully updated.',
    });

    res.json({
      success: true,
      message: 'Password updated successfully.',
    });
  } catch (err) {
    next(err);
  }
}

