import { Router } from 'express';
import {
  getOrders,
  getOrderById,
  getOrderInvoice,
  downloadOrderInvoicePdfController,
  createCheckoutOrder,
  verifyPayment,
  updateOrderStatus,
  deleteOrder,
} from '../controllers/orderController';
import { authenticateToken, requireAuthenticated, requireAdmin } from '../middleware/auth';
import { checkoutRateLimiter } from '../middleware/rateLimiter';

const router = Router();

router.post('/checkout', checkoutRateLimiter, authenticateToken, requireAuthenticated, createCheckoutOrder);
router.post('/verify-payment', authenticateToken, requireAuthenticated, verifyPayment);
router.get('/', authenticateToken, requireAuthenticated, getOrders);
router.get('/:id', authenticateToken, requireAuthenticated, getOrderById);
router.get('/:id/invoice', authenticateToken, requireAuthenticated, getOrderInvoice);
router.get('/:id/invoice/pdf', authenticateToken, requireAuthenticated, downloadOrderInvoicePdfController);
router.get('/:id/invoice/download', authenticateToken, requireAuthenticated, downloadOrderInvoicePdfController);
router.patch('/:id/status', authenticateToken, requireAdmin, updateOrderStatus);
router.delete('/:id', authenticateToken, requireAdmin, deleteOrder);

export default router;
