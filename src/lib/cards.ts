import { cache } from 'react';
import { promises as fs } from 'node:fs';
import path from 'node:path';

import type { ConceptCard } from '@/lib/types';

const cardsPath = path.join(
  process.cwd(),
  'mijeokbun1_ai_rag_cards_v0_1.jsonl',
);

export const loadConceptCards = cache(async (): Promise<ConceptCard[]> => {
  const raw = await fs.readFile(cardsPath, 'utf8');

  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line) as ConceptCard);
});
