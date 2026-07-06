'use client';

import { useState } from 'react';

import { MarkdownViewer } from '@/components/markdown-viewer';

type RetrievedCardSummary = {
  id: string;
  title: string;
  unit: string;
  score: number;
};

type SolveResponse = {
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

  const canRead = !!selectedFile && !reading;
  const canSolve = !!recognizedProblem && !solving;

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
    setSolving(true);
    setError('');
    setSolutionMarkdown('');

    try {
      const response = await fetch('/api/solve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ recognizedProblem }),
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
    <main className="page">
      <section className="hero">
        <p className="eyebrow">MVP</p>
        <h1>미적분Ⅰ 사진 문제풀이봇</h1>
        <p className="hero-copy">
          문제를 직접 입력하지 않아도 괜찮아요. 사진을 올리면 문제를 읽고, 관련 개념카드를
          찾아서 단계별 풀이를 정리해 드립니다.
        </p>
      </section>

      <section className="panel">
        <label className="upload-box">
          <span className="upload-title">문제 사진 업로드</span>
          <span className="upload-subtitle">JPG, PNG, WEBP 파일을 올릴 수 있어요.</span>
          <input
            type="file"
            accept="image/*"
            onChange={(event) => {
              const file = event.target.files?.[0] ?? null;
              setSelectedFile(file);
              setRecognizedProblem('');
              setRetrievedCards([]);
              setSolutionMarkdown('');
              setError('');
              if (previewUrl) {
                URL.revokeObjectURL(previewUrl);
              }
              setPreviewUrl(file ? URL.createObjectURL(file) : '');
            }}
          />
        </label>

        {previewUrl ? (
          <div className="preview-shell">
            <img src={previewUrl} alt="업로드한 문제 미리보기" className="preview-image" />
          </div>
        ) : null}

        <div className="actions">
          <button type="button" onClick={handleReadProblem} disabled={!canRead}>
            {reading ? '문제 읽는 중...' : '문제 읽기'}
          </button>
          <button type="button" onClick={handleSolve} disabled={!canSolve}>
            {solving ? '풀이 만드는 중...' : '풀이 시작'}
          </button>
        </div>

        {error ? <p className="error-message">{error}</p> : null}
      </section>

      <section className="grid">
        <article className="panel">
          <h2>[문제 읽기]</h2>
          <p className="recognized-problem">
            {recognizedProblem.trim() || '아직 읽어 온 문제가 없어요.'}
          </p>
        </article>

        <article className="panel">
          <h2>검색된 개념카드</h2>
          {retrievedCards.length ? (
            <ul className="card-list">
              {retrievedCards.map((card) => (
                <li key={card.id}>
                  <strong>{card.id}</strong> {card.title}
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">문제를 읽고 풀이를 시작하면 관련 카드 1~3개를 보여드려요.</p>
          )}
        </article>
      </section>

      <section className="panel solution-panel">
        <h2>풀이 결과</h2>
        {solutionMarkdown ? (
          <MarkdownViewer content={solutionMarkdown} />
        ) : (
          <p className="muted">
            풀이가 만들어지면
            {' '}
            [문제 읽기], [사용 개념], [풀이 전략], [단계별 풀이], [정답], [검산], [비슷한 문제 팁]
            {' '}
            순서로 정리됩니다.
          </p>
        )}
      </section>
    </main>
  );
}
