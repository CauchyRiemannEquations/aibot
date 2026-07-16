import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

type CookieToSet = { name: string; value: string; options?: CookieOptions };

import { getPlatformOwnerEmails } from '@/lib/platform/config';
import { getSupabaseAnonKey, getSupabaseUrl, hasSupabaseEnv } from '@/lib/supabase/env';

/*
 * 미들웨어에서 Supabase 세션을 갱신하고, 보호된 교사/관리자 경로 접근을 통제한다.
 * next-url에 redirect 파라미터를 붙여 로그인 후 원래 페이지로 되돌린다.
 */
export async function updateSession(request: NextRequest): Promise<NextResponse> {
  let response = NextResponse.next({ request });

  if (!hasSupabaseEnv()) {
    return response;
  }

  const supabase = createServerClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: CookieToSet[]) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isTeacherPage = pathname.startsWith('/teacher') && pathname !== '/teacher/login';
  const isAdminPage = pathname.startsWith('/admin');

  if ((isTeacherPage || isAdminPage) && !user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/teacher/login';
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isAdminPage && user) {
    const owners = getPlatformOwnerEmails();
    const email = user.email?.toLowerCase() ?? '';
    if (!owners.includes(email)) {
      const dashUrl = request.nextUrl.clone();
      dashUrl.pathname = '/teacher/dashboard';
      dashUrl.search = '';
      return NextResponse.redirect(dashUrl);
    }
  }

  return response;
}
