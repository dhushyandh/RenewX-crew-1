import app from './server/index';
import { env } from './server/config/env';
import mongoose from 'mongoose';
import { connectDB } from './server/config/db';

async function start() {
  await connectDB();

  const server = app.listen(env.PORT, () => {
    console.log('=======================================================');
    console.log(`🚀 RenewX API running on port ${env.PORT}`);
    console.log(`📡 Environment: ${env.NODE_ENV}`);
    console.log('🩺 Health check: /api/health');
    console.log('=======================================================');
  });

  const gracefulShutdown = (signal: string) => {
    console.log(`[Server] Received ${signal}. Shutting down gracefully...`);

    server.close(() => {
      mongoose
        .disconnect()
        .catch(() => undefined)
        .finally(() => {
          console.log('[Server] Shutdown complete.');
          process.exit(0);
        });
    });
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
}

start().catch((error) => {
  console.error('❌ [Server] Startup aborted:', error);
  process.exit(1);
});
