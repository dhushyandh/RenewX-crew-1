import { Router } from 'express';
import {
  getValuationQuote,
  createPickupRequest,
  getPickupRequests,
} from '../controllers/tradeInController';
import { authenticateToken, requireAdmin } from '../middleware/auth';

const router = Router();

// Public trade-in valuation quote & pickup submission
router.post('/quote', getValuationQuote);
router.post('/pickup', createPickupRequest);

// Admin-only trade-in pickup requests retrieval
router.get('/pickup', authenticateToken, requireAdmin, getPickupRequests);

export default router;
