import { Router } from 'express';
import {
  universalTrackLookup,
  trackOrderUniversally,
  trackSellRequestUniversally,
} from '../controllers/trackingController';

const router = Router();

// Universal lookup for any order or sell request ID
router.get('/universal/:query', universalTrackLookup);
router.get('/lookup', universalTrackLookup);

// Dedicated type tracking endpoints
router.get('/order/:id', trackOrderUniversally);
router.get('/sell/:id', trackSellRequestUniversally);

export default router;
