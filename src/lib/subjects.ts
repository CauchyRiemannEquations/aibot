import type { SubjectId } from '@/lib/types';

export type SubjectDefinition = {
  id: SubjectId;
  label: string;
  shortLabel: string;
  status: 'active' | 'planned';
  note: string;
  description: string;
  scope: string;
  solverInstruction: string;
};

export const SUBJECTS: SubjectDefinition[] = [
  {
    id: 'common-math-1',
    label: '공통수학Ⅰ',
    shortLabel: '공통수학Ⅰ',
    status: 'active',
    note: '사용 가능',
    description: '다항식, 방정식과 부등식, 기본 계산 중심의 사진 문제풀이',
    scope: '공통수학Ⅰ 범위 안에서 풀이한다.',
    solverInstruction:
      '현재 활성 과목은 공통수학Ⅰ이다. 제공된 공통수학Ⅰ 개념카드를 우선 참고하고, 범위를 벗어나는 설명은 최소화한다.',
  },
  {
    id: 'common-math-2',
    label: '공통수학Ⅱ',
    shortLabel: '공통수학Ⅱ',
    status: 'active',
    note: '사용 가능',
    description: '함수, 도형, 수열 기초 중심의 사진 문제풀이',
    scope: '공통수학Ⅱ 범위 안에서 풀이한다.',
    solverInstruction:
      '현재 활성 과목은 공통수학Ⅱ이다. 제공된 공통수학Ⅱ 개념카드를 우선 참고하고, 범위를 벗어나는 설명은 최소화한다.',
  },
  {
    id: 'algebra',
    label: '대수',
    shortLabel: '대수',
    status: 'active',
    note: '사용 가능',
    description: '지수함수와 로그함수, 삼각함수, 수열 중심의 사진 문제풀이',
    scope: '대수 범위 안에서 풀이한다.',
    solverInstruction:
      '현재 활성 과목은 대수이다. 제공된 대수 개념카드를 우선 참고하고, 범위를 벗어나는 설명은 최소화한다.',
  },
  {
    id: 'calculus-1',
    label: '미적분Ⅰ',
    shortLabel: '미적분Ⅰ',
    status: 'active',
    note: '사용 가능',
    description: '극한, 연속, 미분, 적분 중심의 사진 문제풀이',
    scope: '미적분Ⅰ 범위 안에서 풀이한다.',
    solverInstruction:
      '현재 활성 과목은 미적분Ⅰ이다. 제공된 미적분Ⅰ 개념카드를 우선 참고하고, 범위를 벗어나는 설명은 최소화한다.',
  },
  {
    id: 'calculus-2',
    label: '미적분Ⅱ',
    shortLabel: '미적분Ⅱ',
    status: 'active',
    note: '사용 가능',
    description: '수열의 극한, 미분법, 적분법 심화 중심의 사진 문제풀이',
    scope: '미적분Ⅱ 범위 안에서 풀이한다.',
    solverInstruction:
      '현재 활성 과목은 미적분Ⅱ이다. 제공된 미적분Ⅱ 개념카드를 우선 참고하고, 범위를 벗어나는 설명은 최소화한다.',
  },
  {
    id: 'probability',
    label: '확률과 통계',
    shortLabel: '확통',
    status: 'active',
    note: '사용 가능',
    description: '경우의 수, 확률, 통계 중심의 사진 문제풀이',
    scope: '확률과 통계 범위 안에서 풀이한다.',
    solverInstruction:
      '현재 활성 과목은 확률과 통계이다. 제공된 확률과 통계 개념카드를 우선 참고하고, 범위를 벗어나는 설명은 최소화한다.',
  },
  {
    id: 'geometry',
    label: '기하',
    shortLabel: '기하',
    status: 'active',
    note: '사용 가능',
    description: '벡터, 도형의 방정식, 공간도형 중심의 사진 문제풀이',
    scope: '기하 범위 안에서 풀이한다.',
    solverInstruction:
      '현재 활성 과목은 기하이다. 제공된 기하 개념카드를 우선 참고하고, 범위를 벗어나는 설명은 최소화한다.',
  },
];

export function getSubjectById(subjectId: string) {
  return SUBJECTS.find((subject) => subject.id === subjectId) ?? SUBJECTS[0];
}
