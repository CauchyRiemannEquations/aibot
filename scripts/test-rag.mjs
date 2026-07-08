import fs from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();

const DATASET_BY_SUBJECT = {
  'common-math-1': {
    cardsPath: path.join(root, 'common_math1_ai_rag_cards_v0_1.jsonl'),
    testsPath: path.join(root, 'common_math1_test_cases_v0_1.jsonl'),
  },
  'common-math-2': {
    cardsPath: path.join(root, 'common_math2_ai_rag_cards_v0_1.jsonl'),
    testsPath: path.join(root, 'common_math2_test_cases_v0_1.jsonl'),
  },
  'calculus-1': {
    cardsPath: path.join(root, 'mijeokbun1_ai_rag_cards_v0_1.jsonl'),
    testsPath: path.join(root, 'mijeokbun1_test_cases_v0_1.jsonl'),
  },
  algebra: {
    cardsPath: path.join(root, 'algebra_ai_rag_cards_v0_1.jsonl'),
    testsPath: path.join(root, 'algebra_test_cases_v0_1.jsonl'),
  },
  'calculus-2': {
    cardsPath: path.join(root, 'calculus2_ai_rag_cards_v0_1.jsonl'),
    testsPath: path.join(root, 'calculus2_test_cases_v0_1.jsonl'),
  },
  geometry: {
    cardsPath: path.join(root, 'geometry_ai_rag_cards_v0_1.jsonl'),
    testsPath: path.join(root, 'geometry_test_cases_v0_1.jsonl'),
  },
  probability: {
    cardsPath: path.join(root, 'probability_ai_rag_cards_v0_1.jsonl'),
    testsPath: path.join(root, 'probability_test_cases_v0_1.jsonl'),
  },
};

function normalizeText(value) {
  return value.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ');
}

function normalizeFormula(value) {
  return value
    .toLowerCase()
    .replace(/\$\$/g, ' ')
    .replace(/\$/g, ' ')
    .replace(/\\,/g, '')
    .replace(/\\left|\\right/g, '')
    .replace(/\s+/g, '')
    .trim();
}

function tokenize(value) {
  return normalizeText(value)
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2);
}

function looksMathematical(value) {
  return /[=<>≤≥^_{}\\]|lim|sin|cos|tan|log|ln|sqrt|frac|int|sum|f\(x\)/i.test(value);
}

function extractFormulaCandidates(value) {
  const inlineMath = [...value.matchAll(/\$\$?([\s\S]*?)\$\$?/g)]
    .map((match) => normalizeFormula(match[1] ?? ''))
    .filter((candidate) => candidate.length >= 4);

  const fallbackFormula = normalizeFormula(value);
  if (looksMathematical(value) && fallbackFormula.length >= 6 && fallbackFormula.length <= 120) {
    inlineMath.push(fallbackFormula);
  }

  return [...new Set(inlineMath)];
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
  const problemFormulaCandidates = extractFormulaCandidates(problemText);
  const cardSearchText = normalizeText(
    [card.title, card.unit, card.retrieval_text, ...(card.keywords ?? [])].join(' '),
  );
  const cardFormulaText = [card.representative_example, card.core_principle, card.retrieval_text].join(' ');
  const cardFormulaCandidates = extractFormulaCandidates(cardFormulaText);

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

  for (const problemFormula of problemFormulaCandidates) {
    for (const cardFormula of cardFormulaCandidates) {
      if (!cardFormula) {
        continue;
      }

      if (problemFormula === cardFormula) {
        score += 20;
        continue;
      }

      const minLength = Math.min(problemFormula.length, cardFormula.length);
      if (
        minLength >= 8 &&
        (problemFormula.includes(cardFormula) || cardFormula.includes(problemFormula))
      ) {
        score += 12;
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
  }

  if ((mentionsContinuity || mentionsFunctionValue) && cardMentionsContinuity) {
    score += 10;
  }

  if (looksLikePiecewise && mentionsParameters && cardHasPiecewisePattern && cardMentionsParameters) {
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

  const duplicateIds = cards
    .map((card) => card.id)
    .filter((id, index, array) => array.indexOf(id) !== index);

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
  console.log(`Duplicate IDs: ${duplicateIds.length ? duplicateIds.join(', ') : 'none'}`);

  for (const result of results) {
    console.log(`${result.id}: ${result.hit ? 'PASS' : 'MISS'}`);
    console.log(`  matched: ${result.matched.join(', ')}`);
    console.log(`  expected: ${result.expected.join(', ')}`);
  }

  const passCount = results.filter((result) => result.hit).length;
  console.log(`Summary: ${passCount}/${results.length} test cases matched at least one expected card.`);

  if (duplicateIds.length || passCount !== results.length) {
    process.exitCode = 1;
  }
}
