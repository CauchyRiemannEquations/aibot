import { NextResponse } from 'next/server';

import { createSupabaseServerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

/*
 * 매직 링크/OTP 인증 콜백.
 * 이메일 링크의 code를 세션으로 교환한 뒤 원래 요청 페이지로 돌려보낸다.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const redirect = url.searchParams.get('redirect') || '/teacher/dashboard';
  const safeRedirect = redirect.startsWith('/') ? redirect : '/teacher/dashboard';

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(new URL('/teacher/login?error=auth', url.origin));
    }
  }

  return NextResponse.redirect(new URL(safeRedirect, url.origin));
}
