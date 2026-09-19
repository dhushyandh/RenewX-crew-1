import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env, isProduction } from '../config/env';

let client: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (client) return client;
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Persistent image storage is not configured');
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
      fileSizeLimit: '10MB',
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
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

export function shouldUsePersistentStorage(): boolean {
  return isProduction || Boolean(env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY);
}
