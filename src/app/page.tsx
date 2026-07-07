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

  const activeSubject = getSubjectById(activeSubjectId);
  const subjectReady = activeSubject.status === 'active';
  const canRead = !!selectedFile && !reading && subjectReady;
  const canSolve = !!recognizedProblem && !solving && subjectReady;

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

  function handleSelectSubject(subjectId: string) {
    setActiveSubjectId(subjectId);
    resetOutputs();
  }

  async function handleReadProblem() {
    if (!selectedFile) {
      setError('문제 사진을 먼저 올려 주세요.');
      return;
    }

    if (!subjectReady) {
      setError(`${activeSubject.label} 과목은 아직 준비 중이에요. 지금은 미적분Ⅰ만 사용할 수 있어요.`);
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
      setError(`${activeSubject.label} 과목은 아직 준비 중이에요. 지금은 미적분Ⅰ만 사용할 수 있어요.`);
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
          subjectId: activeSubject.id,
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
        <section className="subject-tabs-wrap">
          <div className="subject-tabs">
            {SUBJECTS.map((subject) => {
              const isActive = subject.id === activeSubjectId;

              return (
                <button
                  key={subject.id}
                  type="button"
                  className={`subject-tab${isActive ? ' is-active' : ''}${subject.status === 'planned' ? ' is-planned' : ''}`}
                  onClick={() => handleSelectSubject(subject.id)}
                >
                  <span className="subject-tab-label">{subject.shortLabel}</span>
                  <span className="subject-tab-note">{subject.note}</span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="app-grid">
          <article className="main-card upload-card">
            <div className="card-head">
              <h1>문제 사진 올리기</h1>
              <span className="card-badge">{activeSubject.label}</span>
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
                  <strong>사진을 선택하거나 끌어다 놓으세요.</strong>
                  <span>문제가 잘 보이게 찍은 사진이면 됩니다.</span>
                </div>
              )}
            </label>

            {!subjectReady ? (
              <div className="inline-notice">
                {activeSubject.label} 과목은 아직 준비 중이에요. 지금은 미적분Ⅰ만 사용할 수 있어요.
              </div>
            ) : null}

            {previewUrl ? (
              <div className="upload-toolbar">
                <button type="button" className="ghost-button" onClick={() => handleFileChange(null)}>
                  사진 지우기
                </button>
                <div className="primary-actions">
                  <button type="button" className="ghost-button" onClick={handleReadProblem} disabled={!canRead}>
                    {reading ? '읽는 중...' : '문제 읽기'}
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
              <p className="recognized-problem">
                {recognizedProblem.trim() || '문제를 읽으면 여기에 정리됩니다.'}
              </p>
            </div>

            {!!retrievedCards.length ? (
              <div className="sub-card">
                <div className="sub-card-head">
                  <h2>사용 개념카드</h2>
                </div>
                <ul className="concept-card-list">
                  {retrievedCards.map((card) => (
                    <li key={card.id} className="concept-card">
                      <div className="concept-card-top">
                        <strong>{card.id}</strong>
                        <span>{card.unit}</span>
                      </div>
                      <p>{card.title}</p>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </article>

          <article className="main-card solution-card">
            <div className="card-head">
              <h2>풀이</h2>
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
