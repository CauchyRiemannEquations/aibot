export type ConceptCard = {
  id: string;
  course: string;
  unit: string;
  category: string;
  title: string;
  visibility: 'ai_reference_only' | 'ai_reference';
  retrieval_text: string;
  core_principle: string;
  solver_steps: string[];
  common_mistakes: string[];
  ai_solver_instruction: string;
  representative_example: string;
  keywords: string[];
  student_facing_note_included?: boolean;
  source?: {
    basis?: string;
    version?: string;
  };
};

export type RetrievedCard = ConceptCard & {
  score: number;
  matchedTerms: string[];
};

export type SectionKey =
  | 'problemReading'
  | 'usedConcepts'
  | 'strategy'
  | 'stepByStep'
  | 'answer'
  | 'check'
  | 'similarTip';

export type SolverSections = Record<SectionKey, string>;

export type SubjectId =
  | 'calculus-1'
  | 'calculus-2'
  | 'geometry'
  | 'probability';
