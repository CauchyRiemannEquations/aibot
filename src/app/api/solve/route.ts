import { NextResponse } from 'next/server';

import { loadAllConceptCards } from '@/lib/cards';
import {
  buildSolverUserPromptForAllMath,
  loadAllMathSystemPrompt,
  normalizeSolverSections,
  sectionsToMarkdown,
} from '@/lib/prompts';
import { generateSolution } from '@/lib/openrouter';
import { retrieveRelevantCards } from '@/lib/rag';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const recognizedProblem = body?.recognizedProblem;

    if (typeof recognizedProblem !== 'string' || !recognizedProblem.trim()) {
      return NextResponse.json(
        { error: '문제를 먼저 읽은 뒤에 풀이를 시작해 주세요.' },
        { status: 400 },
      );
    }

    const [cards, systemPrompt] = await Promise.all([
      loadAllConceptCards(),
      loadAllMathSystemPrompt(),
    ]);

    const retrievedCards = retrieveRelevantCards(recognizedProblem, cards, 7);
    const userPrompt = buildSolverUserPromptForAllMath(recognizedProblem, retrievedCards);
    const rawSolution = await generateSolution({
      systemPrompt,
      userPrompt,
    });

    const sections = normalizeSolverSections(rawSolution);
    const markdown = sectionsToMarkdown(sections);

    return NextResponse.json({
      solvingScope: {
        label: '전체 고등학교 수학',
        subjects: ['공통수학Ⅰ', '공통수학Ⅱ', '대수', '미적분Ⅰ', '미적분Ⅱ', '확률과 통계', '기하'],
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
