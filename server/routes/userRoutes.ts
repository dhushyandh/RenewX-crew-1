import { Router } from 'express';
import { getUsers, updateUserRole } from '../controllers/userController';
import { authenticateToken, requireAdmin } from '../middleware/auth';

const router = Router();

// Admin-only user management
router.get('/', authenticateToken, requireAdmin, getUsers);
router.patch('/:id/role', authenticateToken, requireAdmin, updateUserRole);

export default router;
