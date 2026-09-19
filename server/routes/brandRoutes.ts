import { Router } from 'express';
import {
  getBrands,
  getBrandById,
  createBrand,
  updateBrand,
  deleteBrand,
} from '../controllers/brandController';
import { getModelsByBrand } from '../controllers/modelController';
import { authenticateToken, requireAdmin } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { validateBrandInput } from '../models/Brand';

const router = Router();

// Public discovery routes
router.get('/', getBrands);
router.get('/:id', getBrandById);
router.get('/:brandId/models', getModelsByBrand);

// Admin-only management routes
router.post('/', authenticateToken, requireAdmin, validateRequest(validateBrandInput), createBrand);
router.put('/:id', authenticateToken, requireAdmin, updateBrand);
router.delete('/:id', authenticateToken, requireAdmin, deleteBrand);

export default router;
