import 'server-only';

import { NextResponse } from 'next/server';

import {
  checkAvailability,
  getClassroomBySlug,
  type ClassroomRow,
} from '@/lib/platform/classrooms';
import { isPlatformMode } from '@/lib/platform/config';
import { ensureStudentSession, type StudentSession } from '@/lib/platform/student-session';

/*
 * 학생 요청 공통 가드.
 * slug만 신뢰하고 서버가 DB에서 반 설정을 조회한다.
 * 오류 문구에는 제공업체/모델/내부 정보가 절대 들어가지 않는다.
 */

const UNAVAILABLE_MESSAGE = '현재 이 수학 튜터는 사용할 수 없어요. 담당 선생님께 문의해 주세요.';

export type StudentGuardResult =
  | { ok: true; classroom: ClassroomRow; session: StudentSession }
  | { ok: false; response: NextResponse };

export async function guardStudent(slug: string): Promise<StudentGuardResult> {
  if (!isPlatformMode()) {
    return { ok: false, response: NextResponse.json({ error: '페이지를 찾을 수 없어요.' }, { status: 404 }) };
  }

  try {
    return await runGuard(slug);
  } catch {
    // DB/설정 오류 등은 일반화된 안내만 반환한다 (스택/키 비노출).
    console.error('[student guard] failed');
    return {
      ok: false,
      response: NextResponse.json({ error: UNAVAILABLE_MESSAGE, unavailable: true }, { status: 503 }),
    };
  }
}

async function runGuard(slug: string): Promise<StudentGuardResult> {
  const classroom = await getClassroomBySlug(slug);
  const availability = checkAvailability(classroom);
  if (!availability.available || !classroom) {
    const status = availability.available === false && availability.reason === 'not_found' ? 404 : 403;
    const message = status === 404 ? '페이지를 찾을 수 없어요.' : UNAVAILABLE_MESSAGE;
    return { ok: false, response: NextResponse.json({ error: message, unavailable: true }, { status }) };
  }

  if (!classroom.provider_credential_id) {
    return { ok: false, response: NextResponse.json({ error: UNAVAILABLE_MESSAGE, unavailable: true }, { status: 403 }) };
  }

  const session = await ensureStudentSession(classroom.id);

  if (classroom.optional_access_code_hash && !session.accessVerified) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: '접속 코드를 입력해 주세요.', needsAccessCode: true },
        { status: 401 },
      ),
    };
  }

  return { ok: true, classroom, session };
}
