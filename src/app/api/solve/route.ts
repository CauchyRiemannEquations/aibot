import { NextResponse } from 'next/server';

import { loadConceptCards } from '@/lib/cards';
import { buildSolverUserPrompt, loadSystemPrompt, normalizeSolverSections, sectionsToMarkdown } from '@/lib/prompts';
import { generateSolution } from '@/lib/openrouter';
import { retrieveRelevantCards } from '@/lib/rag';
import { getSubjectById } from '@/lib/subjects';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const recognizedProblem = body?.recognizedProblem;
    const subjectId = typeof body?.subjectId === 'string' ? body.subjectId : 'calculus-1';
    const subject = getSubjectById(subjectId);

    if (typeof recognizedProblem !== 'string' || !recognizedProblem.trim()) {
      return NextResponse.json(
        { error: '문제를 먼저 읽어 온 뒤 풀이를 시작해 주세요.' },
        { status: 400 },
      );
    }

    if (subject.status !== 'active') {
      return NextResponse.json(
        { error: `${subject.label} 과목은 아직 준비 중이에요. 지금은 미적분Ⅰ부터 사용할 수 있어요.` },
        { status: 400 },
      );
    }

    const [cards, systemPrompt] = await Promise.all([
      loadConceptCards(),
      loadSystemPrompt(),
    ]);

    const retrievedCards = retrieveRelevantCards(recognizedProblem, cards, 3);
    const userPrompt = buildSolverUserPrompt(recognizedProblem, retrievedCards, subject);
    const rawSolution = await generateSolution({
      systemPrompt,
      userPrompt,
    });

    const sections = normalizeSolverSections(rawSolution);
    const markdown = sectionsToMarkdown(sections);

    return NextResponse.json({
      subject: {
        id: subject.id,
        label: subject.label,
      },
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
