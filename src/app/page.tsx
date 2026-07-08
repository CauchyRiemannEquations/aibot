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
const SOLVING_SCOPE_SUBJECTS = [
  '공통수학Ⅰ',
  '공통수학Ⅱ',
  '대수',
  '미적분Ⅰ',
  '미적분Ⅱ',
  '확률과 통계',
  '기하',
];

const FLOW_STEPS = [
  '1. 사진 업로드',
  '2. 문제 인식',
  '3. 단계별 풀이',
];

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
          <div className="brand-lockup">
            <div className="brand-logo-wrap">
              <img src="/robot-mascot.png" alt="풀이 로봇 마스코트" className="brand-logo" />
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
              사진 업로드부터 사용 개념 정리까지 한 화면에서 도와드릴게요.
            </div>
            <img src="/robot-mascot.png" alt="수학 도우미 로봇" className="hero-robot" />
          </aside>
        </section>

        <section className="subject-tabs-wrap">
          <div className="section-heading">
            <h2>과목별 개념노트</h2>
            <p>탭은 개념 탐색용이에요. 문제풀이는 어떤 탭을 눌러도 항상 전체 수학 범위에서 진행됩니다.</p>
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
              <div>
                <h2>문제 사진 올리기</h2>
                <p className="card-subtitle">PNG, JPG 파일을 올리면 문제를 읽고 풀이를 준비합니다.</p>
              </div>
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
                    {solving ? '풀이 생성 중...' : '풀이 시작'}
                  </button>
                </div>
              </div>
            ) : null}

            {error ? <div className="error-banner">{error}</div> : null}

            <div className="sub-card">
              <div className="sub-card-head">
                <h2>문제 읽기</h2>
                <span className="sub-card-meta">OCR 결과</span>
              </div>
              <div className="recognized-problem">
                <MarkdownViewer content={recognizedProblem.trim() || '문제를 읽으면 여기에 정리됩니다.'} />
              </div>
            </div>
          </article>

          <article className="main-card side-panel-card">
            <div className="card-head">
              <div>
                <h2>풀이 준비 현황</h2>
                <p className="card-subtitle">문제를 읽고 관련 개념을 모아 보여드려요.</p>
              </div>
            </div>

            <div className="status-stack">
              <div className="status-card">
                <div className="status-icon is-blue">1</div>
                <div>
                  <strong>사진 업로드</strong>
                  <p>{selectedFile ? '사진이 업로드되었어요.' : '문제 사진을 올리면 여기서 확인해요.'}</p>
                </div>
              </div>
              <div className="status-card">
                <div className="status-icon is-emerald">2</div>
                <div>
                  <strong>문제 인식</strong>
                  <p>{recognizedProblem ? '문제를 읽었어요. 바로 풀이를 시작할 수 있어요.' : '문제를 읽으면 수식과 문장을 정리해 드려요.'}</p>
                </div>
              </div>
              <div className="status-card">
                <div className="status-icon is-purple">3</div>
                <div>
                  <strong>통합 풀이</strong>
                  <p>{solutionMarkdown ? '단계별 풀이가 준비되었어요.' : '관련 개념카드를 모아서 7개 섹션으로 풀이해 드려요.'}</p>
                </div>
              </div>
            </div>

            <div className="mini-robot-card">
              <img src="/robot-mascot.png" alt="풀리 마스코트" className="mini-robot" />
              <p>문제 안에 여러 과목 개념이 섞여 있어도 함께 찾아서 정리해 드릴게요.</p>
            </div>

            {!!retrievedCards.length ? (
              <div className="sub-card concept-results-card">
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
        </section>

        <section className="solution-section">
          <article className="main-card solution-card">
            <div className="card-head">
              <div>
                <h2>통합 문제풀이</h2>
                <p className="card-subtitle">문제 읽기, 사용 개념, 단계별 풀이, 검산까지 한 번에 정리합니다.</p>
              </div>
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
