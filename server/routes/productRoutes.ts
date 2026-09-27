import { Router } from 'express';
import {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getLowStockAlerts,
} from '../controllers/productController';
import { authenticateToken, requireAdmin } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { validateProductInput, validateProductUpdate } from '../models/Product';
import { cacheResponse } from '../utils/cache';

const router = Router();

router.get('/', cacheResponse(60, 'products'), getProducts);
router.get('/alerts/low-stock', authenticateToken, requireAdmin, getLowStockAlerts);
router.get('/:id', cacheResponse(60, 'product'), getProductById);

router.post(
  '/',
  authenticateToken,
  requireAdmin,
  validateRequest(validateProductInput),
  createProduct,
);

router.put(
  '/:id',
  authenticateToken,
  requireAdmin,
  validateRequest(validateProductUpdate),
  updateProduct,
);

router.patch(
  '/:id',
  authenticateToken,
  requireAdmin,
  validateRequest(validateProductUpdate),
  updateProduct,
);

router.delete('/:id', authenticateToken, requireAdmin, deleteProduct);

export default router;
