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
    note: '추가 제공 예정',
    description: '추가 제공 예정',
    scope: '공통수학Ⅰ만 사용',
    solverInstruction: '공통수학Ⅰ 범위 안에서만 풀이한다.',
  },
  {
    id: 'common-math-2',
    label: '공통수학Ⅱ',
    shortLabel: '공통수학Ⅱ',
    status: 'active',
    note: '추가 제공 예정',
    description: '추가 제공 예정',
    scope: '공통수학Ⅰ, 공통수학Ⅱ 사용',
    solverInstruction: '공통수학Ⅰ과 공통수학Ⅱ 범위 안에서 풀이한다.',
  },
  {
    id: 'algebra',
    label: '대수',
    shortLabel: '대수',
    status: 'active',
    note: '추가 제공 예정',
    description: '추가 제공 예정',
    scope: '공통수학Ⅰ, 공통수학Ⅱ, 대수 사용',
    solverInstruction: '공통수학Ⅰ, 공통수학Ⅱ, 대수 범위 안에서 풀이한다.',
  },
  {
    id: 'calculus-1',
    label: '미적분Ⅰ',
    shortLabel: '미적분Ⅰ',
    status: 'active',
    note: '추가 제공 예정',
    description: '추가 제공 예정',
    scope: '공통수학Ⅰ, 공통수학Ⅱ, 대수, 미적분Ⅰ 사용',
    solverInstruction: '공통수학Ⅰ, 공통수학Ⅱ, 대수, 미적분Ⅰ 범위 안에서 풀이한다.',
  },
  {
    id: 'probability',
    label: '확률과 통계',
    shortLabel: '확률과 통계',
    status: 'active',
    note: '추가 제공 예정',
    description: '추가 제공 예정',
    scope: '미적분Ⅱ를 제외한 관련 과목 사용',
    solverInstruction:
      '공통수학Ⅰ, 공통수학Ⅱ, 대수, 미적분Ⅰ, 확률과 통계, 기하 범위 안에서 필요한 개념만 사용해 풀이한다.',
  },
  {
    id: 'geometry',
    label: '기하',
    shortLabel: '기하',
    status: 'active',
    note: '추가 제공 예정',
    description: '추가 제공 예정',
    scope: '미적분Ⅱ를 제외한 관련 과목 사용',
    solverInstruction:
      '공통수학Ⅰ, 공통수학Ⅱ, 대수, 미적분Ⅰ, 확률과 통계, 기하 범위 안에서 필요한 개념만 사용해 풀이한다.',
  },
  {
    id: 'calculus-2',
    label: '미적분Ⅱ',
    shortLabel: '미적분Ⅱ',
    status: 'active',
    note: '추가 제공 예정',
    description: '추가 제공 예정',
    scope: '전체 과목 사용',
    solverInstruction: '공통수학Ⅰ, 공통수학Ⅱ, 대수, 미적분Ⅰ, 확률과 통계, 기하, 미적분Ⅱ 전체 범위를 활용해 풀이한다.',
  },
];

export function getSubjectById(subjectId: string) {
  return SUBJECTS.find((subject) => subject.id === subjectId) ?? SUBJECTS[0];
}
