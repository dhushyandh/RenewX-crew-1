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

router.get('/whatsapp/status', authenticateToken, requireAdmin, async (_req, res) => {
  const { checkOpenWAHealth } = await import('../services/openwaService');
  const health = await checkOpenWAHealth();
  res.json({ success: true, data: health });
});

router.post('/whatsapp/test', authenticateToken, requireAdmin, async (req, res) => {
  const { sendTestWhatsAppMessage } = await import('../services/openwaService');
  const targetPhone = String(req.body?.phone || '9342763553').trim();
  const result = await sendTestWhatsAppMessage(targetPhone);
  res.json({ success: result.success, data: result });
});

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
