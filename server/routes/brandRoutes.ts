import { Router } from 'express';
import {
  getBrands,
  getBrandById,
  createBrand,
  updateBrand,
  deleteBrand,
  seedBrandsController,
} from '../controllers/brandController';
import { getModels } from '../controllers/modelController';
import { authenticateToken, requireAdmin } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { validateBrandInput } from '../models/Brand';
import { cacheResponse } from '../utils/cache';

const router = Router();

// Seeding route (Admin only)
router.post('/seed', authenticateToken, requireAdmin, seedBrandsController);

// Public discovery routes (cached for 5 minutes with automatic invalidation)
router.get('/', cacheResponse(300, 'brands'), getBrands);
router.get('/:id', cacheResponse(300, 'brand'), getBrandById);
router.get('/:brandId/models', cacheResponse(300, 'brand_models'), getModels);

// Admin-only management routes
router.post('/', authenticateToken, requireAdmin, validateRequest(validateBrandInput), createBrand);
router.put('/:id', authenticateToken, requireAdmin, updateBrand);
router.delete('/:id', authenticateToken, requireAdmin, deleteBrand);

export default router;
