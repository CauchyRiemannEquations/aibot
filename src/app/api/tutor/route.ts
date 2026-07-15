import { NextResponse } from 'next/server';

import { loadConceptCardsForSubjectScope } from '@/lib/cards';
import { streamTutorReply, type ChatMessage } from '@/lib/openrouter';
import { retrieveRelevantCards } from '@/lib/rag';
import { buildSocraticSystemPrompt } from '@/lib/socratic';
import { SUBJECTS } from '@/lib/subjects';
import type { SubjectId } from '@/lib/types';

export const runtime = 'nodejs';

const MAX_MESSAGES = 60;
const MAX_MESSAGE_LENGTH = 6000;
const MAX_PROBLEM_LENGTH = 6000;

function isSubjectId(value: unknown): value is SubjectId {
  return SUBJECTS.some((subject) => subject.id === value);
}

function sanitizeMessages(value: unknown): ChatMessage[] | null {
  if (!Array.isArray(value) || value.length > MAX_MESSAGES) {
    return null;
  }

  const messages: ChatMessage[] = [];

  for (const item of value) {
    const role = (item as { role?: unknown })?.role;
    const content = (item as { content?: unknown })?.content;

    if ((role !== 'user' && role !== 'assistant') || typeof content !== 'string') {
      return null;
    }

    const trimmed = content.trim();
    if (!trimmed || trimmed.length > MAX_MESSAGE_LENGTH) {
      return null;
    }

    messages.push({ role, content: trimmed });
  }

  return messages;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const problemText = typeof body?.problemText === 'string' ? body.problemText.trim() : '';
    if (!problemText || problemText.length > MAX_PROBLEM_LENGTH) {
      return NextResponse.json({ error: '문제를 먼저 입력해 주세요.' }, { status: 400 });
    }

    const subjectId: SubjectId = isSubjectId(body?.subjectId) ? body.subjectId : 'common-math-1';

    const messages = sanitizeMessages(body?.messages);
    if (!messages || !messages.length || messages[messages.length - 1].role !== 'user') {
      return NextResponse.json({ error: '대화 내용이 올바르지 않아요.' }, { status: 400 });
    }

    const cards = await loadConceptCardsForSubjectScope(subjectId);
    const retrievedCards = retrieveRelevantCards(problemText, cards, 5);
    const systemPrompt = buildSocraticSystemPrompt({
      subjectId,
      problemText,
      cards: retrievedCards,
    });

    const stream = await streamTutorReply({ systemPrompt, messages });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-store',
        'X-Accel-Buffering': 'no',
      },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: '소크라를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.' },
      { status: 500 },
    );
  }
}
