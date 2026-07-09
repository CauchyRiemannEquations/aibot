import { cache } from 'react';
import { promises as fs } from 'node:fs';
import path from 'node:path';

import { SECTION_KEYS, SECTION_LABELS, STUDENT_VISIBLE_SECTION_KEYS } from '@/lib/constants';
import { getSubjectById } from '@/lib/subjects';
import type { RetrievedCard, SolverSections, SubjectId } from '@/lib/types';

const SYSTEM_PROMPT_FILE_BY_SUBJECT: Record<SubjectId, string> = {
  'common-math-1': 'common_math1_solver_system_prompt_v0_1.md',
  'common-math-2': 'common_math2_solver_system_prompt_v0_1.md',
  algebra: 'algebra_solver_system_prompt_v0_1.md',
  'calculus-1': 'mijeokbun1_solver_system_prompt_v0_1.md',
  'calculus-2': 'calculus2_solver_system_prompt_v0_1.md',
  probability: 'probability_solver_system_prompt_v0_1.md',
  geometry: 'geometry_solver_system_prompt_v0_1.md',
};

const ALL_MATH_SYSTEM_PROMPT_FILE = 'all_math_solver_system_prompt_v0_1.md';

function withSharedXmlRules(basePrompt: string): string {
  return `${basePrompt}

추가 출력 규칙:
- 아래 XML 태그 7개를 모두 포함한다.
- 태그 밖의 문장은 출력하지 않는다.
- 각 태그 안에서는 학생이 읽기 쉬운 자연스러운 설명으로 작성한다.
- 수식은 Markdown 본문 안에서 LaTeX 형식($...$, $$...$$)으로 작성한다.
- 제공된 개념카드는 내부 참고용으로만 사용한다.
- 학생에게는 개념카드 ID, RAG 검색 결과, 과목명, 단원명, 관련도 점수를 직접 노출하지 않는다.
- 풀이 전략은 학생이 따라 할 수 있는 행동 중심으로 설명한다.

<problemReading>...</problemReading>
<usedConcepts>...</usedConcepts>
<strategy>...</strategy>
<stepByStep>...</stepByStep>
<answer>...</answer>
<check>...</check>
<similarTip>...</similarTip>`;
}

export const loadSystemPromptBySubject = cache(async (subjectId: SubjectId): Promise<string> => {
  const fileName =
    SYSTEM_PROMPT_FILE_BY_SUBJECT[subjectId] ?? SYSTEM_PROMPT_FILE_BY_SUBJECT['calculus-1'];
  const systemPromptPath = path.join(process.cwd(), fileName);
  const basePrompt = await fs.readFile(systemPromptPath, 'utf8');

  return withSharedXmlRules(basePrompt);
});

export const loadAllMathSystemPrompt = cache(async (): Promise<string> => {
  const systemPromptPath = path.join(process.cwd(), ALL_MATH_SYSTEM_PROMPT_FILE);
  const basePrompt = await fs.readFile(systemPromptPath, 'utf8');

  return withSharedXmlRules(basePrompt);
});

export const loadSystemPrompt = cache(async (): Promise<string> => loadSystemPromptBySubject('calculus-1'));

