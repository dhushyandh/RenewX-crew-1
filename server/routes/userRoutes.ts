import { Router } from 'express';
import {
  getUsers,
  updateUserRole,
  deleteUser,
  getMyNotificationPreferences,
  updateMyNotificationPreferences,
  updateProfile,
  requestEmailVerification,
  verifyEmailUpdate,
} from '../controllers/userController';
import { registerPushToken, unregisterPushToken } from '../controllers/notificationController';
import { authenticateToken, requireAdmin } from '../middleware/auth';

const router = Router();

// Current-user profile & preferences
router.patch('/me/profile', authenticateToken, updateProfile);
router.post('/me/email/request-verification', authenticateToken, requestEmailVerification);
router.post('/me/email/verify', authenticateToken, verifyEmailUpdate);

router.get('/me/notification-preferences', authenticateToken, getMyNotificationPreferences);
router.patch('/me/notification-preferences', authenticateToken, updateMyNotificationPreferences);
router.post('/me/push-token', authenticateToken, registerPushToken);
router.delete('/me/push-token', authenticateToken, unregisterPushToken);

// Admin-only user management
router.get('/', authenticateToken, requireAdmin, getUsers);
router.patch('/:id/role', authenticateToken, requireAdmin, updateUserRole);
router.delete('/:id', authenticateToken, requireAdmin, deleteUser);

export default router;
