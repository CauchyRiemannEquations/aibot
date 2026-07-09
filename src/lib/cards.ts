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

export const SOLVING_SUBJECT_SCOPE: Record<SubjectId, SubjectId[]> = {
  'common-math-1': ['common-math-1'],
  'common-math-2': ['common-math-1', 'common-math-2'],
  algebra: ['common-math-1', 'common-math-2', 'algebra'],
  'calculus-1': ['common-math-1', 'common-math-2', 'algebra', 'calculus-1'],
  probability: ['common-math-1', 'common-math-2', 'algebra', 'calculus-1', 'probability', 'geometry'],
  geometry: ['common-math-1', 'common-math-2', 'algebra', 'calculus-1', 'probability', 'geometry'],
  'calculus-2': [
    'common-math-1',
    'common-math-2',
    'algebra',
    'calculus-1',
    'probability',
    'geometry',
    'calculus-2',
  ],
};

async function resolveProjectFilePath(fileName: string): Promise<string> {
  const cwd = process.cwd();
  const candidates = [
    path.join(cwd, fileName),
    path.join(cwd, '.', fileName),
    path.join(cwd, '..', fileName),
    path.join(cwd, '..', '..', fileName),
  ];

  for (const candidate of candidates) {
    try {
      await fs.access(candidate);
      return candidate;
    } catch {
      continue;
    }
  }

  throw new Error(`파일을 찾지 못했습니다: ${fileName} (현재 작업 경로: ${cwd})`);
}

async function readConceptCardsFile(fileName: string): Promise<ConceptCard[]> {
  const cardsPath = await resolveProjectFilePath(fileName);
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

export const loadConceptCardsForSubjectScope = cache(
  async (subjectId: SubjectId): Promise<ConceptCard[]> => {
    const scopedSubjects = SOLVING_SUBJECT_SCOPE[subjectId] ?? SOLVING_SUBJECT_SCOPE['calculus-2'];

    const results = await Promise.allSettled(
      scopedSubjects.map(async (scopeSubjectId) => ({
        subjectId: scopeSubjectId,
        cards: await loadConceptCardsBySubject(scopeSubjectId),
      })),
    );

    const cards: ConceptCard[] = [];
    const failedSubjects: SubjectId[] = [];

    for (const result of results) {
      if (result.status === 'fulfilled') {
        cards.push(...result.value.cards);
      } else {
        const failed = scopedSubjects.find((subject) =>
          String(result.reason ?? '').includes(CARD_FILE_BY_SUBJECT[subject]),
        );
        if (failed) {
          failedSubjects.push(failed);
        }
      }
    }

    if (!cards.length) {
      throw new Error(
        `문제풀이용 개념카드를 불러오지 못했습니다. 선택한 과목 범위: ${scopedSubjects.join(', ')}`,
      );
    }

    if (failedSubjects.length) {
      console.warn(`[cards] 일부 과목 카드를 불러오지 못했습니다: ${failedSubjects.join(', ')}`);
    }

    return cards;
  },
);

export const loadAllConceptCards = cache(async (): Promise<ConceptCard[]> =>
  loadConceptCardsForSubjectScope('calculus-2'),
);

export const loadConceptCards = cache(async (): Promise<ConceptCard[]> => loadConceptCardsBySubject('calculus-1'));