export function buildScopedSolverUserPrompt(params: {
  problemText: string;
  cards: RetrievedCard[];
  subjectId: SubjectId;
  allowedSubjectLabels: string[];
}): string {
  const subject = getSubjectById(params.subjectId);
  const cardsText = params.cards.length
    ? params.cards
        .map((card, index) =>
          [
            `카드 ${index + 1}`,
            `ID: ${card.id}`,
            `과목: ${card.course}`,
            `단원: ${card.unit}`,
            `개념명: ${card.title}`,
            `관련도: ${card.score}`,
            `매칭 근거: ${card.matchedTerms.join(', ') || '키워드 일치 없음'}`,
            `핵심 원리: ${card.core_principle}`,
            `풀이 지침: ${card.ai_solver_instruction}`,
            `대표 예시: ${card.representative_example}`,
          ].join('\n'),
        )
        .join('\n\n---\n\n')
    : '검색된 개념카드가 없습니다. 선택한 과목 범위 안에서 기본 원칙으로 문제를 분석하세요.';

  return `[학생이 선택한 과목]
${subject.label}

[이번 풀이에서 허용되는 과목 범위]
${params.allowedSubjectLabels.join(', ')}

[과목 범위 지침]
${subject.solverInstruction}

[문제 인식 결과]
${params.problemText}

[검색된 관련 개념카드]
${cardsText}

[풀이 요청]
- 반드시 허용된 과목 범위 안에서만 풀이하세요.
- 허용되지 않은 과목 개념은 끌어오지 마세요.
- 개념카드는 내부 참고용으로만 사용하세요.
- 학생에게 개념카드 ID, 과목명, 단원명, 관련도 점수, RAG 검색 결과를 직접 노출하지 마세요.
- [사용 개념] 태그는 내부 정리용으로 최소한만 작성하세요.
- 풀이 전략은 학생이 따라 할 수 있는 행동 중심으로 설명하세요.
- 단계별 풀이와 정답 확인은 절대 비워 두지 마세요.
- 정답, 검산, 비슷한 문제 팁에서도 수식은 반드시 $...$ 또는 $$...$$ 형식으로 작성하세요.`;
}

function extractTagValue(source: string, tag: keyof SolverSections): string {
  const match = source.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  return match?.[1]?.trim() || '내용을 다시 생성하지 못했습니다. 잠시 후 다시 시도해 주세요.';
}

function normalizeMathDelimiters(text: string): string {
  return text
    .split('\n')
    .map((line) => {
      const trimmed = line.trim();

      if (!trimmed || trimmed.includes('$')) {
        return line;
      }

      const looksLikeRawMath =
        /^[-=+\d\s()xya-zA-Z\\^_{}[\].,/:<>|]+$/.test(trimmed) &&
        /(\\frac|\\sqrt|\\lim|\\int|\\sum|\\sin|\\cos|\\tan|\\log|\\ln|\\cdot|\\times|\\to|\^|_)/.test(trimmed);

      return looksLikeRawMath ? `$$${trimmed}$$` : line;
    })
    .join('\n');
}

function improveSectionReadability(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/(니다\.|이에요\.|예요\.|합니다\.|됩니다\.|하세요\.|봐요\.|죠\.|다\.)\s+/g, '$1\n\n')
    .replace(/([.!?])\s+(?=[A-Za-z가-힣])/g, '$1\n\n')
    .replace(/(?<!\n)\n(?!\n|[-*]\s|\d+\.\s|>\s)/g, '\n\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function getFallbackSectionText(tag: keyof SolverSections): string {
  switch (tag) {
    case 'stepByStep':
      return '풀이 과정을 충분히 생성하지 못했습니다. 다시 시도해 주세요.';
    case 'answer':
      return '정답을 충분히 생성하지 못했습니다. 다시 시도해 주세요.';
    default:
      return '내용을 다시 생성하지 못했습니다. 잠시 후 다시 시도해 주세요.';
  }
}

function formatSectionContent(text: string, tag: keyof SolverSections): string {
  const formatted = improveSectionReadability(normalizeMathDelimiters(text));
  return formatted || getFallbackSectionText(tag);
}

export function normalizeSolverSections(source: string): SolverSections {
  return {
    problemReading: formatSectionContent(extractTagValue(source, 'problemReading'), 'problemReading'),
    usedConcepts: formatSectionContent(extractTagValue(source, 'usedConcepts'), 'usedConcepts'),
    strategy: formatSectionContent(extractTagValue(source, 'strategy'), 'strategy'),
    stepByStep: formatSectionContent(extractTagValue(source, 'stepByStep'), 'stepByStep'),
    answer: formatSectionContent(extractTagValue(source, 'answer'), 'answer'),
    check: formatSectionContent(extractTagValue(source, 'check'), 'check'),
    similarTip: formatSectionContent(extractTagValue(source, 'similarTip'), 'similarTip'),
  };
}

export function sectionsToMarkdown(sections: SolverSections): string {
  return STUDENT_VISIBLE_SECTION_KEYS.map(
    (key) => `## [${SECTION_LABELS[key]}]\n\n${sections[key]}`,
  ).join('\n\n');
}

export { SECTION_KEYS };
