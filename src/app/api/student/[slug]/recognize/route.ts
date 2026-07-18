import { NextResponse } from 'next/server';

import { toStudentMessage } from '@/lib/ai/errors';
import { resolveClassroomProvider } from '@/lib/platform/classrooms';
import { guardStudent } from '@/lib/platform/student-guard';
import { consumeQuota, recordUsageResult } from '@/lib/platform/usage';
import { validateImageFile } from '@/lib/image';

export const runtime = 'nodejs';

const MAX_IMAGE_SIZE_MB = Number(process.env.MAX_IMAGE_SIZE_MB ?? 8);
const LIMIT_MESSAGE = '오늘 이 반에서 사용할 수 있는 질문 횟수를 모두 사용했어요.';

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const guard = await guardStudent(slug);
  if (!guard.ok) return guard.response;

  const { classroom, session } = guard;

  const formData = await request.formData().catch(() => null);
  const image = formData?.get('image');
  if (!(image instanceof File)) {
    return NextResponse.json({ error: '문제 사진을 먼저 올려 주세요.' }, { status: 400 });
  }

  const validated = await validateImageFile(image, MAX_IMAGE_SIZE_MB * 1024 * 1024);
  if (!validated.ok) {
    const message =
      validated.error === 'too_large'
        ? `사진 용량은 ${MAX_IMAGE_SIZE_MB}MB 이하로 올려 주세요.`
        : '사진 파일만 올릴 수 있어요.';
    return NextResponse.json({ error: message }, { status: 400 });
  }

  // 자격증명은 slug 기준으로 서버가 복호화한다. 클라이언트 값은 신뢰하지 않는다.
  let resolved;
  try {
    resolved = await resolveClassroomProvider(classroom);
  } catch {
    return NextResponse.json({ error: '현재 이 수학 튜터는 사용할 수 없어요. 담당 선생님께 문의해 주세요.' }, { status: 503 });
  }

  const quota = await consumeQuota({
    classroomId: classroom.id,
    studentSessionId: session.id,
    kind: 'ocr',
    sessionLimit: classroom.daily_limit_per_session,
    totalLimit: classroom.daily_limit_total,
    provider: resolved.providerId,
  });
  if (!quota.allowed) {
    return NextResponse.json({ error: LIMIT_MESSAGE, limitReached: true }, { status: 429 });
  }

  try {
    const recognizedProblem = await resolved.adapter.recognizeProblemFromImage({
      apiKey: resolved.apiKey,
      model: resolved.models.visionModel,
      dataUrl: validated.dataUrl,
      mimeType: validated.mimeType,
    });
    await recordUsageResult(classroom.id, true);

    if (!recognizedProblem) {
      return NextResponse.json(
        { error: '사진을 읽지 못했어요. 더 선명한 사진으로 다시 시도해 주세요.' },
        { status: 422 },
      );
    }
    return NextResponse.json({ recognizedProblem });
  } catch (error) {
    await recordUsageResult(classroom.id, false);
    console.error('[student recognize] failed');
    // 학생 화면에는 제공업체 이름이 제거된 일반 문구만.
    return NextResponse.json({ error: toStudentMessage(error, 'ocr') }, { status: 502 });
  }
}
