'use client';

import { useState } from 'react';

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
  solvingScope?: {
    label: string;
    subjects: string[];
  };
  recognizedProblem: string;
  retrievedCards?: RetrievedCardSummary[];
  sections: SolverSections;
  markdown: string;
};

const SOLVING_SCOPE_LABEL = '전체 고등학교 수학 통합 풀이';
const SOLVING_SCOPE_SUBJECTS = [
  '공통수학Ⅰ',
  '공통수학Ⅱ',
  '대수',
  '미적분Ⅰ',
  '미적분Ⅱ',
  '확률과 통계',
  '기하',
];

const FLOW_STEPS = ['1. 사진 업로드', '2. 문제 인식', '3. 단계별 풀이'];
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

  function resetOutputs() {
    setRecognizedProblem('');
    setRetrievedCards([]);
    setSolutionSections(null);
    setError('');
  }

  function handleFileChange(file: File | null) {
    setSelectedFile(file);
    resetOutputs();

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setPreviewUrl(file ? URL.createObjectURL(file) : '');
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
            <div className="brand-copy">
              <span className="brand-name">풀리</span>
            </div>
          </div>
          <button type="button" className="hero-launch-button">
            시작하기
          </button>
        </div>
      </header>

      <main className="app-page">
        <section className="flow-tabs" aria-label="문제풀이 단계">
          {FLOW_STEPS.map((step, index) => (
            <div key={step} className={`flow-tab${index === 0 ? ' is-active' : ''}`}>
              {step}
            </div>
          ))}
        </section>

        <section className="hero-panel">
          <div className="hero-copy">
            <p className="hero-eyebrow">AI 수학 풀이 도우미</p>
            <h1>
              수학 문제, 사진만 올리면
              <br />
              <span>풀리</span>가 읽고 풀어줘요.
            </h1>
            <p className="hero-description">
              과목을 고를 필요 없이 전체 고등학교 수학 범위에서 필요한 개념을 찾고,
              단계별 풀이로 정리해 드려요.
            </p>
            <div className="hero-scope-card">
              <p className="scope-title">문제풀이 범위</p>
              <p className="scope-main">{SOLVING_SCOPE_LABEL}</p>
              <p className="scope-list">{SOLVING_SCOPE_SUBJECTS.join(' · ')}</p>
            </div>
          </div>

          <aside className="hero-assistant-card">
            <div className="hero-assistant-bubble">
              사진 업로드부터 풀이 전략, 정답 확인까지 한 화면에서 도와드릴게요.
            </div>
            <img src="/robot-mascot.png" alt="수학 도우미 로봇" className="hero-robot" />
          </aside>
        </section>

        <section className="subject-tabs-wrap">
          <div className="section-heading">
            <h2>과목별 개념노트</h2>
          </div>

          <div className="subject-tabs">
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
                  <span className="subject-tab-note">{subject.note}</span>
                </button>
              );
            })}
          </div>

          <div className="subject-note-panel">
            <div className="subject-note-head">
              <strong>{activeSubject.label}</strong>
              <span>{activeSubject.scope}</span>
            </div>
            <p>{activeSubject.description}</p>
          </div>
        </section>

        <section className={`app-grid${hasSolution ? ' has-solution' : ''}`}>
          <article className={`main-card upload-card${hasSolution ? ' is-compact' : ''}`}>
            <div className="card-head">
              <div>
                <h2>{hasSolution ? '새 문제 준비' : '문제 사진 올리기'}</h2>
                <p className="card-subtitle">
                  {hasSolution
                    ? '다른 문제를 풀고 싶다면 새 사진을 올려 주세요.'
                    : 'PNG, JPG 파일을 올리면 문제를 읽고 풀이를 준비합니다.'}
                </p>
              </div>
            </div>

            <label className={`upload-dropzone${previewUrl ? ' has-preview' : ''}${hasSolution ? ' is-compact' : ''}`}>
              <input
                type="file"
                accept="image/*"
                onChange={(event) => handleFileChange(event.target.files?.[0] ?? null)}
              />
              {previewUrl ? (
                <img src={previewUrl} alt="업로드한 문제 미리보기" className={`preview-image${hasSolution ? ' is-compact' : ''}`} />
              ) : (
                <div className="upload-empty">
                  <div className="upload-icon">📷</div>
                  <strong>문제 사진을 올려 주세요.</strong>
                  <span>선명한 사진일수록 수식 인식이 더 정확해져요.</span>
                </div>
              )}
            </label>

            {previewUrl ? (
              <div className="upload-toolbar">
                <button type="button" className="ghost-button" onClick={() => handleFileChange(null)}>
                  사진 지우기
                </button>
                <div className="primary-actions">
                  <button type="button" className="ghost-button" onClick={handleReadProblem} disabled={!canRead}>
                    {reading ? '문제 읽는 중...' : '문제 읽기'}
                  </button>
                  <button type="button" className="primary-button" onClick={handleSolve} disabled={!canSolve}>
                    {solving ? '풀이 생성 중...' : hasSolution ? '새 문제 풀기' : '풀이 시작'}
                  </button>
                </div>
              </div>
            ) : null}

            {error ? <div className="error-banner">{error}</div> : null}

            <div className="sub-card recognized-card">
              <div className="sub-card-head">
                <h2>문제 읽기</h2>
                <span className="sub-card-meta">OCR 결과</span>
              </div>
              <div className="recognized-problem">
                <MarkdownViewer content={recognizedProblem.trim() || '문제를 읽으면 여기에 정리됩니다.'} />
              </div>
            </div>

            {showDebugConcepts && retrievedCards.length ? (
              <div className="sub-card concept-results-card">
                <div className="sub-card-head">
                  <h2>디버그 개념카드</h2>
                  <span className="sub-card-meta">개발용</span>
                </div>
                <ul className="concept-card-list">
                  {retrievedCards.map((card) => (
                    <li key={card.id} className="concept-card">
                      <p className="concept-card-title">
                        [{card.course}] {card.id} {card.title}
                      </p>
                      <p className="concept-card-detail">단원: {card.unit}</p>
                      <p className="concept-card-detail">관련도: {card.score}점</p>
                      {card.matchedTerms?.length ? (
                        <p className="concept-card-detail">매칭 근거: {card.matchedTerms.join(', ')}</p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </article>

          <article className="main-card solution-card">
            <div className="card-head">
              <div>
                <h2>풀리의 풀이</h2>
                <p className="card-subtitle">풀리가 문제를 읽고, 풀이 과정을 차근차근 정리했어요.</p>
              </div>
              <span className="card-badge">6개 섹션</span>
            </div>

            {solutionSections ? (
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
            ) : (
              <div className="solution-empty">
                <div className="solution-empty-line is-strong" />
                <div className="solution-empty-line" />
                <div className="solution-empty-line" />
                <div className="solution-empty-block" />
                <div className="solution-empty-line is-short" />
                <div className="solution-empty-line" />
              </div>
            )}
          </article>
        </section>
      </main>
    </div>
  );
}
