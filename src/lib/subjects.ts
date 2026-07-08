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
    label: '\uACF5\uD1B5\uC218\uD559\u2160',
    shortLabel: '\uACF5\uD1B5\uC218\uD559\u2160',
    status: 'active',
    note: '\uCD94\uAC00 \uC81C\uACF5 \uC608\uC815',
    description: '\uCD94\uAC00 \uC81C\uACF5 \uC608\uC815',
    scope: '\uACF5\uD1B5\uC218\uD559\u2160',
    solverInstruction:
      '\uACF5\uD1B5\uC218\uD559\u2160 \uAC1C\uB150\uCE74\uB4DC\uB97C \uC6B0\uC120 \uCC38\uACE0\uD558\uB418, \uC2E4\uC81C \uBB38\uC81C\uD480\uC774\uC5D0\uC11C\uB294 \uB2E4\uB978 \uACFC\uBAA9 \uAC1C\uB150\uB3C4 \uD568\uAED8 \uD65C\uC6A9\uD55C\uB2E4.',
  },
  {
    id: 'common-math-2',
    label: '\uACF5\uD1B5\uC218\uD559\u2161',
    shortLabel: '\uACF5\uD1B5\uC218\uD559\u2161',
    status: 'active',
    note: '\uCD94\uAC00 \uC81C\uACF5 \uC608\uC815',
    description: '\uCD94\uAC00 \uC81C\uACF5 \uC608\uC815',
    scope: '\uACF5\uD1B5\uC218\uD559\u2161',
    solverInstruction:
      '\uACF5\uD1B5\uC218\uD559\u2161 \uAC1C\uB150\uCE74\uB4DC\uB97C \uC6B0\uC120 \uCC38\uACE0\uD558\uB418, \uC2E4\uC81C \uBB38\uC81C\uD480\uC774\uC5D0\uC11C\uB294 \uB2E4\uB978 \uACFC\uBAA9 \uAC1C\uB150\uB3C4 \uD568\uAED8 \uD65C\uC6A9\uD55C\uB2E4.',
  },
  {
    id: 'algebra',
    label: '\uB300\uC218',
    shortLabel: '\uB300\uC218',
    status: 'active',
    note: '\uCD94\uAC00 \uC81C\uACF5 \uC608\uC815',
    description: '\uCD94\uAC00 \uC81C\uACF5 \uC608\uC815',
    scope: '\uB300\uC218',
    solverInstruction:
      '\uB300\uC218 \uAC1C\uB150\uCE74\uB4DC\uB97C \uC6B0\uC120 \uCC38\uACE0\uD558\uB418, \uC2E4\uC81C \uBB38\uC81C\uD480\uC774\uC5D0\uC11C\uB294 \uB2E4\uB978 \uACFC\uBAA9 \uAC1C\uB150\uB3C4 \uD568\uAED8 \uD65C\uC6A9\uD55C\uB2E4.',
  },
  {
    id: 'calculus-1',
    label: '\uBBF8\uC801\uBD84\u2160',
    shortLabel: '\uBBF8\uC801\uBD84\u2160',
    status: 'active',
    note: '\uCD94\uAC00 \uC81C\uACF5 \uC608\uC815',
    description: '\uCD94\uAC00 \uC81C\uACF5 \uC608\uC815',
    scope: '\uBBF8\uC801\uBD84\u2160',
    solverInstruction:
      '\uBBF8\uC801\uBD84\u2160 \uAC1C\uB150\uCE74\uB4DC\uB97C \uC6B0\uC120 \uCC38\uACE0\uD558\uB418, \uC2E4\uC81C \uBB38\uC81C\uD480\uC774\uC5D0\uC11C\uB294 \uB2E4\uB978 \uACFC\uBAA9 \uAC1C\uB150\uB3C4 \uD568\uAED8 \uD65C\uC6A9\uD55C\uB2E4.',
  },
  {
    id: 'calculus-2',
    label: '\uBBF8\uC801\uBD84\u2161',
    shortLabel: '\uBBF8\uC801\uBD84\u2161',
    status: 'active',
    note: '\uCD94\uAC00 \uC81C\uACF5 \uC608\uC815',
    description: '\uCD94\uAC00 \uC81C\uACF5 \uC608\uC815',
    scope: '\uBBF8\uC801\uBD84\u2161',
    solverInstruction:
      '\uBBF8\uC801\uBD84\u2161 \uAC1C\uB150\uCE74\uB4DC\uB97C \uC6B0\uC120 \uCC38\uACE0\uD558\uB418, \uC2E4\uC81C \uBB38\uC81C\uD480\uC774\uC5D0\uC11C\uB294 \uB2E4\uB978 \uACFC\uBAA9 \uAC1C\uB150\uB3C4 \uD568\uAED8 \uD65C\uC6A9\uD55C\uB2E4.',
  },
  {
    id: 'probability',
    label: '\uD655\uB960\uACFC \uD1B5\uACC4',
    shortLabel: '\uD655\uB960\uACFC \uD1B5\uACC4',
    status: 'active',
    note: '\uCD94\uAC00 \uC81C\uACF5 \uC608\uC815',
    description: '\uCD94\uAC00 \uC81C\uACF5 \uC608\uC815',
    scope: '\uD655\uB960\uACFC \uD1B5\uACC4',
    solverInstruction:
      '\uD655\uB960\uACFC \uD1B5\uACC4 \uAC1C\uB150\uCE74\uB4DC\uB97C \uC6B0\uC120 \uCC38\uACE0\uD558\uB418, \uC2E4\uC81C \uBB38\uC81C\uD480\uC774\uC5D0\uC11C\uB294 \uB2E4\uB978 \uACFC\uBAA9 \uAC1C\uB150\uB3C4 \uD568\uAED8 \uD65C\uC6A9\uD55C\uB2E4.',
  },
  {
    id: 'geometry',
    label: '\uAE30\uD558',
    shortLabel: '\uAE30\uD558',
    status: 'active',
    note: '\uCD94\uAC00 \uC81C\uACF5 \uC608\uC815',
    description: '\uCD94\uAC00 \uC81C\uACF5 \uC608\uC815',
    scope: '\uAE30\uD558',
    solverInstruction:
      '\uAE30\uD558 \uAC1C\uB150\uCE74\uB4DC\uB97C \uC6B0\uC120 \uCC38\uACE0\uD558\uB418, \uC2E4\uC81C \uBB38\uC81C\uD480\uC774\uC5D0\uC11C\uB294 \uB2E4\uB978 \uACFC\uBAA9 \uAC1C\uB150\uB3C4 \uD568\uAED8 \uD65C\uC6A9\uD55C\uB2E4.',
  },
];

export function getSubjectById(subjectId: string) {
  return SUBJECTS.find((subject) => subject.id === subjectId) ?? SUBJECTS[0];
}
