import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { env } from './env';

if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) {
  console.error('[Config] Missing Supabase environment URL or Anon Key!');
}

// Client with Service Role (if configured) or Anon Key for server operations
export const supabaseAdmin: SupabaseClient = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);

// Standard Anon client
export const supabasePublic: SupabaseClient = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: false,
    },
  }
);

/**
 * Returns a Supabase client scoped to the caller's JWT token (if provided),
 * or the service role / admin client if configured.
 */
export function getSupabaseForRequest(req?: { headers?: { authorization?: string } }): SupabaseClient {
  if (env.SUPABASE_SERVICE_ROLE_KEY && env.SUPABASE_SERVICE_ROLE_KEY.trim() !== '') {
    return supabaseAdmin;
  }

  const authHeader = req?.headers?.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : undefined;

  if (token) {
    return createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    });
  }

  return supabaseAdmin;
}

export async function checkDatabaseHealth(): Promise<{ ok: boolean; latencyMs: number; error?: string }> {
  const start = Date.now();
  try {
    const { error } = await supabasePublic.from('products').select('id', { count: 'exact', head: true });
    const latencyMs = Date.now() - start;
    if (error) {
      return { ok: false, latencyMs, error: error.message };
    }
    return { ok: true, latencyMs };
  } catch (err: any) {
    return { ok: false, latencyMs: Date.now() - start, error: err?.message || 'Database connection failed' };
  }
}
