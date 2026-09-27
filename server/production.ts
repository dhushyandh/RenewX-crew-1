import cluster from 'node:cluster';
import os from 'node:os';
import app from './index';
import { env } from './config/env';
import { connectDB } from './config/db';
import { setupOrderWebSocket } from './services/orderWebSocket';
import { observability } from './services/observability';

const isPrimary = (cluster as any).isPrimary ?? (cluster as any).isMaster;
const enableCluster = process.env.ENABLE_CLUSTER === 'true';
const requestedWorkers = parseInt(process.env.CLUSTER_WORKERS || '', 10);
const numCPUs = Number.isInteger(requestedWorkers) && requestedWorkers > 0 
  ? requestedWorkers 
  : Math.min(os.cpus().length, 8);

async function startWorker(): Promise<void> {
  observability.setupProcessErrorHandling();
  await connectDB();

  const server = app.listen(env.PORT, '0.0.0.0', () => {
    const pidStr = cluster.isWorker ? `[Worker ${process.pid}] ` : '';
    console.log(`🚀 ${pidStr}RenewX API listening on port ${env.PORT}`);
  });

  setupOrderWebSocket(server);

  const shutdown = (signal: string): void => {
    console.log(`[HTTP ${process.pid}] Received ${signal}; shutting down gracefully`);

    server.close(() => {
      console.log(`[HTTP ${process.pid}] Server closed`);
      process.exit(0);
    });

    setTimeout(() => {
      console.error(`[HTTP ${process.pid}] Forced shutdown after timeout`);
      process.exit(1);
    }, 10_000).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

if (enableCluster && isPrimary) {
  console.log(`⚡ [Cluster] Primary ${process.pid} is running. Forking across ${numCPUs} CPU cores...`);

  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  // Inter-Process Communication (IPC) Message Broker:
  // Forward WebSocket broadcasts from any worker to all sibling workers
  cluster.on('message', (senderWorker, message: any) => {
    if (message && message.type === 'WS_ORDER_BROADCAST') {
      const workers = (cluster as any).workers;
      if (workers) {
        for (const id in workers) {
          const targetWorker = workers[id];
          if (targetWorker && targetWorker.id !== senderWorker.id) {
            targetWorker.send(message);
          }
        }
      }
    }
  });

  cluster.on('online', (worker) => {
    console.log(`🟢 [Cluster] Worker ${worker.process.pid} is online.`);
  });

  cluster.on('exit', (worker, code, signal) => {
    console.warn(`⚠️ [Cluster] Worker ${worker.process.pid} died (code: ${code}, signal: ${signal}). Spawning replacement...`);
    cluster.fork();
  });
} else {
  startWorker().catch((error) => {
    console.error(`❌ Failed to start RenewX API worker [${process.pid}]:`, error);
    process.exit(1);
  });
}
