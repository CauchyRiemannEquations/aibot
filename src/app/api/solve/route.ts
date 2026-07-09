import { NextResponse } from 'next/server';

import { loadConceptCardsForSubjectScope, SOLVING_SUBJECT_SCOPE } from '@/lib/cards';
import { getSubjectById, SUBJECTS } from '@/lib/subjects';
import {
  buildScopedSolverUserPrompt,
  loadAllMathSystemPrompt,
  normalizeSolverSections,
  sectionsToMarkdown,
} from '@/lib/prompts';
import { generateSolution } from '@/lib/openrouter';
import { retrieveRelevantCards } from '@/lib/rag';
import type { SubjectId } from '@/lib/types';

function isSubjectId(value: unknown): value is SubjectId {
  return SUBJECTS.some((subject) => subject.id === value);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const recognizedProblem = body?.recognizedProblem;
    const subjectId = isSubjectId(body?.subjectId) ? body.subjectId : 'calculus-2';

    if (typeof recognizedProblem !== 'string' || !recognizedProblem.trim()) {
      return NextResponse.json(
        { error: '문제를 먼저 읽은 뒤에 풀이를 시작해 주세요.' },
        { status: 400 },
      );
    }

    const subject = getSubjectById(subjectId);
    const scopedSubjectIds = SOLVING_SUBJECT_SCOPE[subject.id] ?? SOLVING_SUBJECT_SCOPE['calculus-2'];
    const scopedSubjectLabels = scopedSubjectIds.map((id) => getSubjectById(id).label);

    const [cards, systemPrompt] = await Promise.all([
      loadConceptCardsForSubjectScope(subject.id),
      loadAllMathSystemPrompt(),
    ]);

    const retrievedCards = retrieveRelevantCards(recognizedProblem, cards, 7);
    const userPrompt = buildScopedSolverUserPrompt({
      problemText: recognizedProblem,
      cards: retrievedCards,
      subjectId: subject.id,
      allowedSubjectLabels: scopedSubjectLabels,
    });

    const rawSolution = await generateSolution({
      systemPrompt,
      userPrompt,
    });

    const sections = normalizeSolverSections(rawSolution);
    const markdown = sectionsToMarkdown(sections);

    return NextResponse.json({
      solvingScope: {
        label: subject.label,
        subjects: scopedSubjectLabels,
      },
      recognizedProblem,
      retrievedCards: retrievedCards.map((card) => ({
        id: card.id,
        course: card.course,
        unit: card.unit,
        title: card.title,
        score: card.score,
        matchedTerms: card.matchedTerms,
      })),
      sections,
      markdown,
    });
  } catch (error) {
    console.error(error);

    const message =
      error instanceof Error && error.message.includes('문제풀이용 개념카드')
        ? error.message
        : '풀이를 만드는 중에 문제가 생겼어요. 잠시 후 다시 시도해 주세요.';

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
