import { Router } from 'express';
import {
  getModels,
  createModel,
  updateModel,
  deleteModel,
} from '../controllers/modelController';
import { authenticateToken, requireAdmin } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { validateDeviceModelInput } from '../models/DeviceModel';
import { cacheResponse } from '../utils/cache';

const router = Router();

// Public discovery routes (cached for 5 minutes)
router.get('/', cacheResponse(300, 'models'), getModels);

// Creation route (accessible to authenticated users/sellers & admins)
router.post('/', authenticateToken, validateRequest(validateDeviceModelInput), createModel);
router.put('/:id', authenticateToken, requireAdmin, updateModel);
router.delete('/:id', authenticateToken, requireAdmin, deleteModel);

export default router;
