import { NextResponse } from 'next/server';

import type { ChatMessage } from '@/lib/ai/types';
import { loadConceptCardsForSubjectScope } from '@/lib/cards';
import { resolveClassroomProvider } from '@/lib/platform/classrooms';
import { studentTutorSchema } from '@/lib/platform/schemas';
import { guardStudent } from '@/lib/platform/student-guard';
import { consumeQuota, recordUsageResult } from '@/lib/platform/usage';
import { retrieveRelevantCards } from '@/lib/rag';
import { buildSocraticSystemPrompt } from '@/lib/socratic';
import type { SubjectId } from '@/lib/types';

export const runtime = 'nodejs';

const LIMIT_MESSAGE = '오늘 이 반에서 사용할 수 있는 질문 횟수를 모두 사용했어요.';
const GENERIC_ERROR = 'AI 튜터와 연결하지 못했어요. 잠시 후 다시 시도해 주세요.';

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const guard = await guardStudent(slug);
  if (!guard.ok) return guard.response;

  const { classroom, session } = guard;

  const parsed = studentTutorSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: '대화 내용이 올바르지 않아요.' }, { status: 400 });
  }
  const messages = parsed.data.messages as ChatMessage[];
  if (messages[messages.length - 1].role !== 'user') {
    return NextResponse.json({ error: '대화 내용이 올바르지 않아요.' }, { status: 400 });
  }
  const problemText = parsed.data.problemText;

  // 과목은 반 설정을 신뢰한다 (클라이언트 값 무시).
  const subjectId: SubjectId = (classroom.subject_id as SubjectId) ?? 'calculus-1';

  let resolved;
  try {
    resolved = await resolveClassroomProvider(classroom);
  } catch {
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 503 });
  }

  const quota = await consumeQuota({
    classroomId: classroom.id,
    studentSessionId: session.id,
    kind: 'tutor',
    sessionLimit: classroom.daily_limit_per_session,
    totalLimit: classroom.daily_limit_total,
    provider: resolved.providerId,
  });
  if (!quota.allowed) {
    return NextResponse.json({ error: LIMIT_MESSAGE, limitReached: true }, { status: 429 });
  }

  try {
    // 기존 RAG·소크라테스식 프롬프트·교육과정 위계 로직을 그대로 재사용한다.
    const cards = await loadConceptCardsForSubjectScope(subjectId);
    const retrievedCards = retrieveRelevantCards(problemText, cards, 5);
    const systemPrompt = buildSocraticSystemPrompt({ subjectId, problemText, cards: retrievedCards });

    const stream = await resolved.adapter.streamTutorReply({
      apiKey: resolved.apiKey,
      model: resolved.models.tutorModel,
      systemPrompt,
      messages,
    });

    // 스트림 시작에 성공 → 성공으로 집계.
    await recordUsageResult(classroom.id, true);

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-store',
        'X-Accel-Buffering': 'no',
      },
    });
  } catch (error) {
    await recordUsageResult(classroom.id, false);
    console.error('[student tutor] failed');
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 502 });
  }
}
