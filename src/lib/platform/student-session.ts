import 'server-only';

import { createHash, randomBytes } from 'node:crypto';
import { cookies } from 'next/headers';

import { getAdminClient } from '@/lib/supabase/admin';

/*
 * 익명 학생 세션.
 * - 학생 개인정보를 수집하지 않는다.
 * - 쿠키에는 무작위 토큰만 담고(Secure/HttpOnly/SameSite=Lax),
 *   DB에는 토큰의 해시만 저장한다.
 * - 세션별 한도는 쿠키 삭제/브라우저 교체로 우회될 수 있으며(문서에 명시),
 *   반 전체 하드 한도로 보완한다.
 */

const COOKIE_NAME = 'socra_sid';
const ONE_YEAR = 60 * 60 * 24 * 365;

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export type StudentSession = {
  id: string;
  accessVerified: boolean;
};

/** 쿠키의 토큰을 읽고, 없으면 발급한다. 반환값은 (원문 토큰, 신규 여부). */
async function getOrIssueToken(): Promise<string> {
  const cookieStore = await cookies();
  const existing = cookieStore.get(COOKIE_NAME)?.value;
  if (existing && existing.length >= 20) {
    return existing;
  }
  const token = randomBytes(24).toString('base64url');
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: ONE_YEAR,
  });
  return token;
}

/** 반별 학생 세션 행을 보장(upsert)하고 세션 상태를 반환한다. */
export async function ensureStudentSession(classroomId: string): Promise<StudentSession> {
  const token = await getOrIssueToken();
  const hash = hashToken(token);
  const admin = getAdminClient();

  const { data: existing } = await admin
    .from('student_sessions')
    .select('id, access_verified')
    .eq('classroom_id', classroomId)
    .eq('anonymous_session_hash', hash)
    .maybeSingle();

  if (existing) {
    await admin
      .from('student_sessions')
      .update({ last_seen_at: new Date().toISOString() })
      .eq('id', existing.id);
    return { id: existing.id, accessVerified: existing.access_verified };
  }

  const { data: inserted, error } = await admin
    .from('student_sessions')
    .insert({ classroom_id: classroomId, anonymous_session_hash: hash })
    .select('id, access_verified')
    .single();

  if (error || !inserted) {
    throw new Error('failed to create student session');
  }
  return { id: inserted.id, accessVerified: inserted.access_verified };
}

export async function markSessionAccessVerified(sessionId: string): Promise<void> {
  const admin = getAdminClient();
  await admin.from('student_sessions').update({ access_verified: true }).eq('id', sessionId);
}
