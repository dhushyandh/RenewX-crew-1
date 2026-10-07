import { Router } from 'express';
import authRoutes from './authRoutes';
import brandRoutes from './brandRoutes';
import modelRoutes from './modelRoutes';
import productRoutes from './productRoutes';
import orderRoutes from './orderRoutes';
import userRoutes from './userRoutes';
import tradeInRoutes from './tradeInRoutes';
import uploadRoutes from './uploadRoutes';
import notificationRoutes from './notificationRoutes';
import analyticsRoutes from './analyticsRoutes';
import trackingRoutes from './trackingRoutes';
import { sendPromotionNotification } from '../controllers/notificationController';
import { authenticateToken, requireAdmin } from '../middleware/auth';
import { checkDatabaseHealth } from '../config/db';

const apiRouter = Router();

// Health Check Endpoint (Readiness & Liveness probe for AWS ALB, Render, K8s)
apiRouter.get('/health', async (req, res) => {
  const dbHealth = await checkDatabaseHealth();
  const mem = process.memoryUsage();
  res.status(dbHealth.ok ? 200 : 503).json({
    status: dbHealth.ok ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    service: 'RenewX REST API (MongoDB)',
    version: '2.0.0',
    uptimeSeconds: Math.floor(process.uptime()),
    environment: process.env.NODE_ENV || 'development',
    system: {
      memoryUsedMB: Math.round(mem.rss / 1024 / 1024),
      heapUsedMB: Math.round(mem.heapUsed / 1024 / 1024),
      heapTotalMB: Math.round(mem.heapTotal / 1024 / 1024),
    },
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
apiRouter.use('/notifications', notificationRoutes);
apiRouter.use('/analytics', analyticsRoutes);
apiRouter.use('/admin/analytics', analyticsRoutes);
apiRouter.use('/tracking', trackingRoutes);

// Direct admin promotion route alias
apiRouter.post('/admin/notifications/promotion', authenticateToken, requireAdmin, sendPromotionNotification);

export default apiRouter;

