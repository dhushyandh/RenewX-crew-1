import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import mongoose from 'mongoose';
import { env, isProduction } from '../config/env';

let client: SupabaseClient | null = null;

export function isSupabaseConfigured(): boolean {
  return Boolean(env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY);
}

function getClient(): SupabaseClient {
  if (client) return client;
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Persistent Supabase image storage is not configured');
  }
  client = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return client;
}

export async function uploadImageToStorage(
  buffer: Buffer,
  fileName: string,
  contentType: string,
): Promise<string> {
  const supabase = getClient();
  const bucketName = env.SUPABASE_STORAGE_BUCKET;
  const bucketCheck = await supabase.storage.getBucket(bucketName);
  if (bucketCheck.error) {
    const created = await supabase.storage.createBucket(bucketName, {
      public: true,
      fileSizeLimit: '50MB',
    });
    if (created.error && !/already exists/i.test(created.error.message)) {
      throw new Error(`Image storage bucket is unavailable: ${created.error.message}`);
    }
  }

  const storage = supabase.storage.from(bucketName);
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '-');
  const objectPath = `products/${Date.now()}-${Math.random().toString(36).slice(2, 10)}-${safeName}`;

  const { error } = await storage.upload(objectPath, buffer, {
    contentType,
    cacheControl: '31536000',
    upsert: false,
  });

  if (error) {
    throw new Error(`Image storage upload failed: ${error.message}`);
  }

  return storage.getPublicUrl(objectPath).data.publicUrl;
}

/**
 * Persistently stores an uploaded image in MongoDB GridFS.
 * This guarantees zero file loss even on ephemeral cloud hosts (Render, Vercel, Heroku)
 * without requiring any third-party storage account.
 */
export async function uploadImageToGridFS(
  buffer: Buffer,
  fileName: string,
  contentType: string,
): Promise<string> {
  const db = mongoose.connection.db;
  if (!db) {
    throw new Error('Database connection is not ready for GridFS persistent storage');
  }

  const bucket = new mongoose.mongo.GridFSBucket(db, { bucketName: 'uploads' });
  const cleanExt = fileName.includes('.') ? fileName.slice(fileName.lastIndexOf('.')) : (contentType.includes('png') ? '.png' : '.jpg');
  const baseName = fileName.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 30);
  const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${baseName}${cleanExt}`;

  await new Promise<void>((resolve, reject) => {
    const uploadStream = bucket.openUploadStream(uniqueName, {
      contentType,
      metadata: { originalName: fileName, uploadedAt: new Date() },
    });

    uploadStream.on('error', reject);
    uploadStream.on('finish', () => resolve());
    uploadStream.end(buffer);
  });

  return uniqueName;
}

export function shouldUsePersistentStorage(): boolean {
  return isProduction || isSupabaseConfigured();
}
