import { Router } from 'express';
import {
  getOrders,
  getOrderById,
  createOrder,
  updateOrderStatus,
} from '../controllers/orderController';
import { authenticateToken, requireAuthenticated, requireAdmin } from '../middleware/auth';

const router = Router();

// Order creation & lookup
router.post('/', authenticateToken, requireAuthenticated, createOrder);
router.get('/', authenticateToken, getOrders);
router.get('/:id', authenticateToken, requireAuthenticated, getOrderById);

// Admin-only order status progression
router.patch('/:id/status', authenticateToken, requireAdmin, updateOrderStatus);

export default router;
