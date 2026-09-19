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
import { validateProductInput } from '../models/Product';

const router = Router();

// Public routes
router.get('/', getProducts);
router.get('/alerts/low-stock', getLowStockAlerts);
router.get('/:id', getProductById);

// Admin-only product catalog mutations
router.post('/', authenticateToken, requireAdmin, validateRequest(validateProductInput), createProduct);
router.put('/:id', authenticateToken, requireAdmin, updateProduct);
router.delete('/:id', authenticateToken, requireAdmin, deleteProduct);

export default router;
