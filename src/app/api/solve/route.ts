import { NextResponse } from 'next/server';

import { loadConceptCards } from '@/lib/cards';
import { buildSolverUserPrompt, loadSystemPrompt, normalizeSolverSections, sectionsToMarkdown } from '@/lib/prompts';
import { generateSolution } from '@/lib/openrouter';
import { retrieveRelevantCards } from '@/lib/rag';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const recognizedProblem = body?.recognizedProblem;

    if (typeof recognizedProblem !== 'string' || !recognizedProblem.trim()) {
      return NextResponse.json(
        { error: '문제를 먼저 읽어 온 뒤 풀이를 시작해 주세요.' },
        { status: 400 },
      );
    }

    const [cards, systemPrompt] = await Promise.all([
      loadConceptCards(),
      loadSystemPrompt(),
    ]);

    const retrievedCards = retrieveRelevantCards(recognizedProblem, cards, 3);
    const userPrompt = buildSolverUserPrompt(recognizedProblem, retrievedCards);
    const rawSolution = await generateSolution({
      systemPrompt,
      userPrompt,
    });

    const sections = normalizeSolverSections(rawSolution);
    const markdown = sectionsToMarkdown(sections);

    return NextResponse.json({
      recognizedProblem,
      retrievedCards: retrievedCards.map((card) => ({
        id: card.id,
        title: card.title,
        unit: card.unit,
        score: card.score,
      })),
      sections,
      markdown,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: '풀이를 만드는 중에 문제가 생겼어요. 잠시 후 다시 시도해 주세요.' },
      { status: 500 },
    );
  }
}
