import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { User } from '../models/User';
import { env } from '../config/env';

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

    res.json({ success: true, data: targetUser });
  } catch (err) {
    next(err);
  }
}
