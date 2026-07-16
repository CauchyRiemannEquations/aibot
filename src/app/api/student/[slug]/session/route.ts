import { NextResponse } from 'next/server';

import { verifyAccessCode } from '@/lib/platform/access-code';
import {
  checkAvailability,
  getClassroomBySlug,
  toPublicView,
} from '@/lib/platform/classrooms';
import { isPlatformMode } from '@/lib/platform/config';
import { studentSessionSchema } from '@/lib/platform/schemas';
import {
  ensureStudentSession,
  markSessionAccessVerified,
} from '@/lib/platform/student-session';
import { getSessionCountToday } from '@/lib/platform/usage';

export const runtime = 'nodejs';

const UNAVAILABLE_MESSAGE = '현재 이 수학 튜터는 사용할 수 없어요. 담당 선생님께 문의해 주세요.';

/*
 * 학생 세션 초기화 및 (필요 시) 접속 코드 검증.
 * 반이 사용 불가/만료면 일반화된 안내만 반환한다.
 */
export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  if (!isPlatformMode()) {
    return NextResponse.json({ error: '페이지를 찾을 수 없어요.' }, { status: 404 });
  }

  try {
    return await handleSession(request, await params);
  } catch {
    console.error('[student session] failed');
    return NextResponse.json({ error: UNAVAILABLE_MESSAGE, unavailable: true }, { status: 503 });
  }
}

async function handleSession(request: Request, { slug }: { slug: string }) {
  const classroom = await getClassroomBySlug(slug);
  const availability = checkAvailability(classroom);
  if (!availability.available || !classroom) {
    const notFound = availability.available === false && availability.reason === 'not_found';
    return NextResponse.json(
      { error: notFound ? '페이지를 찾을 수 없어요.' : UNAVAILABLE_MESSAGE, unavailable: true },
      { status: notFound ? 404 : 403 },
    );
  }
  if (!classroom.provider_credential_id) {
    return NextResponse.json({ error: UNAVAILABLE_MESSAGE, unavailable: true }, { status: 403 });
  }

  const parsed = studentSessionSchema.safeParse(await request.json().catch(() => ({})));
  const accessCode = parsed.success ? parsed.data.accessCode : undefined;

  const session = await ensureStudentSession(classroom.id);
  let verified = session.accessVerified;

  if (classroom.optional_access_code_hash && !verified) {
    if (!accessCode) {
      return NextResponse.json({ needsAccessCode: true }, { status: 200 });
    }
    const ok = verifyAccessCode(slug, accessCode, classroom.optional_access_code_hash);
    if (!ok) {
      return NextResponse.json({ needsAccessCode: true, error: '접속 코드가 올바르지 않아요.' }, { status: 401 });
    }
    await markSessionAccessVerified(session.id);
    verified = true;
  }

  const used = await getSessionCountToday(session.id);
  const remaining = Math.max(0, classroom.daily_limit_per_session - used);

  const view = toPublicView(classroom);
  return NextResponse.json({
    ready: true,
    classroom: view,
    remaining,
    dailyLimit: classroom.daily_limit_per_session,
  });
}
