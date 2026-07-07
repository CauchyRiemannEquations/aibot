import fs from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const DATASET_BY_SUBJECT = {
  'calculus-1': {
    cardsPath: path.join(root, 'mijeokbun1_ai_rag_cards_v0_1.jsonl'),
    testsPath: path.join(root, 'mijeokbun1_test_cases_v0_1.jsonl'),
  },
  algebra: {
    cardsPath: path.join(root, 'algebra_ai_rag_cards_v0_1.jsonl'),
    testsPath: path.join(root, 'algebra_test_cases_v0_1.jsonl'),
  },
};

function normalizeText(value) {
  return value.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ');
}

function tokenize(value) {
  return normalizeText(value)
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2);
}

function countOccurrences(haystack, needle) {
  if (!needle) {
    return 0;
  }

  const matches = haystack.match(new RegExp(needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'));
  return matches?.length ?? 0;
}

function scoreCard(problemText, card) {
  const normalizedProblem = normalizeText(problemText);
  const tokens = new Set(tokenize(problemText));
  const cardSearchText = normalizeText(
    [card.title, card.unit, card.retrieval_text, ...(card.keywords ?? [])].join(' '),
  );

  let score = 0;

  for (const keyword of card.keywords ?? []) {
    const normalizedKeyword = normalizeText(keyword).trim();
    const occurrenceCount = countOccurrences(normalizedProblem, normalizedKeyword);
    if (occurrenceCount > 0) {
      score += 8 * occurrenceCount;
    }
  }

  for (const token of tokens) {
    if (normalizeText(card.title).includes(token)) {
      score += 5;
    }

    if (normalizeText(card.unit).includes(token)) {
      score += 3;
    }

    if (normalizeText(card.retrieval_text).includes(token)) {
      score += 1;
    }
  }

  const looksLikePiecewise =
    /x\s*[<>≥≤]/i.test(problemText) || /(x<|x>|x<=|x>=)/i.test(problemText);
  const mentionsContinuity = normalizedProblem.includes('연속');
  const mentionsParameters = /\b[a-z]\b/.test(problemText);

  if (looksLikePiecewise && cardSearchText.includes('조각함수')) {
    score += 10;
  }

  if (mentionsContinuity && cardSearchText.includes('연속')) {
    score += 10;
  }

  if (
    mentionsParameters &&
    mentionsContinuity &&
    looksLikePiecewise &&
    cardSearchText.includes('미정계수') &&
    cardSearchText.includes('연속')
  ) {
    score += 12;
  }

  return score;
}

function retrieveRelevantCards(problemText, cards, topK = 3) {
  return cards
    .map((card) => ({ ...card, score: scoreCard(problemText, card) }))
    .filter((card) => card.score > 0)
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))
    .slice(0, topK);
}

const requestedSubject = process.argv[2];
const subjectsToRun = requestedSubject ? [requestedSubject] : Object.keys(DATASET_BY_SUBJECT);

for (const subjectId of subjectsToRun) {
  const dataset = DATASET_BY_SUBJECT[subjectId];

  if (!dataset) {
    console.error(`Unknown subject: ${subjectId}`);
    process.exitCode = 1;
    continue;
  }

  const cards = (await fs.readFile(dataset.cardsPath, 'utf8'))
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => JSON.parse(line));

  const tests = (await fs.readFile(dataset.testsPath, 'utf8'))
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => JSON.parse(line));

  const results = tests.map((testCase) => {
    const matched = retrieveRelevantCards(testCase.problem_text, cards, 3).map((card) => card.id);
    const hit = testCase.expected_cards.some((id) => matched.includes(id));

    return {
      id: testCase.id,
      matched,
      expected: testCase.expected_cards,
      hit,
    };
  });

  console.log(`\n[${subjectId}]`);

  for (const result of results) {
    console.log(`${result.id}: ${result.hit ? 'PASS' : 'MISS'}`);
    console.log(`  matched: ${result.matched.join(', ')}`);
    console.log(`  expected: ${result.expected.join(', ')}`);
  }

  const passCount = results.filter((result) => result.hit).length;
  console.log(`Summary: ${passCount}/${results.length} test cases matched at least one expected card.`);

  if (passCount !== results.length) {
    process.exitCode = 1;
  }
}
