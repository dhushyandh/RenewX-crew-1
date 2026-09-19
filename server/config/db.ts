import mongoose from 'mongoose';
import { env } from './env';

let isConnected = false;

export async function connectDB(): Promise<typeof mongoose> {
  if (isConnected) {
    return mongoose;
  }

  try {
    const conn = await mongoose.connect(env.MONGODB_URI, {
      autoIndex: true,
      serverSelectionTimeoutMS: 5000,
    });

    isConnected = true;
    console.log(`🌿 [MongoDB] Connected successfully to ${conn.connection.name} at ${conn.connection.host}:${conn.connection.port}`);
    return conn;
  } catch (error: any) {
    console.error('❌ [MongoDB] Connection error:', error.message);
    throw error;
  }
}

export async function checkDatabaseHealth(): Promise<{ ok: boolean; latencyMs: number; error?: string }> {
  const start = Date.now();
  try {
    if (mongoose.connection.readyState !== 1) {
      await connectDB();
    }
    const adminDb = mongoose.connection.db?.admin();
    if (!adminDb) {
      throw new Error('Database admin reference unavailable');
    }
    await adminDb.ping();
    return { ok: true, latencyMs: Date.now() - start };
  } catch (err: any) {
    return { ok: false, latencyMs: Date.now() - start, error: err?.message || 'MongoDB ping failed' };
  }
}

export default connectDB;
