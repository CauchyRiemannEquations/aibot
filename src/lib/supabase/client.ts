'use client';

import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

let cached: SupabaseClient | null = null;

/*
 * 브라우저용 Supabase 클라이언트 (교사 로그인 UI 전용).
 * anon key만 사용하며, service role/암호화 키는 절대 참조하지 않는다.
 */
export function getSupabaseBrowserClient(): SupabaseClient {
  if (cached) return cached;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error('Supabase 공개 환경변수가 설정되지 않았습니다.');
  }
  cached = createBrowserClient(url, anonKey);
  return cached;
}
