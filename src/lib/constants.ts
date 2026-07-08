import type { SectionKey } from '@/lib/types';

export const SECTION_LABELS: Record<SectionKey, string> = {
  problemReading: '문제 읽기',
  usedConcepts: '사용 개념',
  strategy: '풀이 전략',
  stepByStep: '단계별 풀이',
  answer: '정답',
  check: '검산',
  similarTip: '비슷한 문제 팁',
};

export const SECTION_KEYS = Object.keys(SECTION_LABELS) as SectionKey[];

export const STUDENT_VISIBLE_SECTION_KEYS: Exclude<SectionKey, 'usedConcepts'>[] = [
  'problemReading',
  'strategy',
  'stepByStep',
  'answer',
  'check',
  'similarTip',
];
