import { connectDB } from './config/db';
import { startWhatsAppRetryWorker, stopWhatsAppRetryWorker } from './services/openwaService';
import mongoose from 'mongoose';

async function start() {
  console.log('=======================================================');
  console.log('⚙️  RenewX Dedicated Background Queue Worker');
  console.log('📡 Role: Asynchronous WhatsApp & Notification Dispatch');
  console.log('=======================================================');

  await connectDB();
  startWhatsAppRetryWorker(15000); // Polls outbox every 15s for failed/retryable tasks

  const gracefulShutdown = (signal: string) => {
    console.log(`[Worker] Received ${signal}. Shutting down queue worker...`);
    stopWhatsAppRetryWorker();
    mongoose.disconnect().catch(() => undefined).finally(() => {
      console.log('[Worker] Dedicated queue worker stopped cleanly.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
}

start().catch((err) => {
  console.error('❌ [Worker] Failed to start dedicated queue worker:', err);
  process.exit(1);
});

