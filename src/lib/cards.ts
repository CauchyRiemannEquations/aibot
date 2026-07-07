import { cache } from 'react';
import { promises as fs } from 'node:fs';
import path from 'node:path';

import type { ConceptCard } from '@/lib/types';
import type { SubjectId } from '@/lib/types';

const CARD_FILE_BY_SUBJECT: Record<SubjectId, string> = {
  'calculus-1': 'mijeokbun1_ai_rag_cards_v0_1.jsonl',
  algebra: 'algebra_ai_rag_cards_v0_1.jsonl',
  'calculus-2': 'mijeokbun1_ai_rag_cards_v0_1.jsonl',
  geometry: 'mijeokbun1_ai_rag_cards_v0_1.jsonl',
  probability: 'mijeokbun1_ai_rag_cards_v0_1.jsonl',
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
