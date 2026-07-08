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
  { key: 'problemReading', title: '\uBB38\uC81C \uC77D\uAE30', defaultOpen: false },
  { key: 'strategy', title: '\uD480\uC774 \uC804\uB7B5', defaultOpen: true },
  { key: 'stepByStep', title: '\uB2E8\uACC4\uBCC4 \uD480\uC774', defaultOpen: true },
  { key: 'answer', title: '\uC815\uB2F5 \uD655\uC778', defaultOpen: true, tone: 'answer' },
  { key: 'check', title: '\uAC80\uC0B0\uD558\uAE30', defaultOpen: false },
  { key: 'similarTip', title: '\uBE44\uC2B7\uD55C \uBB38\uC81C\uB294 \uC774\uB807\uAC8C \uD480\uC5B4\uC694', defaultOpen: false, tone: 'tip' },
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
      setError('\uBB38\uC81C \uC0AC\uC9C4\uC744 \uBA3C\uC800 \uC62C\uB824 \uC8FC\uC138\uC694.');
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
        throw new Error(data.error || '\uBB38\uC81C\uB97C \uC77D\uC9C0 \uBABB\uD588\uC5B4\uC694.');
      }

      setRecognizedProblem(data.recognizedProblem);
    } catch (err) {
      setError(err instanceof Error ? err.message : '\uBB38\uC81C\uB97C \uC77D\uC9C0 \uBABB\uD588\uC5B4\uC694.');
    } finally {
      setReading(false);
    }
  }

  async function handleSolve() {
    if (!recognizedProblem.trim()) {
      setError('\uBB38\uC81C\uB97C \uBA3C\uC800 \uC77D\uC5B4 \uC8FC\uC138\uC694.');
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
        throw new Error(data.error || '\uD480\uC774\uB97C \uB9CC\uB4E4\uC9C0 \uBABB\uD588\uC5B4\uC694.');
      }

      setRetrievedCards(data.retrievedCards ?? []);
      setSolutionSections(data.sections);
    } catch (err) {
      setError(err instanceof Error ? err.message : '\uD480\uC774\uB97C \uB9CC\uB4E4\uC9C0 \uBABB\uD588\uC5B4\uC694.');
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
              <img src="/robot-mascot.png" alt="\uD480\uB9AC \uB85C\uBD07 \uB9C8\uC2A4\uCF54\uD2B8" className="brand-logo" />
            </div>
            <span className="brand-name">\uD480\uB9AC</span>
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

          <div className="subject-placeholder">
            <strong>{activeSubject.label}</strong>
            <span>{activeSubject.note}</span>
          </div>
        </section>

        <section className={`main-layout${hasSolution ? ' has-solution' : ''}`}>
          <article className={`main-card upload-card upload-card-simple${hasSolution ? ' is-compact' : ''}`}>
            {/* This card stays first so mobile users see the question entry point immediately. */}
            <div className="upload-card-header">
              <div>
                <h1 className="upload-main-title">{'\uBB38\uC81C \uC0AC\uC9C4 \uC62C\uB9AC\uAE30'}</h1>
                <p className="upload-main-subtitle">
                  {'\uC0AC\uC9C4\uB9CC \uC62C\uB9AC\uBA74 \uBC14\uB85C \uBB38\uC81C\uB97C \uC77D\uACE0 \uD480\uC774\uB97C \uC2DC\uC791\uD574\uC694.'}
                </p>
              </div>
            </div>

            <label className={`upload-dropzone upload-dropzone-simple${previewUrl ? ' has-preview' : ''}`}>
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
                  <img src="/robot-mascot.png" alt="\uBB38\uC81C \uC548\uB0B4 \uB85C\uBD07" className="upload-mascot" />
                  <strong>{'\uBB38\uC81C \uC0AC\uC9C4\uC744 \uC62C\uB824 \uC8FC\uC138\uC694'}</strong>
                  <span>{'\uC120\uBA85\uD55C \uC0AC\uC9C4\uC77C\uC218\uB85D \uB354 \uC815\uD655\uD558\uAC8C \uC77D\uC744 \uC218 \uC788\uC5B4\uC694.'}</span>
                </div>
              )}
            </label>

            {previewUrl ? (
              <div className="upload-toolbar upload-toolbar-simple">
                <div className="primary-actions primary-actions-simple">
                  <button type="button" className="ghost-button" onClick={() => handleFileChange(null)}>
                    {'\uC0C8 \uBB38\uC81C'}
                  </button>
                  <button type="button" className="ghost-button" onClick={handleReadProblem} disabled={!canRead}>
                    {reading ? '\uC77D\uB294 \uC911...' : '\uBB38\uC81C \uC77D\uAE30'}
                  </button>
                  <button type="button" className="primary-button" onClick={handleSolve} disabled={!canSolve}>
                    {solving ? '\uD480\uC774 \uC0DD\uC131 \uC911...' : '\uD480\uC774 \uC2DC\uC791'}
                  </button>
                </div>
              </div>
            ) : null}

            {error ? <div className="error-banner">{error}</div> : null}

            {recognizedProblem ? (
              <div className="sub-card recognized-card recognized-card-simple">
                <div className="sub-card-head">
                  <h2>{'\uBB38\uC81C \uC77D\uAE30'}</h2>
                </div>
                <div className="recognized-problem">
                  <MarkdownViewer content={recognizedProblem} />
                </div>
              </div>
            ) : null}

            {showDebugConcepts && retrievedCards.length ? (
              <div className="sub-card concept-results-card">
                <div className="sub-card-head">
                  <h2>{'\uB514\uBC84\uADF8 \uAC1C\uB150\uCE74\uB4DC'}</h2>
                </div>
                <ul className="concept-card-list">
                  {retrievedCards.map((card) => (
                    <li key={card.id} className="concept-card">
                      <p className="concept-card-title">
                        [{card.course}] {card.id} {card.title}
                      </p>
                      <p className="concept-card-detail">{`\uB2E8\uC6D0: ${card.unit}`}</p>
                      <p className="concept-card-detail">{`\uAD00\uB828\uB3C4: ${card.score}\uC810`}</p>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </article>

          <article className="main-card solution-card solution-card-simple">
            {/* Keep the report simple: students should land on the solution, not debug metadata. */}
            <div className="card-head card-head-simple">
              <div>
                <h2>{'\uD480\uB9AC\uC758 \uD480\uC774'}</h2>
                <p className="card-subtitle">
                  {'\uBB38\uC81C\uB97C \uC77D\uACE0 \uD480\uC774 \uACFC\uC815\uC744 \uCC28\uADFC\uCC28\uADFC \uC815\uB9AC\uD588\uC5B4\uC694.'}
                </p>
              </div>
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
              <div className="solution-empty solution-empty-simple">
                <p className="solution-placeholder-text">
                  {'\uBB38\uC81C\uB97C \uC62C\uB9AC\uACE0 \uD480\uC774 \uC2DC\uC791\uC744 \uB204\uB974\uBA74 \uC5EC\uAE30\uC5D0 \uD480\uC774\uAC00 \uB098\uD0C0\uB098\uC694.'}
                </p>
              </div>
            )}
          </article>
        </section>
      </main>
    </div>
  );
}
