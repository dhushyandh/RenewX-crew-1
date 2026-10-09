import { Router } from 'express';
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
  clearAllNotifications,
  triggerTestNotification,
  sendPromotionNotification,
  getWebPushPublicKey,
  subscribeWebPush,
  unsubscribeWebPush,
} from '../controllers/notificationController';
import { authenticateToken, requireAuthenticated, requireAdmin } from '../middleware/auth';

const router = Router();

// Web Push API (Service Worker subscriptions)
router.get('/web-push/public-key', getWebPushPublicKey);
router.post('/web-push/subscribe', authenticateToken, subscribeWebPush);
router.post('/web-push/unsubscribe', authenticateToken, unsubscribeWebPush);

router.get('/', authenticateToken, requireAuthenticated, getNotifications);
router.post('/test', authenticateToken, requireAdmin, triggerTestNotification);
router.post('/test-event', authenticateToken, requireAdmin, triggerTestNotification);
router.post('/admin/promotion', authenticateToken, requireAdmin, sendPromotionNotification);
router.post('/promotion', authenticateToken, requireAdmin, sendPromotionNotification);
router.patch('/read-all', authenticateToken, requireAuthenticated, markAllNotificationsRead);
router.patch('/:id/read', authenticateToken, requireAuthenticated, markNotificationRead);
router.delete('/clear-all', authenticateToken, requireAuthenticated, clearAllNotifications);
router.delete('/:id', authenticateToken, requireAuthenticated, deleteNotification);

export default router;
