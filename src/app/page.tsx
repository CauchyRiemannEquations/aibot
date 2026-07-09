'use client';

import { useEffect, useState } from 'react';

import { MarkdownViewer } from '@/components/markdown-viewer';
import { SolutionStep } from '@/components/solution-step';
import { SUBJECTS, getSubjectById } from '@/lib/subjects';
import type { SolverSections } from '@/lib/types';

type RetrievedCardSummary = {
  id: string;
  course: string;
  unit: string;
  title: string;
  score: number;
  matchedTerms?: string[];
};

type SolveResponse = {
  recognizedProblem: string;
  retrievedCards?: RetrievedCardSummary[];
  sections: SolverSections;
  markdown: string;
};

const showDebugConcepts = process.env.NEXT_PUBLIC_SHOW_DEBUG_CONCEPTS === 'true';

const solutionStepConfigs: Array<{
  key: keyof Omit<SolverSections, 'usedConcepts'>;
  title: string;
  defaultOpen: boolean;
  tone?: 'default' | 'answer' | 'tip';
}> = [
  { key: 'problemReading', title: '문제 읽기', defaultOpen: false },
  { key: 'strategy', title: '풀이 전략', defaultOpen: true },
  { key: 'stepByStep', title: '단계별 풀이', defaultOpen: true },
  { key: 'answer', title: '정답 확인', defaultOpen: true, tone: 'answer' },
  { key: 'check', title: '검산하기', defaultOpen: false },
  { key: 'similarTip', title: '비슷한 문제는 이렇게 풀어요', defaultOpen: false, tone: 'tip' },
];

