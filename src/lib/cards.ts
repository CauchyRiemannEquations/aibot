import { cache } from 'react';
import { promises as fs } from 'node:fs';
import path from 'node:path';

import type { ConceptCard, SubjectId } from '@/lib/types';

const CARD_FILE_BY_SUBJECT: Record<SubjectId, string> = {
  'common-math-1': 'common_math1_ai_rag_cards_v0_1.jsonl',
  'common-math-2': 'common_math2_ai_rag_cards_v0_1.jsonl',
  'calculus-1': 'mijeokbun1_ai_rag_cards_v0_1.jsonl',
  algebra: 'algebra_ai_rag_cards_v0_1.jsonl',
  'calculus-2': 'calculus2_ai_rag_cards_v0_1.jsonl',
  geometry: 'geometry_ai_rag_cards_v0_1.jsonl',
  probability: 'probability_ai_rag_cards_v0_1.jsonl',
};

export const loadConceptCardsBySubject = cache(async (subjectId: SubjectId): Promise<ConceptCard[]> => {
  const fileName = CARD_FILE_BY_SUBJECT[subjectId] ?? CARD_FILE_BY_SUBJECT['calculus-1'];
  const cardsPath = path.join(process.cwd(), fileName);
  const raw = await fs.readFile(cardsPath, 'utf8');

  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line) as ConceptCard);
});

export const loadConceptCards = cache(async (): Promise<ConceptCard[]> =>
  loadConceptCardsBySubject('calculus-1'),
);
