'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { PROVIDER_LABELS } from '@/lib/ai/defaults';
import type { ProviderId } from '@/lib/ai/types';
import { QrCode } from '@/components/qr-code';
import { SUBJECTS } from '@/lib/subjects';

type Classroom = {
  id: string;
  name: string;
  slug: string;
  studentUrl: string;
  subjectId: string;
  providerCredentialId: string | null;
  visionModel: string | null;
  tutorModel: string | null;
  isActive: boolean;
  requiresAccessCode: boolean;
  dailyLimitPerSession: number;
  dailyLimitTotal: number;
  expiresAt: string | null;
};

type UsageToday = {
  totalRequests: number;
  ocrRequests: number;
  tutorRequests: number;
  successCount: number;
  failureCount: number;
};

type Credential = { id: string; provider: string; status: string };

export default function ClassDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;

  const [classroom, setClassroom] = useState<Classroom | null>(null);
  const [usage, setUsage] = useState<UsageToday | null>(null);
  const [creds, setCreds] = useState<Credential[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  // 편집 상태
  const [name, setName] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [credentialId, setCredentialId] = useState('');
  const [perSession, setPerSession] = useState(30);
  const [total, setTotal] = useState(500);
  const [accessCode, setAccessCode] = useState('');
  const [saving, setSaving] = useState(false);

  async function load() {
    const [cRes, pRes] = await Promise.all([
      fetch(`/api/teacher/classes/${id}`),
      fetch('/api/teacher/providers'),
    ]);
    if (!cRes.ok) {
      router.push('/teacher/dashboard');
      return;
    }
    const cData = await cRes.json();
    const pData = await pRes.json().catch(() => ({ credentials: [] }));
    const room: Classroom = cData.classroom;
    setClassroom(room);
    setUsage(cData.usageToday);
    setCreds((pData.credentials ?? []).filter((c: Credential) => c.status === 'active'));
    setName(room.name);
    setSubjectId(room.subjectId);
    setCredentialId(room.providerCredentialId ?? '');
    setPerSession(room.dailyLimitPerSession);
    setTotal(room.dailyLimitTotal);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function patch(body: Record<string, unknown>, msg = '저장했어요.') {
    setSaving(true);
    setSaveMsg('');
    const res = await fetch(`/api/teacher/classes/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (res.ok && data.ok) {
      setClassroom(data.classroom);
      setSaveMsg(msg);
    } else {
      setSaveMsg(data.error || '저장하지 못했어요.');
    }
  }

  async function saveSettings() {
    await patch({
      name: name.trim(),
      subjectId,
      providerCredentialId: credentialId || undefined,
      dailyLimitPerSession: perSession,
      dailyLimitTotal: total,
      ...(accessCode.trim() ? { accessCode: accessCode.trim() } : {}),
    });
    setAccessCode('');
  }

  async function copyLink() {
    if (!classroom) return;
    await navigator.clipboard.writeText(classroom.studentUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function removeClass() {
    if (!window.confirm('이 반을 삭제할까요? 학생 링크가 즉시 사용 불가가 돼요.')) return;
    await fetch(`/api/teacher/classes/${id}`, { method: 'DELETE' });
    router.push('/teacher/dashboard');
  }

  if (loading || !classroom) {
    return (
      <main className="admin-main">
        <p className="admin-muted">불러오는 중…</p>
      </main>
    );
  }

  return (
    <main className="admin-main admin-main-narrow">
      <Link href="/teacher/dashboard" className="admin-back">
        ← 대시보드
      </Link>
      <div className="admin-head-row">
        <h1 className="admin-h1">{classroom.name}</h1>
        <span className={`status-pill ${classroom.isActive ? 'status-active' : 'status-none'}`}>
          {classroom.isActive ? '사용 중' : '중지'}
        </span>
      </div>

      <section className="admin-card">
        <h2 className="admin-h2">학생용 링크</h2>
        <div className="share-row">
          <code className="share-url">{classroom.studentUrl}</code>
          <button type="button" className="ghost-button" onClick={copyLink}>
            {copied ? '복사됨!' : '링크 복사'}
          </button>
        </div>
        <QrCode value={classroom.studentUrl} downloadName={`socra-${classroom.slug.slice(0, 8)}`} />
        <label className="admin-toggle-row">
          <input
            type="checkbox"
            checked={classroom.isActive}
            onChange={(e) => patch({ isActive: e.target.checked }, e.target.checked ? '반을 활성화했어요.' : '반을 중지했어요.')}
          />
          <span>반 활성화 (끄면 학생 링크가 즉시 막혀요)</span>
        </label>
      </section>

      <section className="admin-card">
        <h2 className="admin-h2">오늘 사용량</h2>
        {usage ? (
          <div className="stat-grid">
            <div className="stat-tile">
              <span className="stat-value">
                {usage.totalRequests}/{classroom.dailyLimitTotal}
              </span>
              <span className="stat-label">전체 요청</span>
            </div>
            <div className="stat-tile">
              <span className="stat-value">{usage.ocrRequests}</span>
              <span className="stat-label">문제 인식</span>
            </div>
            <div className="stat-tile">
              <span className="stat-value">{usage.tutorRequests}</span>
              <span className="stat-label">튜터 대화</span>
            </div>
            <div className="stat-tile">
              <span className="stat-value">{usage.failureCount}</span>
              <span className="stat-label">오류</span>
            </div>
          </div>
        ) : null}
      </section>

      <section className="admin-card">
        <h2 className="admin-h2">반 설정</h2>
        <label className="admin-label">반 이름</label>
        <input className="admin-input" value={name} onChange={(e) => setName(e.target.value)} />

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
        <p className="admin-hint">AI 연결을 바꿔도 학생 링크는 그대로 유지돼요.</p>

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

        <label className="admin-label">
          접속 코드 {classroom.requiresAccessCode ? '(설정됨 — 새로 입력하면 교체)' : '(없음)'}
        </label>
        <div className="admin-key-row">
          <input
            className="admin-input"
            placeholder="새 접속 코드"
            value={accessCode}
            onChange={(e) => setAccessCode(e.target.value)}
          />
          {classroom.requiresAccessCode ? (
            <button
              type="button"
              className="ghost-button"
              onClick={() => patch({ accessCode: null }, '접속 코드를 제거했어요.')}
            >
              코드 제거
            </button>
          ) : null}
        </div>

        {saveMsg ? <p className="provider-test-msg ok">{saveMsg}</p> : null}
        <div className="provider-actions">
          <button type="button" className="primary-button" onClick={saveSettings} disabled={saving}>
            {saving ? '저장 중…' : '설정 저장'}
          </button>
        </div>
      </section>

      <section className="admin-card admin-danger-zone">
        <h2 className="admin-h2">반 삭제</h2>
        <p className="admin-muted">삭제하면 되돌릴 수 없어요. 잠시 멈추려면 위의 활성화 토글을 사용하세요.</p>
        <button type="button" className="danger-button" onClick={removeClass}>
          이 반 삭제
        </button>
      </section>
    </main>
  );
}
