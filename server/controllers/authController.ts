import { Request, Response, NextFunction } from 'express';
import { User } from '../models/User';
import { generateToken, AuthenticatedRequest } from '../middleware/auth';
import { env } from '../config/env';

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
