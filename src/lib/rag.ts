import type { ConceptCard, RetrievedCard } from '@/lib/types';

export interface CardRetriever {
  retrieve(problemText: string, cards: ConceptCard[], topK?: number): RetrievedCard[];
}

function normalizeText(value: string): string {
  return value.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ');
}

function normalizeFormula(value: string): string {
  return value
    .toLowerCase()
    .replace(/\$\$/g, ' ')
    .replace(/\$/g, ' ')
    .replace(/\\,/g, '')
    .replace(/\\left|\\right/g, '')
    .replace(/\s+/g, '')
    .trim();
}

function tokenize(value: string): string[] {
  return normalizeText(value)
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2);
}

function looksMathematical(value: string): boolean {
  return /[=<>≤≥^_{}\\]|lim|sin|cos|tan|log|ln|sqrt|frac|int|sum|f\(x\)/i.test(value);
}

function extractFormulaCandidates(value: string): string[] {
  const inlineMath = [...value.matchAll(/\$\$?([\s\S]*?)\$\$?/g)]
    .map((match) => normalizeFormula(match[1] ?? ''))
    .filter((candidate) => candidate.length >= 4);

  const fallbackFormula = normalizeFormula(value);
  if (looksMathematical(value) && fallbackFormula.length >= 6 && fallbackFormula.length <= 120) {
    inlineMath.push(fallbackFormula);
  }

  return [...new Set(inlineMath)];
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
  const problemFormulaCandidates = extractFormulaCandidates(problemText);
  const cardSearchText = normalizeText(
    [card.title, card.unit, card.retrieval_text, ...(card.keywords ?? [])].join(' '),
  );
  const cardFormulaText = [card.representative_example, card.core_principle, card.retrieval_text].join(' ');
  const cardFormulaCandidates = extractFormulaCandidates(cardFormulaText);

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

  for (const problemFormula of problemFormulaCandidates) {
    for (const cardFormula of cardFormulaCandidates) {
      if (!cardFormula) {
        continue;
      }

      if (problemFormula === cardFormula) {
        score += 20;
        matchedTerms.add(card.representative_example || cardFormula);
        continue;
      }

      const minLength = Math.min(problemFormula.length, cardFormula.length);
      if (
        minLength >= 8 &&
        (problemFormula.includes(cardFormula) || cardFormula.includes(problemFormula))
      ) {
        score += 12;
        matchedTerms.add(card.representative_example || cardFormula);
      }
    }
  }

  const looksLikePiecewise =
    /x\s*(<|>|<=|>=|≤|≥)\s*[-\d\w]+/i.test(problemText) ||
    (problemText.includes('{') && /(x<|x>|x<=|x>=|x≤|x≥)/i.test(problemText));
  const mentionsContinuity = /연속|continuity/i.test(problemText);
  const mentionsFunctionValue = /f\s*\(\s*x\s*\)|f\s*\(\s*1\s*\)/i.test(problemText);
  const mentionsParameters = /\b[a-z]\b/i.test(problemText);

  const cardHasPiecewisePattern =
    /x\s*(<|>|<=|>=|≤|≥)\s*[-\d\w]+/i.test(cardFormulaText) ||
    (cardFormulaText.includes('{') && /(x<|x>|x<=|x>=|x≤|x≥)/i.test(cardFormulaText));
  const cardMentionsContinuity = /연속|continuity/i.test(
    [card.title, card.retrieval_text, ...(card.keywords ?? [])].join(' '),
  );
  const cardMentionsParameters = /미정계수|parameter/i.test(
    [card.title, card.retrieval_text, ...(card.keywords ?? [])].join(' '),
  );

  if (looksLikePiecewise && cardHasPiecewisePattern) {
    score += 10;
    matchedTerms.add('piecewise');
  }

  if ((mentionsContinuity || mentionsFunctionValue) && cardMentionsContinuity) {
    score += 10;
    matchedTerms.add('continuity');
  }

  if (looksLikePiecewise && mentionsParameters && cardHasPiecewisePattern && cardMentionsParameters) {
    score += 12;
    matchedTerms.add('parameter');
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
