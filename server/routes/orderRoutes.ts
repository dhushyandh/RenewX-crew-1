import { Router } from 'express';
import {
  getOrders,
  getOrderById,
  createCheckoutOrder,
  verifyPayment,
  updateOrderStatus,
  deleteOrder,
} from '../controllers/orderController';
import { authenticateToken, requireAuthenticated, requireAdmin } from '../middleware/auth';

const router = Router();

router.post('/checkout', authenticateToken, requireAuthenticated, createCheckoutOrder);
router.post('/verify-payment', authenticateToken, requireAuthenticated, verifyPayment);
router.get('/', authenticateToken, getOrders);
router.get('/:id', authenticateToken, requireAuthenticated, getOrderById);
router.patch('/:id/status', authenticateToken, requireAdmin, updateOrderStatus);
router.delete('/:id', authenticateToken, requireAdmin, deleteOrder);

export default router;
