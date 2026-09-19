import mongoose from 'mongoose';
import { env } from './env';
import { OrderModel } from '../models/Order';

let connectPromise: Promise<typeof mongoose> | null = null;

async function reconcileOrderIndexes(): Promise<void> {
  const indexes = await OrderModel.collection.indexes();
  const legacyOrderNumberIndex = indexes.find((index) => index.name === 'orderNumber_1');

  if (legacyOrderNumberIndex) {
    await OrderModel.collection.dropIndex('orderNumber_1');
    console.log('[MongoDB] Removed obsolete orderNumber index');
  }

  await OrderModel.syncIndexes();
}

export async function connectDB(): Promise<typeof mongoose> {
  if (mongoose.connection.readyState === 1) return mongoose;
  if (connectPromise) return connectPromise;

  connectPromise = mongoose
    .connect(env.MONGODB_URI, {
      autoIndex: env.NODE_ENV !== 'production',
      serverSelectionTimeoutMS: 15000,
      connectTimeoutMS: 15000,
      socketTimeoutMS: 45000,
      maxPoolSize: 20,
      minPoolSize: env.NODE_ENV === 'production' ? 2 : 0,
    })
    .then(async (connection) => {
      await reconcileOrderIndexes();
      console.log(`🌿 [MongoDB] Connected to ${connection.connection.name} at ${connection.connection.host}`);
      return connection;
    })
    .catch((error) => {
      connectPromise = null;
      console.error('❌ [MongoDB] Connection failed:', error.message);
      throw error;
    });

  return connectPromise;
}

export async function checkDatabaseHealth(): Promise<{ ok: boolean; latencyMs: number; error?: string }> {
  const start = Date.now();
  try {
    if (mongoose.connection.readyState !== 1) await connectDB();
    const adminDb = mongoose.connection.db?.admin();
    if (!adminDb) throw new Error('Database admin reference unavailable');
    await adminDb.ping();
    return { ok: true, latencyMs: Date.now() - start };
  } catch (err: any) {
    return { ok: false, latencyMs: Date.now() - start, error: err?.message || 'MongoDB ping failed' };
  }
}

mongoose.connection.on('disconnected', () => {
  connectPromise = null;
  console.warn('⚠️ [MongoDB] Disconnected');
});
mongoose.connection.on('error', (error) => console.error('❌ [MongoDB] Runtime error:', error.message));

export default connectDB;
