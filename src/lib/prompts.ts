import { cache } from 'react';
import { promises as fs } from 'node:fs';
import path from 'node:path';

import { SECTION_KEYS, SECTION_LABELS } from '@/lib/constants';
import type { RetrievedCard, SolverSections } from '@/lib/types';

const systemPromptPath = path.join(
  process.cwd(),
  'mijeokbun1_solver_system_prompt_v0_1.md',
);

export const loadSystemPrompt = cache(async (): Promise<string> => {
  const basePrompt = await fs.readFile(systemPromptPath, 'utf8');

  return `${basePrompt}

추가 출력 규칙:
- 아래 XML 태그 7개를 모두 반드시 출력한다.
- 각 태그 안에는 학생이 읽기 쉬운 한국어 설명을 넣는다.
- 수식은 Markdown 본문 안에서 LaTeX 형식($...$, $$...$$)으로 적는다.
- [사용 개념] 태그 안에는 반드시 개념카드 ID를 포함한다.
- 태그 밖의 문장은 출력하지 않는다.

<problemReading>...</problemReading>
<usedConcepts>...</usedConcepts>
<strategy>...</strategy>
<stepByStep>...</stepByStep>
<answer>...</answer>
<check>...</check>
<similarTip>...</similarTip>`;
});

export function buildSolverUserPrompt(problemText: string, cards: RetrievedCard[]): string {
  const cardsText = cards.length
    ? cards
        .map(
          (card) =>
            [
              `ID: ${card.id}`,
              `제목: ${card.title}`,
              `단원: ${card.unit}`,
              `핵심 원리: ${card.core_principle}`,
              `풀이 포인트: ${card.ai_solver_instruction}`,
              `대표 예시: ${card.representative_example}`,
            ].join('\n'),
        )
        .join('\n\n---\n\n')
    : '검색된 개념카드가 없습니다. 미적분 I 범위 안에서 풀이하세요.';

  return `[인식한 문제]
${problemText}

[검색된 개념카드]
${cardsText}

위 개념카드를 우선 참고해서 풀이를 작성하세요.`;
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
  return SECTION_KEYS.map(
    (key) => `## [${SECTION_LABELS[key]}]\n\n${sections[key]}`,
  ).join('\n\n');
}
