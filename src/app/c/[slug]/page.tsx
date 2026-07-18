'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';

import { MarkdownViewer } from '@/components/markdown-viewer';
import { CameraIcon, SendArrowIcon } from '@/components/socra-icons';
import { getSubjectById } from '@/lib/subjects';

type ChatMessage = { role: 'user' | 'assistant'; content: string };

type PublicClassroom = {
  slug: string;
  name: string;
  subjectId: string;
  guidanceNote: string | null;
  requiresAccessCode: boolean;
  dailyLimitPerSession: number;
};

type Phase = 'loading' | 'access' | 'unavailable' | 'setup' | 'chat';

function TypingDots() {
  return (
    <span className="tutor-dots" aria-label="SOCRA가 생각 중">
      <span />
      <span />
      <span />
    </span>
  );
}

export default function StudentClassroomPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const [phase, setPhase] = useState<Phase>('loading');
  const [classroom, setClassroom] = useState<PublicClassroom | null>(null);
  const [unavailableMsg, setUnavailableMsg] = useState('');
  const [remaining, setRemaining] = useState<number | null>(null);

  const [accessCode, setAccessCode] = useState('');
  const [accessError, setAccessError] = useState('');

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [problemText, setProblemText] = useState('');
  const [reading, setReading] = useState(false);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState('');

  const subjectLabel = classroom ? getSubjectById(classroom.subjectId).label : '';
  const canRead = !!selectedFile && !reading;
  const canStart = !!problemText.trim() && !reading && !streaming;
  const limitReached = remaining !== null && remaining <= 0;

  async function initSession(code?: string) {
    const res = await fetch(`/api/student/${slug}/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(code ? { accessCode: code } : {}),
    });
    const data = await res.json().catch(() => ({}));

    if (data.unavailable || res.status === 404) {
      setUnavailableMsg(data.error || '현재 이 수학 튜터는 사용할 수 없어요. 담당 선생님께 문의해 주세요.');
      setPhase('unavailable');
      return;
    }
    if (data.needsAccessCode) {
      if (data.error) setAccessError(data.error);
      setPhase('access');
      return;
    }
    if (data.ready) {
      setClassroom(data.classroom);
      setRemaining(typeof data.remaining === 'number' ? data.remaining : null);
      setPhase('setup');
    }
  }

  useEffect(() => {
    initSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, streaming]);

  function handleFileChange(file: File | null) {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedFile(file);
    setPreviewUrl(file ? URL.createObjectURL(file) : '');
    setError('');
  }

  function openFilePicker() {
    fileInputRef.current?.click();
  }

  async function submitAccessCode(event: React.FormEvent) {
    event.preventDefault();
    setAccessError('');
    await initSession(accessCode.trim());
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
      const response = await fetch(`/api/student/${slug}/recognize`, { method: 'POST', body: formData });
      const data = await response.json();
      if (!response.ok) {
        if (data.limitReached) setRemaining(0);
        throw new Error(data.error || '사진을 읽지 못했어요. 더 선명한 사진으로 다시 시도해 주세요.');
      }
      setProblemText(data.recognizedProblem);
    } catch (err) {
      setError(err instanceof Error ? err.message : '사진을 읽지 못했어요. 더 선명한 사진으로 다시 시도해 주세요.');
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
      const response = await fetch(`/api/student/${slug}/tutor`, {
        method: 'POST',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ problemText: problem, messages: history }),
      });

      if (!response.ok || !response.body) {
        const data = await response.json().catch(() => null);
        if (data?.limitReached) setRemaining(0);
        throw new Error(data?.error || 'AI 튜터와 연결하지 못했어요. 잠시 후 다시 시도해 주세요.');
      }

      // 성공적으로 한 번 소비됨 → 남은 횟수 감소 표시
      setRemaining((prev) => (prev !== null ? Math.max(0, prev - 1) : prev));

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
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
        setError('잠시 후 다시 시도해 주세요.');
      }
    } catch (err) {
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last && last.role === 'assistant' && !last.content) return prev.slice(0, -1);
        return prev;
      });
      if (!(err instanceof DOMException && err.name === 'AbortError')) {
        setError(err instanceof Error ? err.message : 'AI 튜터와 연결하지 못했어요. 잠시 후 다시 시도해 주세요.');
      }
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  }

  function startSession() {
    const problem = problemText.trim();
    if (!problem || streaming) return;
    const first: ChatMessage[] = [{ role: 'user', content: problem }];
    setPhase('chat');
    streamReply(first, problem);
  }

  function sendMessage() {
    const text = input.trim();
    if (!text || streaming) return;
    setInput('');
    streamReply([...messages, { role: 'user', content: text }], problemText.trim());
  }

  function stopStreaming() {
    abortRef.current?.abort();
  }

  function newProblem() {
    if (messages.length > 1 && !window.confirm('지금 대화를 지우고 새 문제를 시작할까요?')) return;
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

  /* ── 상태별 화면 ── */
  if (phase === 'loading') {
    return (
      <div className="app-shell sk-dark">
        <main className="app-page app-page-simple">
          <p className="student-center-note">불러오는 중…</p>
        </main>
      </div>
    );
  }

  if (phase === 'unavailable') {
    return (
      <div className="app-shell sk-dark">
        <main className="app-page app-page-simple">
          <section className="student-gate">
            <h1 className="tutor-wordmark">
              SOCRA<span className="tutor-q">?</span>
            </h1>
            <p className="student-gate-msg">{unavailableMsg}</p>
          </section>
        </main>
      </div>
    );
  }

  if (phase === 'access') {
    return (
      <div className="app-shell sk-dark">
        <main className="app-page app-page-simple">
          <section className="student-gate">
            <h1 className="tutor-wordmark">
              SOCRA<span className="tutor-q">?</span>
            </h1>
            <p className="student-gate-msg">이 반은 접속 코드가 필요해요.</p>
            <form onSubmit={submitAccessCode} className="student-access-form">
              <input
                className="tutor-problem-textarea student-access-input"
                placeholder="접속 코드를 입력해 주세요"
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value)}
                autoFocus
              />
              {accessError ? <p className="admin-error-text">{accessError}</p> : null}
              <button type="submit" className="primary-button">
                입장하기
              </button>
            </form>
          </section>
        </main>
      </div>
    );
  }

  if (phase === 'chat') {
    return (
      <div className="app-shell sk-dark">
        <div className="tutor-chatwrap">
          <header className="tutor-header">
            <span className="tutor-header-mark">
              SOCRA<span className="tutor-q">?</span>
            </span>
            <span className="tutor-subject-chip">{subjectLabel}</span>
            <span className="tutor-header-spacer" />
            {remaining !== null ? <span className="student-remaining">남은 질문 {remaining}회</span> : null}
            <button type="button" className="ghost-button tutor-newbtn" onClick={newProblem}>
              새 문제
            </button>
          </header>

          <div className="tutor-messages">
            <div className="tutor-messages-inner">
              {messages.map((message, index) => (
                <div key={index} className={`tutor-msg ${message.role}`}>
                  <div className="tutor-bubble">
                    {message.role === 'assistant' && <span className="tutor-speaker">SOCRA</span>}
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
                placeholder="생각을 적어봐…"
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
                  <SendArrowIcon />
                </button>
              )}
            </div>
            <p className="tutor-footnote">SOCRA는 정답 대신 질문을 해요 · Enter 전송 · Shift+Enter 줄바꿈</p>
          </div>
        </div>
      </div>
    );
  }

  /* setup */
  return (
    <div className="app-shell sk-dark">
      <main className="app-page app-page-simple app-page-no-header">
        <section className="tutor-hero">
          <h1 className="tutor-wordmark">
            SOCRA<span className="tutor-q">?</span>
          </h1>
          <p className="tutor-tagline">
            질문으로 생각하는 수학 AI. 정답을 바로 알려주기보다 스스로 해결할 수 있도록 질문을 건넬게요.
          </p>
          <div className="student-classmeta">
            <span className="tutor-subject-chip">{classroom?.name}</span>
            <span className="tutor-subject-chip subtle">{subjectLabel}</span>
            {remaining !== null ? <span className="student-remaining">오늘 남은 질문 {remaining}회</span> : null}
          </div>
          {classroom?.guidanceNote ? <p className="student-guidance">{classroom.guidanceNote}</p> : null}
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
                // eslint-disable-next-line @next/next/no-img-element
                <img src={previewUrl} alt="업로드한 문제 미리보기" className="preview-image" />
              ) : (
                <button type="button" className="upload-empty upload-empty-simple" onClick={openFilePicker}>
                  <span className="upload-icon-tile">
                    <CameraIcon />
                  </span>
                  <span className="upload-empty-text">
                    <span className="upload-empty-title">문제 사진 올리기</span>
                    <span className="upload-empty-sub">사진을 올리거나 직접 입력해도 돼</span>
                  </span>
                  <span className="upload-file-chip">사진 선택</span>
                </button>
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
              {problemText.trim() ? (
                <div className="tutor-problem-preview">
                  <span className="tutor-preview-label">수식 미리보기</span>
                  <MarkdownViewer content={problemText} />
                </div>
              ) : null}
            </div>

            {error ? <div className="error-banner">{error}</div> : null}

            {limitReached ? (
              <div className="error-banner student-limit-banner">
                오늘 사용할 수 있는 질문 횟수를 모두 사용했어요. 다음 수업에서 다시 만나요.
              </div>
            ) : null}

            <button
              type="button"
              className="primary-button tutor-startbtn"
              disabled={!canStart || limitReached}
              onClick={startSession}
            >
              질문 시작하기
            </button>
            <p className="tutor-privacy">문제 사진을 별도로 저장하지 않아요 · 문제 인식에만 잠깐 사용해요</p>
          </article>
        </section>
      </main>
    </div>
  );
}
