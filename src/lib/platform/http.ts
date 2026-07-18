import { NextResponse } from 'next/server';

import { isPlatformMode } from '@/lib/platform/config';
import { requireTeacher, type TeacherContext } from '@/lib/platform/teacher-auth';

/*
 * 플랫폼 API 공통 HTTP 헬퍼.
 * 오류 응답에는 사용자 노출 문구만 담고, 내부 스택/키/제공업체 세부는 담지 않는다.
 */

export function jsonError(message: string, status: number): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

export function platformOnly(): NextResponse | null {
  if (!isPlatformMode()) {
    return jsonError('플랫폼 모드가 아니에요.', 404);
  }
  return null;
}

export async function withTeacher(): Promise<
  { ctx: TeacherContext } | { error: NextResponse }
> {
  const guard = platformOnly();
  if (guard) return { error: guard };

  const ctx = await requireTeacher();
  if (!ctx) {
    return { error: jsonError('로그인이 필요해요.', 401) };
  }
  return { ctx };
}

export async function withOwner(): Promise<
  { ctx: TeacherContext } | { error: NextResponse }
> {
  const result = await withTeacher();
  if ('error' in result) return result;
  if (!result.ctx.isOwner) {
    return { error: jsonError('접근 권한이 없어요.', 403) };
  }
  return result;
}
