'use client';

import { useState } from 'react';

import { MarkdownViewer } from '@/components/markdown-viewer';
import { SUBJECTS, getSubjectById } from '@/lib/subjects';

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
  retrievedCards: RetrievedCardSummary[];
  markdown: string;
};

const SOLVING_SCOPE_LABEL = '전체 고등학교 수학 통합 풀이';
const SOLVING_SCOPE_SUBJECTS =
  '공통수학Ⅰ · 공통수학Ⅱ · 대수 · 미적분Ⅰ · 미적분Ⅱ · 확률과 통계 · 기하';

export default function HomePage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [recognizedProblem, setRecognizedProblem] = useState('');
  const [retrievedCards, setRetrievedCards] = useState<RetrievedCardSummary[]>([]);
  const [solutionMarkdown, setSolutionMarkdown] = useState('');
  const [error, setError] = useState('');
  const [reading, setReading] = useState(false);
  const [solving, setSolving] = useState(false);
  const [activeSubjectId, setActiveSubjectId] = useState('common-math-1');

  const activeSubject = getSubjectById(activeSubjectId);
  const canRead = !!selectedFile && !reading;
  const canSolve = !!recognizedProblem.trim() && !solving;

  function resetOutputs() {
    setRecognizedProblem('');
    setRetrievedCards([]);
    setSolutionMarkdown('');
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
    setSolutionMarkdown('');
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
    setSolutionMarkdown('');

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

      setRetrievedCards(data.retrievedCards);
      setSolutionMarkdown(data.markdown);
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
          <div className="app-brand">
            <span className="app-brand-mark">AI</span>
            <span className="app-brand-text">aibot</span>
          </div>
        </div>
      </header>

      <main className="app-page">
        <section className="scope-banner">
          <div>
            <p className="scope-label">문제풀이 범위</p>
            <h1>{SOLVING_SCOPE_LABEL}</h1>
            <p className="scope-subjects">{SOLVING_SCOPE_SUBJECTS}</p>
          </div>
        </section>

        <section className="subject-tabs-wrap">
          <div className="section-heading">
            <h2>과목별 개념노트</h2>
            <p>과목 탭은 개념노트 탐색용입니다. 문제풀이는 과목 선택 없이 전체 수학 범위에서 진행됩니다.</p>
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
            <div className="inline-notice">
              이 과목의 학생용 개념노트는 아직 연결 전입니다. 문제풀이는 과목 선택 없이 전체 수학 범위에서 가능합니다.
            </div>
          </div>
        </section>

        <section className="app-grid">
          <article className="main-card upload-card">
            <div className="card-head">
              <h2>문제 사진 올리기</h2>
              <span className="card-badge">{SOLVING_SCOPE_LABEL}</span>
            </div>

            <label className={`upload-dropzone${previewUrl ? ' has-preview' : ''}`}>
              <input
                type="file"
                accept="image/*"
                onChange={(event) => handleFileChange(event.target.files?.[0] ?? null)}
              />
              {previewUrl ? (
                <img src={previewUrl} alt="업로드한 문제 미리보기" className="preview-image" />
              ) : (
                <div className="upload-empty">
                  <strong>문제 사진을 선택하거나 끌어다 놓아 보세요.</strong>
                  <span>문제가 또렷하게 보이는 사진일수록 더 정확하게 읽을 수 있어요.</span>
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
                    {solving ? '풀이 생성 중...' : '풀이 시작'}
                  </button>
                </div>
              </div>
            ) : null}

            {error ? <div className="error-banner">{error}</div> : null}

            <div className="sub-card">
              <div className="sub-card-head">
                <h2>문제 읽기</h2>
              </div>
              <div className="recognized-problem">
                <MarkdownViewer
                  content={recognizedProblem.trim() || '문제를 읽으면 여기에 정리됩니다.'}
                />
              </div>
            </div>

            {!!retrievedCards.length ? (
              <div className="sub-card">
                <div className="sub-card-head">
                  <h2>사용 개념카드</h2>
                  <span className="sub-card-meta">상위 {retrievedCards.length}개</span>
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
              <h2>통합 문제풀이</h2>
              <span className="card-badge">7개 섹션</span>
            </div>

            {solutionMarkdown ? (
              <MarkdownViewer content={solutionMarkdown} />
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
