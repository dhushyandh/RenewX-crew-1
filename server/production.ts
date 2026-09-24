import app from './index';
import { env } from './config/env';
import { connectDB } from './config/db';
import { setupOrderWebSocket } from './services/orderWebSocket';

async function start(): Promise<void> {
  await connectDB();

  const server = app.listen(env.PORT, '0.0.0.0', () => {
    console.log(`🚀 RenewX API listening on port ${env.PORT}`);
  });

  setupOrderWebSocket(server);

  const shutdown = (signal: string): void => {
    console.log(`[HTTP] Received ${signal}; shutting down gracefully`);

    server.close(() => {
      console.log('[HTTP] Server closed');
      process.exit(0);
    });

    setTimeout(() => {
      console.error('[HTTP] Forced shutdown after timeout');
      process.exit(1);
    }, 10_000).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

start().catch((error) => {
  console.error('❌ Failed to start RenewX API:', error);
  process.exit(1);
});
