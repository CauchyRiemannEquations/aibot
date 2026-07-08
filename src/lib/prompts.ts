import { cache } from 'react';
import { promises as fs } from 'node:fs';
import path from 'node:path';

import { SECTION_KEYS, SECTION_LABELS, STUDENT_VISIBLE_SECTION_KEYS } from '@/lib/constants';
import type { SubjectDefinition } from '@/lib/subjects';
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
- 각 태그 안에서는 학생이 읽기 쉬운 자연스러운 한국어로 설명한다.
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

export function buildSolverUserPrompt(
  problemText: string,
  cards: RetrievedCard[],
  subject: SubjectDefinition,
): string {
  const cardsText = cards.length
    ? cards
        .map((card) =>
          [
            `ID: ${card.id}`,
            `과목: ${card.course}`,
            `단원: ${card.unit}`,
            `개념명: ${card.title}`,
            `핵심 원리: ${card.core_principle}`,
            `풀이 지침: ${card.ai_solver_instruction}`,
            `대표 예시: ${card.representative_example}`,
          ].join('\n'),
        )
        .join('\n\n---\n\n')
    : `검색된 개념카드가 없습니다. ${subject.scope}`;

  return `[활성 과목]
${subject.label}

[과목 지침]
${subject.solverInstruction}

[인식된 문제]
${problemText}

[검색된 개념카드]
${cardsText}

위 개념카드는 내부 참고용이다.
학생 답변에는 개념카드 ID나 검색 결과를 드러내지 말고,
풀이 전략과 단계별 풀이를 학생이 따라 할 수 있는 행동 중심으로 작성하세요.`;
}

export function buildSolverUserPromptForAllMath(problemText: string, cards: RetrievedCard[]): string {
  const cardsText = cards.length
    ? cards
        .map((card, index) =>
          [
            `카드 ${index + 1}`,
            `ID: ${card.id}`,
            `과목: ${card.course}`,
            `단원: ${card.unit}`,
            `개념명: ${card.title}`,
            `관련도: ${card.score}`,
            `매칭 근거: ${card.matchedTerms.join(', ') || '키워드/수식 유사도'}`,
            `핵심 원리: ${card.core_principle}`,
            `풀이 지침: ${card.ai_solver_instruction}`,
            `대표 예시: ${card.representative_example}`,
          ].join('\n'),
        )
        .join('\n\n---\n\n')
    : '검색된 개념카드가 없습니다. 기본적인 고등학교 수학 풀이 원칙에 따라 문제를 분석하세요.';

  return `[문제 인식 결과]
${problemText}

[검색된 관련 개념카드]
${cardsText}

[풀이 요청]
- 여러 과목 개념이 함께 쓰일 수 있음을 전제로 풀이하세요.
- 개념카드는 내부 참고용으로만 사용하세요.
- 학생에게 개념카드 ID, 과목명, 단원명, 관련도 점수, RAG 검색 결과를 직접 노출하지 마세요.
- [사용 개념] 태그는 내부 참고를 위해 유지해도 되지만, 카드 ID 중심이 아니라 짧은 내부 메모 수준으로 최소한만 적으세요.
- 풀이 전략은 "먼저 식을 정리한다", "대입했을 때 어떤 꼴인지 확인한다"처럼 학생이 따라 할 수 있는 행동 중심으로 설명하세요.
- OCR이 애매한 부분이 있으면 [문제 읽기]에서 먼저 분명히 적어 주세요.`;
}

function extractTagValue(source: string, tag: keyof SolverSections): string {
  const match = source.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  return match?.[1]?.trim() || '내용을 다시 생성하지 못했습니다. 잠시 후 다시 시도해 주세요.';
}

export function normalizeSolverSections(source: string): SolverSections {
  return {
    problemReading: extractTagValue(source, 'problemReading'),
    usedConcepts: extractTagValue(source, 'usedConcepts'),
    strategy: extractTagValue(source, 'strategy'),
    stepByStep: extractTagValue(source, 'stepByStep'),
    answer: extractTagValue(source, 'answer'),
    check: extractTagValue(source, 'check'),
    similarTip: extractTagValue(source, 'similarTip'),
  };
}

export function sectionsToMarkdown(sections: SolverSections): string {
  return STUDENT_VISIBLE_SECTION_KEYS.map(
    (key) => `## [${SECTION_LABELS[key]}]\n\n${sections[key]}`,
  ).join('\n\n');
}

export { SECTION_KEYS };
