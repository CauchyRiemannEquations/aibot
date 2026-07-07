export type SubjectDefinition = {
  id: string;
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
    id: 'calculus-1',
    label: '미적분Ⅰ',
    shortLabel: '미적분Ⅰ',
    status: 'active',
    note: '현재 사용 가능',
    description: '극한, 연속, 미분, 적분 중심의 사진 문제풀이',
    scope: '미적분Ⅰ 범위 안에서 풀이한다.',
    solverInstruction:
      '현재 활성 과목은 미적분Ⅰ이다. 제공된 개념카드를 우선 참고하고, 범위를 벗어나는 설명은 최소화한다.',
  },
  {
    id: 'calculus-2',
    label: '미적분Ⅱ',
    shortLabel: '미적분Ⅱ',
    status: 'planned',
    note: '다음 과목 예정',
    description: '추가 단원 카드와 프롬프트를 연결할 예정',
    scope: '아직 풀이 기능이 준비되지 않았다.',
    solverInstruction:
      '이 과목은 아직 준비 중이다. 실제 풀이를 생성하지 말고 준비 중 안내를 우선한다.',
  },
  {
    id: 'geometry',
    label: '기하',
    shortLabel: '기하',
    status: 'planned',
    note: '추가 예정',
    description: '도형과 벡터 유형을 위해 별도 카드셋이 필요함',
    scope: '아직 풀이 기능이 준비되지 않았다.',
    solverInstruction:
      '이 과목은 아직 준비 중이다. 실제 풀이를 생성하지 말고 준비 중 안내를 우선한다.',
  },
  {
    id: 'probability',
    label: '확률과 통계',
    shortLabel: '확통',
    status: 'planned',
    note: '추가 예정',
    description: '경우의 수, 확률, 통계 카드셋 추가 예정',
    scope: '아직 풀이 기능이 준비되지 않았다.',
    solverInstruction:
      '이 과목은 아직 준비 중이다. 실제 풀이를 생성하지 말고 준비 중 안내를 우선한다.',
  },
];

export function getSubjectById(subjectId: string) {
  return SUBJECTS.find((subject) => subject.id === subjectId) ?? SUBJECTS[0];
}