export default function HomePage() {
  // Keep the page state in one place so later TSX edits stay easy.
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [recognizedProblem, setRecognizedProblem] = useState('');
  const [retrievedCards, setRetrievedCards] = useState<RetrievedCardSummary[]>([]);
  const [solutionSections, setSolutionSections] = useState<SolverSections | null>(null);
  const [error, setError] = useState('');
  const [reading, setReading] = useState(false);
  const [solving, setSolving] = useState(false);
  const [activeSubjectId, setActiveSubjectId] = useState('common-math-1');

  const activeSubject = getSubjectById(activeSubjectId);
  const canRead = !!selectedFile && !reading;
  const canSolve = !!recognizedProblem.trim() && !solving;
  const hasSolution = solutionSections !== null;

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  function resetOutputs() {
    setRecognizedProblem('');
    setRetrievedCards([]);
    setSolutionSections(null);
    setError('');
  }

  function handleFileChange(file: File | null) {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setSelectedFile(file);
    setPreviewUrl(file ? URL.createObjectURL(file) : '');
    resetOutputs();
  }

  async function handleReadProblem() {
    if (!selectedFile) {
      setError('문제 사진을 먼저 올려 주세요.');
      return;
    }

    setReading(true);
    setError('');
    setSolutionSections(null);
    setRetrievedCards([]);

    try {
      const formData = new FormData();
      formData.append('image', selectedFile);

      const response = await fetch('/api/read-problem', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '문제를 읽지 못했어요.');
      }

      setRecognizedProblem(data.recognizedProblem);
    } catch (err) {
      setError(err instanceof Error ? err.message : '문제를 읽지 못했어요.');
    } finally {
      setReading(false);
    }
  }

  async function handleSolve() {
    if (!recognizedProblem.trim()) {
      setError('문제를 먼저 읽어 주세요.');
      return;
    }

    setSolving(true);
    setError('');

    try {
      const response = await fetch('/api/solve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recognizedProblem,
        }),
      });

      const data = (await response.json()) as SolveResponse & { error?: string };

      if (!response.ok) {
        throw new Error(data.error || '풀이를 만들지 못했어요.');
      }

      setRetrievedCards(data.retrievedCards ?? []);
      setSolutionSections(data.sections);
    } catch (err) {
      setError(err instanceof Error ? err.message : '풀이를 만들지 못했어요.');
    } finally {
      setSolving(false);
    }
  }

  return (
    <div className="app-shell">
      <header className="app-topbar">
        <div className="app-topbar-inner">
          <div className="brand-lockup">
            <div className="brand-logo-wrap">
              <img src="/robot-mascot.png" alt="풀리 로봇 마스코트" className="brand-logo" />
            </div>
            <span className="brand-name">풀리</span>
          </div>
        </div>
      </header>

      <main className="app-page app-page-simple">
        <section className="subject-nav">
          {/* Subject tabs stay as placeholders for future concept-note screens. */}
          <div className="subject-tabs subject-tabs-simple">
            {SUBJECTS.map((subject) => {
              const isActive = subject.id === activeSubjectId;

              return (
                <button
                  key={subject.id}
                  type="button"
                  className={`subject-tab${isActive ? ' is-active' : ''}`}
                  onClick={() => setActiveSubjectId(subject.id)}
                >
                  <span className="subject-tab-label">{subject.shortLabel}</span>
                </button>
              );
            })}
          </div>
        </section>

        <section className={`main-layout${hasSolution ? ' has-solution' : ''}`}>
          <article className={`main-card upload-card upload-card-simple${hasSolution ? ' is-compact' : ''}`}>
            {/* 첫 화면은 업로드만 보이도록 제목과 설명을 덜어낸 상태입니다. */}
            <label
              className={`upload-dropzone upload-dropzone-simple${previewUrl ? ' has-preview' : ''}${
                hasSolution ? ' is-compact' : ''
              }`}
            >
              <input
                type="file"
                accept="image/*"
                onChange={(event) => handleFileChange(event.target.files?.[0] ?? null)}
              />

              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt="\uC5C5\uB85C\uB4DC\uD55C \uBB38\uC81C \uBBF8\uB9AC\uBCF4\uAE30"
                  className={`preview-image${hasSolution ? ' is-compact' : ''}`}
                />
              ) : (
                <div className="upload-empty upload-empty-simple">
                  <span className="upload-file-chip">문제 사진 올리기</span>
                  <img src="/robot-mascot.png" alt="문제 안내 로봇" className="upload-mascot" />
                </div>
              )}
            </label>

            {previewUrl ? (
              <div className="upload-toolbar upload-toolbar-simple">
                <div className="primary-actions primary-actions-simple">
                  <button type="button" className="ghost-button" onClick={() => handleFileChange(null)}>
                    새 문제
                  </button>
                  <button type="button" className="ghost-button" onClick={handleReadProblem} disabled={!canRead}>
                    {reading ? '읽는 중...' : '문제 읽기'}
                  </button>
                  <button type="button" className="primary-button" onClick={handleSolve} disabled={!canSolve}>
                    {solving ? '풀이 생성 중...' : '풀어주세요'}
                  </button>
                </div>
              </div>
            ) : null}

            {error ? <div className="error-banner">{error}</div> : null}

            {hasSolution && recognizedProblem ? (
              <div className="sub-card recognized-card recognized-card-simple">
                <div className="sub-card-head">
                  <h2>문제 읽기</h2>
                </div>
                <div className="recognized-problem">
                  <MarkdownViewer content={recognizedProblem} />
                </div>
              </div>
            ) : null}

            {showDebugConcepts && retrievedCards.length ? (
              <div className="sub-card concept-results-card">
                <div className="sub-card-head">
                  <h2>디버그 개념카드</h2>
                </div>
                <ul className="concept-card-list">
                  {retrievedCards.map((card) => (
                    <li key={card.id} className="concept-card">
                      <p className="concept-card-title">
                        [{card.course}] {card.id} {card.title}
                      </p>
                      <p className="concept-card-detail">{`단원: ${card.unit}`}</p>
                      <p className="concept-card-detail">{`관련도: ${card.score}점`}</p>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </article>

          {hasSolution ? (
            <article className="main-card solution-card solution-card-simple">
            {/* Keep the report simple: students should land on the solution, not debug metadata. */}
            <div className="card-head card-head-simple">
              <div>
                <h2>풀리의 풀이</h2>
                <p className="card-subtitle">문제를 읽고 풀이 과정을 차근차근 정리했어요.</p>
              </div>
            </div>

              <div className="solution-report">
                {solutionStepConfigs.map((step, index) => (
                  <SolutionStep
                    key={step.key}
                    number={index + 1}
                    title={step.title}
                    content={solutionSections[step.key]}
                    defaultOpen={step.defaultOpen}
                    tone={step.tone}
                  />
                ))}
              </div>
            </article>
          ) : null}
        </section>
      </main>
    </div>
  );
}
