'use client';

import { useState } from 'react';

import { MarkdownViewer } from '@/components/markdown-viewer';
import { SUBJECTS, getSubjectById } from '@/lib/subjects';

type RetrievedCardSummary = {
  id: string;
  title: string;
  unit: string;
  score: number;
};

type SolveResponse = {
  subject?: {
    id: string;
    label: string;
  };
  recognizedProblem: string;
  retrievedCards: RetrievedCardSummary[];
  markdown: string;
};

const FLOW_STEPS = [
  '사진 업로드',
  '문제 읽기',
  '개념카드 검색',
  '7개 섹션 풀이',
];

function getCurrentStep(reading: boolean, recognizedProblem: string, solving: boolean) {
  if (solving) {
    return 4;
  }

  if (recognizedProblem.trim()) {
    return 3;
  }

  if (reading) {
    return 2;
  }

  return 1;
}

export default function HomePage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [recognizedProblem, setRecognizedProblem] = useState('');
  const [retrievedCards, setRetrievedCards] = useState<RetrievedCardSummary[]>([]);
  const [solutionMarkdown, setSolutionMarkdown] = useState('');
  const [error, setError] = useState('');
  const [reading, setReading] = useState(false);
  const [solving, setSolving] = useState(false);
  const [activeSubjectId, setActiveSubjectId] = useState('calculus-1');

  const canRead = !!selectedFile && !reading;
  const canSolve = !!recognizedProblem && !solving;
  const currentStep = getCurrentStep(reading, recognizedProblem, solving);
  const activeSubject = getSubjectById(activeSubjectId);
  const subjectReady = activeSubject.status === 'active';

  function resetResults() {
    setRecognizedProblem('');
    setRetrievedCards([]);
    setSolutionMarkdown('');
    setError('');
  }

  function selectSubject(subjectId: string) {
    setActiveSubjectId(subjectId);
    resetResults();
  }

  function handleFileChange(file: File | null) {
    setSelectedFile(file);
    resetResults();

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

    if (!subjectReady) {
      setError(`${activeSubject.label} 과목은 아직 준비 중이에요. 지금은 미적분Ⅰ부터 사용할 수 있어요.`);
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
    if (!subjectReady) {
      setError(`${activeSubject.label} 과목은 아직 준비 중이에요. 지금은 미적분Ⅰ부터 사용할 수 있어요.`);
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
        body: JSON.stringify({ recognizedProblem, subjectId: activeSubject.id }),
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
    <div className="shell">
      <header className="topbar">
        <div className="topbar-inner">
          <button className="brand" type="button">
            <span className="brand-mark">AI</span>
            <span className="brand-copy">
              <strong>aibot</strong>
              <span>사진 기반 수학 문제풀이</span>
            </span>
          </button>

          <div className="topbar-actions">
            <span className="topbar-badge">MVP</span>
            <span className="topbar-subject">{activeSubject.label}</span>
          </div>
        </div>
      </header>

      <main className="page">
        <section className="hero-card">
          <div className="hero-copy-block">
            <p className="hero-pill">멀티 과목 확장형 학습 봇</p>
            <h1>
              사진만 올리면
              <br />
              수학 풀이 흐름까지 정리해 주는 AI 학습 화면
            </h1>
            <p className="hero-copy">
              지금은 미적분Ⅰ을 풀고 있지만, 나중에 다른 과목도 같은 화면 안에서 확장할 수 있도록
              상단 과목 탭 구조를 먼저 잡아 두었습니다.
            </p>
          </div>

          <div className="hero-status-card">
            <p className="mini-label">현재 과목</p>
            <h2>{activeSubject.label}</h2>
            <p className="mini-copy">
              {activeSubject.description}
            </p>

            <div className="flow-list">
              {FLOW_STEPS.map((step, index) => {
                const stepNumber = index + 1;
                const isCurrent = currentStep === stepNumber;
                const isDone = currentStep > stepNumber;

                return (
                  <div
                    key={step}
                    className={`flow-item${isCurrent ? ' is-current' : ''}${isDone ? ' is-done' : ''}`}
                  >
                    <span className="flow-index">{stepNumber}</span>
                    <span>{step}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="subject-strip">
          <div className="section-heading">
            <h2>과목 탭</h2>
            <p>현재는 미적분Ⅰ만 활성화되어 있고, 다른 과목은 같은 인터페이스 안에서 이어서 붙일 수 있습니다.</p>
          </div>

          <div className="subject-tabs">
            {SUBJECTS.map((subject) => {
              const isActive = subject.id === activeSubjectId;
              const isPlanned = subject.status === 'planned';

              return (
                <button
                  key={subject.id}
                  type="button"
                  className={`subject-tab${isActive ? ' is-active' : ''}${isPlanned ? ' is-planned' : ''}`}
                  onClick={() => {
                    if (!isPlanned) {
                      selectSubject(subject.id);
                    }
                    if (isPlanned) {
                      selectSubject(subject.id);
                    }
                  }}
                >
                  <span className="subject-name">{subject.shortLabel}</span>
                  <span className="subject-note">{subject.note}</span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="workspace">
          <div className="workspace-main">
            <article className="panel upload-panel">
              <div className="panel-head">
                <div>
                  <p className="mini-label">업로드</p>
                  <h2>문제 사진 올리기</h2>
                </div>
                <span className="panel-tag">JPG · PNG · WEBP</span>
              </div>

              <label className={`upload-dropzone${previewUrl ? ' has-preview' : ''}`}>
                <div className="upload-copy">
                  <strong>문제가 잘 보이는 사진을 올려 주세요.</strong>
                  <span>교재, 프린트, 필기 사진 모두 가능하고, 문제 영역이 잘리지 않는 것이 가장 좋아요.</span>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) => {
                    handleFileChange(event.target.files?.[0] ?? null);
                  }}
                />
              </label>

              {!subjectReady ? (
                <div className="subject-waiting-banner">
                  <strong>{activeSubject.label} 준비 중</strong>
                  <span>
                    이 과목은 아직 카드셋과 프롬프트를 연결하는 단계예요. 지금은 미적분Ⅰ에서만 실제 풀이를 생성할 수 있습니다.
                  </span>
                </div>
              ) : null}

              {previewUrl ? (
                <div className="preview-card">
                  <img src={previewUrl} alt="업로드한 문제 미리보기" className="preview-image" />
                  <div className="preview-meta">
                    <div>
                      <strong>사진 미리보기</strong>
                      <span>문제가 선명하게 보이면 바로 다음 단계로 진행하면 됩니다.</span>
                    </div>
                    <button type="button" className="text-button" onClick={() => handleFileChange(null)}>
                      사진 지우기
                    </button>
                  </div>
                </div>
              ) : (
                <div className="empty-preview">
                  <div className="empty-preview-box">미리보기가 여기에 표시됩니다.</div>
                </div>
              )}

              <div className="action-row">
                <button type="button" className="primary-button" onClick={handleReadProblem} disabled={!canRead}>
                  {reading ? '문제 읽는 중...' : '문제 읽기'}
                </button>
                <button type="button" className="secondary-button" onClick={handleSolve} disabled={!canSolve || !subjectReady}>
                  {solving ? '풀이 만드는 중...' : '풀이 시작'}
                </button>
              </div>

              {error ? <p className="error-banner">{error}</p> : null}
            </article>

            <article className="panel solution-panel">
              <div className="panel-head">
                <div>
                  <p className="mini-label">해설</p>
                  <h2>7개 섹션 풀이</h2>
                </div>
                <span className="panel-tag">LaTeX 렌더링</span>
              </div>

              {solutionMarkdown ? (
                <MarkdownViewer content={solutionMarkdown} />
              ) : (
                <div className="solution-placeholder">
                  <p>
                    풀이가 만들어지면 아래 순서로 항상 정리됩니다.
                  </p>
                  <div className="section-chip-list">
                    <span>문제 읽기</span>
                    <span>사용 개념</span>
                    <span>풀이 전략</span>
                    <span>단계별 풀이</span>
                    <span>정답</span>
                    <span>검산</span>
                    <span>비슷한 문제 팁</span>
                  </div>
                </div>
              )}
            </article>
          </div>

          <aside className="workspace-side">
            <article className="panel side-panel">
              <div className="panel-head">
                <div>
                  <p className="mini-label">OCR 결과</p>
                  <h2>문제 읽기</h2>
                </div>
              </div>
              <p className="recognized-problem">
                {recognizedProblem.trim() || '아직 읽어 온 문제가 없어요. 사진 업로드 후 문제 읽기를 눌러 주세요.'}
              </p>
            </article>

            <article className="panel side-panel">
              <div className="panel-head">
                <div>
                  <p className="mini-label">RAG 검색</p>
                  <h2>관련 개념카드</h2>
                </div>
              </div>

              {retrievedCards.length ? (
                <ul className="card-stack">
                  {retrievedCards.map((card) => (
                    <li key={card.id} className="concept-card">
                      <div className="concept-card-head">
                        <strong>{card.id}</strong>
                        <span>점수 {card.score}</span>
                      </div>
                      <p>{card.title}</p>
                      <small>{card.unit}</small>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="side-empty">
                  문제를 읽고 나면 관련 카드 1~3개를 여기에서 먼저 보여드려요.
                </p>
              )}
            </article>

            <article className="panel side-panel tips-panel">
              <div className="panel-head">
                <div>
                  <p className="mini-label">확장 방향</p>
                  <h2>다음 과목 대비</h2>
                </div>
              </div>
              <ul className="bullet-list">
                <li>상단 과목 탭 구조를 먼저 넣어 두어서 다른 과목 추가가 자연스럽습니다.</li>
                <li>OCR, 카드 검색, 풀이 출력은 그대로 두고 과목별 프롬프트와 카드만 교체할 수 있습니다.</li>
                <li>현재 화면은 학생용 업로드 흐름과 교사용 멀티 과목 확장을 함께 고려한 레이아웃입니다.</li>
              </ul>
            </article>
          </aside>
        </section>
      </main>
    </div>
  );
}
