import { cookies } from 'next/headers';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

import { getSupabaseAnonKey, getSupabaseUrl, hasSupabaseEnv } from '@/lib/supabase/env';

type CookieToSet = { name: string; value: string; options?: CookieOptions };

/*
 * 사용자 세션(교사 로그인)용 서버 Supabase 클라이언트.
 * RLS가 적용된 상태로 동작하며, 쿠키를 통해 인증 세션을 읽고 갱신한다.
 */
export async function createSupabaseServerClient(): Promise<SupabaseClient> {
  const cookieStore = await cookies();

  return createServerClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: CookieToSet[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server Component에서 호출된 경우 set이 불가할 수 있다. 미들웨어가 세션을 갱신한다.
        }
      },
    },
  });
}

/** 현재 로그인한 사용자를 반환한다. 없거나 Supabase 미설정이면 null. */
export async function getCurrentUser() {
  if (!hasSupabaseEnv()) {
    return null;
  }
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user;
  } catch {
    return null;
  }
}
