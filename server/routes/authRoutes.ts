import { Router } from 'express';
import {
  register,
  login,
  googleAuth,
  getMe,
  makeAdmin,
  requestPasswordReset,
  verifyResetToken,
  resetPassword,
  changePassword,
} from '../controllers/authController';
import { authenticateToken, requireAdmin } from '../middleware/auth';

const router = Router();

// Public auth endpoints
router.post('/register', register);
router.post('/login', login);
router.post('/google', googleAuth);

// Password Reset & Email Verification endpoints
router.post('/forgot-password', requestPasswordReset);
router.post('/verify-reset-token', verifyResetToken);
router.post('/reset-password', resetPassword);

// Authenticated session profile & password management
router.get('/me', authenticateToken, getMe);
router.post('/change-password', authenticateToken, changePassword);

// Admin role promotion
router.post('/make-admin', authenticateToken, requireAdmin, makeAdmin);

export default router;
