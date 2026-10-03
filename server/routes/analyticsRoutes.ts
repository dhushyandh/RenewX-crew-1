import { Router } from 'express';
import { getAdminRealtimeAnalytics } from '../controllers/analyticsController';
import { authenticateToken, requireAdmin } from '../middleware/auth';

const router = Router();

// GET /api/analytics - Admin Realtime Analytics
router.get('/', authenticateToken, requireAdmin, getAdminRealtimeAnalytics);

export default router;
