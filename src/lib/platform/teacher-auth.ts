import 'server-only';

import type { User } from '@supabase/supabase-js';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { isPlatformOwner } from '@/lib/platform/config';

/*
 * 교사 API용 인증 컨텍스트.
 * 클라이언트가 보낸 teacherId 등을 신뢰하지 않고, 세션에서 직접 사용자 신원을 얻는다.
 */
export type TeacherContext = {
  userId: string;
  email: string;
  isOwner: boolean;
};

export async function requireTeacher(): Promise<TeacherContext | null> {
  let user: User | null = null;
  try {
    const supabase = await createSupabaseServerClient();
    ({
      data: { user },
    } = await supabase.auth.getUser());
  } catch {
    return null;
  }

  if (!user) return null;
  return {
    userId: user.id,
    email: user.email ?? '',
    isOwner: isPlatformOwner(user.email),
  };
}
