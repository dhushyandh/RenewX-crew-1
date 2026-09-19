import { Router } from 'express';
import authRoutes from './authRoutes';
import brandRoutes from './brandRoutes';
import modelRoutes from './modelRoutes';
import productRoutes from './productRoutes';
import orderRoutes from './orderRoutes';
import userRoutes from './userRoutes';
import tradeInRoutes from './tradeInRoutes';
import uploadRoutes from './uploadRoutes';
import { checkDatabaseHealth } from '../config/db';

const apiRouter = Router();

// Health Check Endpoint
apiRouter.get('/health', async (req, res) => {
  const dbHealth = await checkDatabaseHealth();
  res.json({
    status: dbHealth.ok ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    service: 'RenewX REST API (MongoDB)',
    version: '2.0.0',
    database: {
      type: 'MongoDB',
      connected: dbHealth.ok,
      latency: `${dbHealth.latencyMs}ms`,
      error: dbHealth.error,
    },
  });
});

// Mounted Master Sub-Routers
apiRouter.use('/auth', authRoutes);
apiRouter.use('/brands', brandRoutes);
apiRouter.use('/models', modelRoutes);
apiRouter.use('/products', productRoutes);
apiRouter.use('/orders', orderRoutes);
apiRouter.use('/users', userRoutes);
apiRouter.use('/trade-in', tradeInRoutes);
apiRouter.use('/upload', uploadRoutes);

export default apiRouter;
