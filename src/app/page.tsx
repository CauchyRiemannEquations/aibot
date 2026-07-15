'use client';

import { useEffect, useRef, useState } from 'react';

import { MarkdownViewer } from '@/components/markdown-viewer';
import { SUBJECTS } from '@/lib/subjects';
import type { SubjectId } from '@/lib/types';

type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

function TypingDots() {
  return (
    <span className="tutor-dots" aria-label="소크라가 생각 중">
      <span />
      <span />
      <span />
    </span>
  );
}

export default function HomePage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const [phase, setPhase] = useState<'setup' | 'chat'>('setup');
  const [subjectId, setSubjectId] = useState<SubjectId>('common-math-1');

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [problemText, setProblemText] = useState('');
  const [reading, setReading] = useState(false);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState('');

  const subjectLabel = SUBJECTS.find((subject) => subject.id === subjectId)?.label ?? '';
  const canRead = !!selectedFile && !reading;
  const canStart = !!problemText.trim() && !reading && !streaming;

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, streaming]);

  function handleFileChange(file: File | null) {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setSelectedFile(file);
    setPreviewUrl(file ? URL.createObjectURL(file) : '');
    setError('');
  }

  function openFilePicker() {
    fileInputRef.current?.click();
  }

  async function handleReadProblem() {
    if (!selectedFile) {
      setError('문제 사진을 먼저 올려 주세요.');
      return;
    }

    setReading(true);
    setError('');

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

      setProblemText(data.recognizedProblem);
    } catch (err) {
      setError(err instanceof Error ? err.message : '문제를 읽지 못했어요.');
    } finally {
      setReading(false);
    }
  }

  async function streamReply(history: ChatMessage[], problem: string) {
    setStreaming(true);
    setError('');
    setMessages([...history, { role: 'assistant', content: '' }]);

    const controller = new AbortController();
    abortRef.current = controller;
    let gotAnything = false;

    try {
      const response = await fetch('/api/tutor', {
        method: 'POST',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          problemText: problem,
          subjectId,
          messages: history,
        }),
      });

      if (!response.ok || !response.body) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || '소크라가 대답하지 못했어요. 잠시 후 다시 시도해 주세요.');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }

        const piece = decoder.decode(value, { stream: true });
        if (piece) {
          gotAnything = true;
          setMessages((prev) => {
            const next = [...prev];
            const last = next[next.length - 1];
            next[next.length - 1] = { ...last, content: last.content + piece };
            return next;
          });
        }
      }

      if (!gotAnything) {
        setMessages((prev) => prev.slice(0, -1));
        setError('소크라가 빈 응답을 보냈어요. 다시 시도해 주세요.');
      }
    } catch (err) {
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last && last.role === 'assistant' && !last.content) {
          return prev.slice(0, -1);
        }
        return prev;
      });

      if (!(err instanceof DOMException && err.name === 'AbortError')) {
        setError(err instanceof Error ? err.message : '네트워크 연결을 확인해 주세요.');
      }
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  }

  function startSession() {
    const problem = problemText.trim();
    if (!problem || streaming) {
      return;
    }

    const first: ChatMessage[] = [{ role: 'user', content: problem }];
    setPhase('chat');
    streamReply(first, problem);
  }

  function sendMessage() {
    const text = input.trim();
    if (!text || streaming) {
      return;
    }

    setInput('');
    streamReply([...messages, { role: 'user', content: text }], problemText.trim());
  }

  function stopStreaming() {
    abortRef.current?.abort();
  }

  function newProblem() {
    if (messages.length > 1 && !window.confirm('지금 대화를 지우고 새 문제를 시작할까요?')) {
      return;
    }

    abortRef.current?.abort();
    setMessages([]);
    setInput('');
    setProblemText('');
    handleFileChange(null);
    setError('');
    setPhase('setup');
  }

  function handleComposerKey(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  }

  if (phase === 'chat') {
    return (
      <div className="app-shell">
        <div className="tutor-chatwrap">
          <header className="tutor-header">
            <span className="tutor-header-mark">
              소크라<span className="tutor-q">?</span>
            </span>
            <span className="tutor-subject-chip">{subjectLabel}</span>
            <span className="tutor-header-spacer" />
            <button type="button" className="ghost-button tutor-newbtn" onClick={newProblem}>
              새 문제
            </button>
          </header>

          <div className="tutor-messages">
            <div className="tutor-messages-inner">
              {messages.map((message, index) => (
                <div key={index} className={`tutor-msg ${message.role}`}>
                  <div className="tutor-bubble">
                    {message.role === 'assistant' && <span className="tutor-speaker">소크라</span>}
                    {message.role === 'assistant' &&
                    !message.content &&
                    streaming &&
                    index === messages.length - 1 ? (
                      <TypingDots />
                    ) : (
                      <MarkdownViewer content={message.content} />
                    )}
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
          </div>

          {error ? <div className="error-banner tutor-errbar">{error}</div> : null}

          <div className="tutor-composer">
            <div className="tutor-composer-inner">
              <textarea
                rows={1}
                placeholder="지금까지의 생각을 적어 보세요…"
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={handleComposerKey}
              />
              {streaming ? (
                <button type="button" className="tutor-sendbtn stop" onClick={stopStreaming} title="생성 중지">
                  ■
                </button>
              ) : (
                <button
                  type="button"
                  className="tutor-sendbtn"
                  onClick={sendMessage}
                  disabled={!input.trim()}
                  title="보내기"
                >
                  ↑
                </button>
              )}
            </div>
            <p className="tutor-footnote">소크라는 정답 대신 질문을 해요 · Enter 전송 · Shift+Enter 줄바꿈</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <main className="app-page app-page-simple app-page-no-header">
        <section className="tutor-hero">
          <p className="tutor-eyebrow">SOCRATIC MATH TUTOR</p>
          <h1 className="tutor-wordmark">
            소크라<span className="tutor-q">?</span>
          </h1>
          <p className="tutor-tagline">
            <b>정답은 절대 말하지 않는</b> 수학 튜터. 답을 달라고 조르면? 소용없어요. 대신 좋은 질문을
            하나씩 던져서, 결국 <b>네가 직접</b> 답에 도착하게 해요.
          </p>
        </section>

        <section className="subject-nav">
          <div className="subject-tabs subject-tabs-simple">
            {SUBJECTS.map((subject) => {
              const isActive = subject.id === subjectId;

              return (
                <button
                  key={subject.id}
                  type="button"
                  className={`subject-tab${isActive ? ' is-active' : ''}`}
                  onClick={() => setSubjectId(subject.id)}
                >
                  <span className="subject-tab-label">{subject.shortLabel}</span>
                </button>
              );
            })}
          </div>
          <p className="tutor-scope-note">
            선택한 과목의 교육과정 위계 안에서만 힌트를 줘요. (예: 벡터는 기하를 선택했을 때만)
          </p>
        </section>

        <section className="main-layout">
          <article className="main-card upload-card upload-card-simple">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="file-input-hidden"
              onChange={(event) => handleFileChange(event.target.files?.[0] ?? null)}
            />

            <div className={`upload-dropzone upload-dropzone-simple${previewUrl ? ' has-preview' : ''}`}>
              {previewUrl ? (
                <img src={previewUrl} alt="업로드한 문제 미리보기" className="preview-image" />
              ) : (
                <div className="upload-empty upload-empty-simple">
                  <button type="button" className="upload-file-chip" onClick={openFilePicker}>
                    문제 사진 올리기
                  </button>
                  <div className="upload-bubble">정답 대신 질문을 던지는 AI 튜터, 소크라예요.</div>
                  <img src="/robot-mascot.png" alt="문제 안내 로봇" className="upload-mascot" />
                </div>
              )}
            </div>

            {previewUrl ? (
              <div className="upload-toolbar upload-toolbar-simple">
                <div className="primary-actions primary-actions-simple">
                  <button type="button" className="ghost-button" onClick={openFilePicker}>
                    문제 바꾸기
                  </button>
                  <button type="button" className="ghost-button" onClick={handleReadProblem} disabled={!canRead}>
                    {reading ? '읽는 중...' : '문제 읽기'}
                  </button>
                </div>
              </div>
            ) : null}

            <div className="tutor-problem-field">
              <label htmlFor="problem-text" className="solve-subject-label">
                오늘 붙잡을 문제
              </label>
              <textarea
                id="problem-text"
                className="tutor-problem-textarea"
                placeholder="사진을 올려 '문제 읽기'를 누르거나, 문제를 직접 입력해 주세요."
                value={problemText}
                onChange={(event) => setProblemText(event.target.value)}
              />
            </div>

            {error ? <div className="error-banner">{error}</div> : null}

            <button type="button" className="primary-button tutor-startbtn" disabled={!canStart} onClick={startSession}>
              소크라와 질문 시작하기
            </button>
            <p className="tutor-privacy">힌트 사다리를 한 칸씩만 내려가요 · 진단 → 개념 → 분해 → 유사 예시</p>
          </article>
        </section>
      </main>
    </div>
  );
}
