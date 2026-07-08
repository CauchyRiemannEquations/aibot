import { cache } from 'react';
import { promises as fs } from 'node:fs';
import path from 'node:path';

import type { ConceptCard, SubjectId } from '@/lib/types';

const CARD_FILE_BY_SUBJECT: Record<SubjectId, string> = {
  'common-math-1': 'common_math1_ai_rag_cards_v0_1.jsonl',
  'common-math-2': 'common_math2_ai_rag_cards_v0_1.jsonl',
  algebra: 'algebra_ai_rag_cards_v0_1.jsonl',
  'calculus-1': 'mijeokbun1_ai_rag_cards_v0_1.jsonl',
  'calculus-2': 'calculus2_ai_rag_cards_v0_1.jsonl',
  probability: 'probability_ai_rag_cards_v0_1.jsonl',
  geometry: 'geometry_ai_rag_cards_v0_1.jsonl',
};

const CARD_FILES_FOR_SOLVING = [
  'common_math1_ai_rag_cards_v0_1.jsonl',
  'common_math2_ai_rag_cards_v0_1.jsonl',
  'algebra_ai_rag_cards_v0_1.jsonl',
  'mijeokbun1_ai_rag_cards_v0_1.jsonl',
  'calculus2_ai_rag_cards_v0_1.jsonl',
  'probability_ai_rag_cards_v0_1.jsonl',
  'geometry_ai_rag_cards_v0_1.jsonl',
] as const;

async function readConceptCardsFile(fileName: string): Promise<ConceptCard[]> {
  const cardsPath = path.join(process.cwd(), fileName);
  const raw = await fs.readFile(cardsPath, 'utf8');

  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line) as ConceptCard);
}

export const loadConceptCardsBySubject = cache(async (subjectId: SubjectId): Promise<ConceptCard[]> => {
  const fileName = CARD_FILE_BY_SUBJECT[subjectId] ?? CARD_FILE_BY_SUBJECT['calculus-1'];
  return readConceptCardsFile(fileName);
});

export const loadAllConceptCards = cache(async (): Promise<ConceptCard[]> => {
  const results = await Promise.allSettled(
    CARD_FILES_FOR_SOLVING.map(async (fileName) => ({
      fileName,
      cards: await readConceptCardsFile(fileName),
    })),
  );

  const cards: ConceptCard[] = [];
  const missingFiles: string[] = [];

  for (const result of results) {
    if (result.status === 'fulfilled') {
      cards.push(...result.value.cards);
      continue;
    }

    const message =
      result.reason instanceof Error ? result.reason.message : String(result.reason ?? 'unknown error');
    const matchedFile = CARD_FILES_FOR_SOLVING.find((fileName) => message.includes(fileName));
    missingFiles.push(matchedFile ?? message);
  }

  if (!cards.length) {
    throw new Error(
      `문제풀이용 개념카드를 불러오지 못했습니다. 누락된 파일: ${missingFiles.join(', ') || '알 수 없음'}`,
    );
  }

  if (missingFiles.length) {
    console.warn(
      `[cards] 일부 개념카드 파일을 불러오지 못했습니다: ${missingFiles.join(', ')}`,
    );
  }

  return cards;
});

export const loadConceptCards = cache(async (): Promise<ConceptCard[]> => loadConceptCardsBySubject('calculus-1'));

export { CARD_FILES_FOR_SOLVING };
