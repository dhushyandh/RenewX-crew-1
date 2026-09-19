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

const router = Router();

// Public discovery routes
router.get('/', getModels);

// Admin-only management routes
router.post('/', authenticateToken, requireAdmin, validateRequest(validateDeviceModelInput), createModel);
router.put('/:id', authenticateToken, requireAdmin, updateModel);
router.delete('/:id', authenticateToken, requireAdmin, deleteModel);

export default router;
