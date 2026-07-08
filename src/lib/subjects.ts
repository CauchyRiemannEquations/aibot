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
    note: '노트 연결 예정',
    description: '식의 연산, 방정식과 부등식, 기본적인 경우의 수를 다루는 과목입니다.',
    scope: '공통수학Ⅰ 범위의 개념노트를 탐색합니다.',
    solverInstruction:
      '공통수학Ⅰ 개념카드를 먼저 살피되, 실제 문제풀이에서는 다른 과목의 연결 개념도 함께 참고할 수 있다.',
  },
  {
    id: 'common-math-2',
    label: '공통수학Ⅱ',
    shortLabel: '공통수학Ⅱ',
    status: 'active',
    note: '노트 연결 예정',
    description: '함수, 좌표기하, 수열의 기초를 다루는 과목입니다.',
    scope: '공통수학Ⅱ 범위의 개념노트를 탐색합니다.',
    solverInstruction:
      '공통수학Ⅱ 개념카드를 먼저 살피되, 실제 문제풀이에서는 다른 과목의 연결 개념도 함께 참고할 수 있다.',
  },
  {
    id: 'algebra',
    label: '대수',
    shortLabel: '대수',
    status: 'active',
    note: '노트 연결 예정',
    description: '지수함수와 로그함수, 삼각함수, 수열을 다루는 과목입니다.',
    scope: '대수 범위의 개념노트를 탐색합니다.',
    solverInstruction:
      '대수 개념카드를 먼저 살피되, 실제 문제풀이에서는 다른 과목의 연결 개념도 함께 참고할 수 있다.',
  },
  {
    id: 'calculus-1',
    label: '미적분Ⅰ',
    shortLabel: '미적분Ⅰ',
    status: 'active',
    note: '노트 연결 예정',
    description: '함수의 극한, 연속, 미분, 적분의 기초를 다루는 과목입니다.',
    scope: '미적분Ⅰ 범위의 개념노트를 탐색합니다.',
    solverInstruction:
      '미적분Ⅰ 개념카드를 먼저 살피되, 실제 문제풀이에서는 다른 과목의 연결 개념도 함께 참고할 수 있다.',
  },
  {
    id: 'calculus-2',
    label: '미적분Ⅱ',
    shortLabel: '미적분Ⅱ',
    status: 'active',
    note: '노트 연결 예정',
    description: '수열의 극한과 미적분의 심화 내용을 다루는 과목입니다.',
    scope: '미적분Ⅱ 범위의 개념노트를 탐색합니다.',
    solverInstruction:
      '미적분Ⅱ 개념카드를 먼저 살피되, 실제 문제풀이에서는 다른 과목의 연결 개념도 함께 참고할 수 있다.',
  },
  {
    id: 'probability',
    label: '확률과 통계',
    shortLabel: '확률과 통계',
    status: 'active',
    note: '노트 연결 예정',
    description: '경우의 수, 확률, 통계를 다루는 과목입니다.',
    scope: '확률과 통계 범위의 개념노트를 탐색합니다.',
    solverInstruction:
      '확률과 통계 개념카드를 먼저 살피되, 실제 문제풀이에서는 다른 과목의 연결 개념도 함께 참고할 수 있다.',
  },
  {
    id: 'geometry',
    label: '기하',
    shortLabel: '기하',
    status: 'active',
    note: '노트 연결 예정',
    description: '벡터, 이차곡선, 공간도형과 좌표를 다루는 과목입니다.',
    scope: '기하 범위의 개념노트를 탐색합니다.',
    solverInstruction:
      '기하 개념카드를 먼저 살피되, 실제 문제풀이에서는 다른 과목의 연결 개념도 함께 참고할 수 있다.',
  },
];

export function getSubjectById(subjectId: string) {
  return SUBJECTS.find((subject) => subject.id === subjectId) ?? SUBJECTS[0];
}
