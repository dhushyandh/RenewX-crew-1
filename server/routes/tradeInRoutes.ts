import { Router } from 'express';
import {
  getValuationQuote,
  createPickupRequest,
  getTradeInRequests,
  getMyTradeInRequests,
  updateTradeInStatus,
  cancelMyTradeInRequest,
} from '../controllers/tradeInController';
import { authenticateToken, requireAuthenticated, requireAdmin } from '../middleware/auth';

const router = Router();

// Public trade-in valuation quote & pickup submission
router.post('/quote', getValuationQuote);
router.post('/pickup', authenticateToken, requireAuthenticated, createPickupRequest);

// Customer endpoints
router.get('/my-requests', authenticateToken, requireAuthenticated, getMyTradeInRequests);
router.post('/pickup/:id/cancel', authenticateToken, requireAuthenticated, cancelMyTradeInRequest);

// Admin-only trade-in pickup requests retrieval & updates
router.get('/pickup', authenticateToken, requireAdmin, getTradeInRequests);
router.patch('/pickup/:id/status', authenticateToken, requireAdmin, updateTradeInStatus);

export default router;
