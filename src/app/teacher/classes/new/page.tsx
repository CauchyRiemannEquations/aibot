'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { PROVIDER_LABELS } from '@/lib/ai/defaults';
import type { ProviderId } from '@/lib/ai/types';
import { SUBJECTS } from '@/lib/subjects';

type Credential = { id: string; provider: string; status: string };

export default function NewClassPage() {
  const router = useRouter();
  const [creds, setCreds] = useState<Credential[]>([]);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState('');
  const [subjectId, setSubjectId] = useState<string>(SUBJECTS[0].id);
  const [credentialId, setCredentialId] = useState('');
  const [guidanceNote, setGuidanceNote] = useState('');
  const [perSession, setPerSession] = useState(30);
  const [total, setTotal] = useState(500);
  const [accessCode, setAccessCode] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const res = await fetch('/api/teacher/providers');
      const data = await res.json().catch(() => ({ credentials: [] }));
      const active = (data.credentials ?? []).filter((c: Credential) => c.status === 'active');
      setCreds(active);
      if (active[0]) setCredentialId(active[0].id);
      setLoading(false);
    })();
  }, []);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    if (!credentialId) {
      setError('먼저 연결 테스트를 통과한 AI 연결이 필요해요.');
      return;
    }
    setSaving(true);
    const res = await fetch('/api/teacher/classes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: name.trim(),
        subjectId,
        providerCredentialId: credentialId,
        guidanceNote: guidanceNote.trim() || undefined,
        dailyLimitPerSession: perSession,
        dailyLimitTotal: total,
        accessCode: accessCode.trim() || undefined,
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : undefined,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (res.ok && data.ok) {
      router.push(`/teacher/classes/${data.classroom.id}`);
    } else {
      setError(data.error || '반을 만들지 못했어요.');
    }
  }

  if (loading) {
    return (
      <main className="admin-main">
        <p className="admin-muted">불러오는 중…</p>
      </main>
    );
  }

  return (
    <main className="admin-main admin-main-narrow">
      <h1 className="admin-h1">반 만들기</h1>

      {creds.length === 0 ? (
        <div className="admin-empty">
          <p>연결 테스트를 통과한 AI 연결이 없어요.</p>
          <p className="admin-muted">
            <Link href="/teacher/providers">AI 연결</Link>에서 먼저 등록해 주세요.
          </p>
        </div>
      ) : (
        <form onSubmit={submit} className="admin-form admin-card">
          <label className="admin-label">반 이름</label>
          <input
            className="admin-input"
            placeholder="예: 2학년 3반 미적분"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <label className="admin-label">과목</label>
          <select className="admin-input" value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
            {SUBJECTS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>

          <label className="admin-label">AI 연결</label>
          <select className="admin-input" value={credentialId} onChange={(e) => setCredentialId(e.target.value)}>
            {creds.map((c) => (
              <option key={c.id} value={c.id}>
                {PROVIDER_LABELS[c.provider as ProviderId] ?? c.provider}
              </option>
            ))}
          </select>

          <label className="admin-label">학생 안내 문구 (선택)</label>
          <textarea
            className="admin-input admin-textarea"
            placeholder="학생 화면 상단에 보여줄 짧은 안내 (예: 3단원 과제 문제를 올려 보세요)"
            value={guidanceNote}
            onChange={(e) => setGuidanceNote(e.target.value)}
          />

          <div className="admin-two-col">
            <div>
              <label className="admin-label">학생 1명당 일일 한도</label>
              <input
                type="number"
                className="admin-input"
                min={1}
                value={perSession}
                onChange={(e) => setPerSession(Number(e.target.value))}
              />
            </div>
            <div>
              <label className="admin-label">반 전체 일일 한도</label>
              <input
                type="number"
                className="admin-input"
                min={1}
                value={total}
                onChange={(e) => setTotal(Number(e.target.value))}
              />
            </div>
          </div>

          <label className="admin-label">접속 코드 (선택)</label>
          <input
            className="admin-input"
            placeholder="비워 두면 링크만으로 입장"
            value={accessCode}
            onChange={(e) => setAccessCode(e.target.value)}
          />

          <label className="admin-label">만료일 (선택)</label>
          <input
            type="datetime-local"
            className="admin-input"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
          />

          {error ? <p className="admin-error-text">{error}</p> : null}

          <button type="submit" className="primary-button" disabled={saving}>
            {saving ? '만드는 중…' : '반 만들기'}
          </button>
        </form>
      )}
    </main>
  );
}
