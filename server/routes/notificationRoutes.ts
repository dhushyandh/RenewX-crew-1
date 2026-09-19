import { Router } from 'express';
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from '../controllers/notificationController';
import { authenticateToken, requireAuthenticated } from '../middleware/auth';

const router = Router();

router.get('/', authenticateToken, requireAuthenticated, getNotifications);
router.patch('/read-all', authenticateToken, requireAuthenticated, markAllNotificationsRead);
router.patch('/:id/read', authenticateToken, requireAuthenticated, markNotificationRead);

export default router;
