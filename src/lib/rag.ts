import type { ConceptCard, RetrievedCard } from '@/lib/types';

export interface CardRetriever {
  retrieve(problemText: string, cards: ConceptCard[], topK?: number): RetrievedCard[];
}

function normalizeText(value: string): string {
  return value.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ');
}

function tokenize(value: string): string[] {
  return normalizeText(value)
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2);
}

function countOccurrences(haystack: string, needle: string): number {
  if (!needle) {
    return 0;
  }

  const matches = haystack.match(new RegExp(needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'));
  return matches?.length ?? 0;
}

function scoreCard(problemText: string, card: ConceptCard): RetrievedCard {
  const normalizedProblem = normalizeText(problemText);
  const tokens = new Set(tokenize(problemText));
  const cardSearchText = normalizeText(
    [card.title, card.unit, card.retrieval_text, ...(card.keywords ?? [])].join(' '),
  );

  let score = 0;
  const matchedTerms = new Set<string>();

  for (const keyword of card.keywords ?? []) {
    const normalizedKeyword = normalizeText(keyword).trim();
    if (!normalizedKeyword) {
      continue;
    }

    const occurrenceCount = countOccurrences(normalizedProblem, normalizedKeyword);
    if (occurrenceCount > 0) {
      score += 8 * occurrenceCount;
      matchedTerms.add(keyword);
    }
  }

  for (const token of tokens) {
    if (normalizeText(card.title).includes(token)) {
      score += 5;
      matchedTerms.add(token);
    }

    if (normalizeText(card.unit).includes(token)) {
      score += 3;
      matchedTerms.add(token);
    }

    if (normalizeText(card.retrieval_text).includes(token)) {
      score += 1;
      matchedTerms.add(token);
    }
  }

  const looksLikePiecewise =
    /x\s*[<>≥≤]/i.test(problemText) || /(x<|x>|x<=|x>=)/i.test(problemText);
  const mentionsContinuity = normalizedProblem.includes('연속');
  const mentionsParameters = /\b[a-z]\b/.test(problemText);

  if (looksLikePiecewise && cardSearchText.includes('조각함수')) {
    score += 10;
    matchedTerms.add('조각함수');
  }

  if (mentionsContinuity && cardSearchText.includes('연속')) {
    score += 10;
    matchedTerms.add('연속');
  }

  if (
    mentionsParameters &&
    mentionsContinuity &&
    looksLikePiecewise &&
    cardSearchText.includes('미정계수') &&
    cardSearchText.includes('연속')
  ) {
    score += 12;
    matchedTerms.add('미정계수');
  }

  return {
    ...card,
    score,
    matchedTerms: [...matchedTerms],
  };
}

class KeywordCardRetriever implements CardRetriever {
  retrieve(problemText: string, cards: ConceptCard[], topK = 3): RetrievedCard[] {
    return cards
      .map((card) => scoreCard(problemText, card))
      .filter((card) => card.score > 0)
      .sort((a, b) => {
        if (b.score !== a.score) {
          return b.score - a.score;
        }

        return a.id.localeCompare(b.id);
      })
      .slice(0, topK);
  }
}

const defaultRetriever = new KeywordCardRetriever();

export function retrieveRelevantCards(
  problemText: string,
  cards: ConceptCard[],
  topK = 3,
): RetrievedCard[] {
  return defaultRetriever.retrieve(problemText, cards, topK);
}
