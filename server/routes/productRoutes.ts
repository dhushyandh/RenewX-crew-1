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

const router = Router();

router.get('/', getProducts);
router.get('/alerts/low-stock', authenticateToken, requireAdmin, getLowStockAlerts);
router.get('/:id', getProductById);

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
