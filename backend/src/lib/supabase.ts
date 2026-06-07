import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { env, isSupabaseConfigured } from '../config/env';

let client: SupabaseClient | null = null;

export function decodeSupabaseKeyRole(key: string): string | null {
  try {
    const payload = key.split('.')[1];
    if (!payload) return null;
    const json = Buffer.from(payload, 'base64url').toString('utf8');
    return (JSON.parse(json) as { role?: string }).role ?? null;
  } catch {
    return null;
  }
}

function assertServiceRoleKey(key: string): void {
  const role = decodeSupabaseKeyRole(key);
  if (!role) return;
  if (role !== 'service_role') {
    throw new Error(
      `SUPABASE_SERVICE_ROLE_KEY has JWT role "${role}" but must be "service_role". ` +
        'In Supabase Dashboard → Project Settings → API, copy the service_role secret (not anon). ' +
        'RLS error 42501 on users insert usually means the anon key was used by mistake.',
    );
  }
}

export function getSupabase(): SupabaseClient {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
  }
  if (!client) {
    assertServiceRoleKey(env.supabaseServiceRoleKey);
    client = createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return client;
}
