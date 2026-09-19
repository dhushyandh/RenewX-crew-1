import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { User } from '../models/User';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: 'admin' | 'customer';
    full_name?: string;
  };
}

export interface JwtPayload {
  id: string;
  email: string;
  role: 'admin' | 'customer';
}

export async function authenticateToken(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    // If no token, proceed as guest
    return next();
  }

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    if (!decoded || !decoded.id) {
      res.status(401).json({ success: false, error: { message: 'Invalid or expired token', code: 'UNAUTHORIZED' } });
      return;
    }

    // Resolve the current role from MongoDB so a revoked/demoted admin
    // cannot keep elevated access until the JWT expires.
    const user = await User.findById(decoded.id).select('email role full_name');
    if (!user) {
      res.status(401).json({ success: false, error: { message: 'Account no longer exists', code: 'UNAUTHORIZED' } });
      return;
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      full_name: user.full_name,
    };

    next();
  } catch (err: any) {
    res.status(401).json({ success: false, error: { message: 'Authentication failed or token expired', code: 'UNAUTHORIZED' } });
  }
}

export function requireAuthenticated(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: { message: 'Authentication required', code: 'UNAUTHORIZED' },
    });
    return;
  }
  next();
}

export function requireAdmin(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  if (!req.user || req.user.role !== 'admin') {
    res.status(403).json({
      success: false,
      error: { message: 'Access denied. Administrator privileges required.', code: 'FORBIDDEN' },
    });
    return;
  }
  next();
}

export function generateToken(user: { id: string; email: string; role: 'admin' | 'customer' }): string {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
    },
    env.JWT_SECRET,
    { expiresIn: '30d' }
  );
}
