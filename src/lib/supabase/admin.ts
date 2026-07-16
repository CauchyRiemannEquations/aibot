import 'server-only';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { getSupabaseUrl } from '@/lib/supabase/env';

/*
 * 서비스 역할(Service Role) Supabase 클라이언트.
 * RLS를 우회하므로 반드시 서버에서만, 소유권 검증과 함께 사용한다.
 * SUPABASE_SERVICE_ROLE_KEY는 클라이언트 번들에 포함되면 안 된다 (server-only).
 */

let cached: SupabaseClient | null = null;

export function getAdminClient(): SupabaseClient {
  if (cached) return cached;

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set.');
  }

  cached = createClient(getSupabaseUrl(), serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return cached;
}
