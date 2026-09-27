import { Router } from 'express';
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
  clearAllNotifications,
  triggerTestNotification,
} from '../controllers/notificationController';
import { authenticateToken, requireAuthenticated } from '../middleware/auth';

const router = Router();

router.get('/', authenticateToken, requireAuthenticated, getNotifications);
router.post('/test', authenticateToken, triggerTestNotification);
router.post('/test-event', authenticateToken, triggerTestNotification);
router.patch('/read-all', authenticateToken, requireAuthenticated, markAllNotificationsRead);
router.patch('/:id/read', authenticateToken, requireAuthenticated, markNotificationRead);
router.delete('/clear-all', authenticateToken, requireAuthenticated, clearAllNotifications);
router.delete('/:id', authenticateToken, requireAuthenticated, deleteNotification);

export default router;
