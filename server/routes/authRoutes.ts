import { Router } from 'express';
import { register, login, getMe, makeAdmin } from '../controllers/authController';
import { authenticateToken, requireAdmin } from '../middleware/auth';

const router = Router();

// Public auth endpoints
router.post('/register', register);
router.post('/login', login);

// Authenticated session profile
router.get('/me', authenticateToken, getMe);

// Admin role promotion
router.post('/make-admin', authenticateToken, requireAdmin, makeAdmin);

export default router;
