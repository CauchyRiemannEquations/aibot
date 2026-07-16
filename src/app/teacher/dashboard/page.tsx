'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

type UsageToday = {
  totalRequests: number;
  ocrRequests: number;
  tutorRequests: number;
  successCount: number;
  failureCount: number;
};

type ClassItem = {
  id: string;
  name: string;
  slug: string;
  studentUrl: string;
  isActive: boolean;
  providerCredentialId: string | null;
  dailyLimitTotal: number;
  usageToday: UsageToday;
};

type Credential = { id: string; provider: string; status: string };

export default function DashboardPage() {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [creds, setCreds] = useState<Credential[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [cRes, pRes] = await Promise.all([
        fetch('/api/teacher/classes'),
        fetch('/api/teacher/providers'),
      ]);
      const cData = await cRes.json().catch(() => ({ classes: [] }));
      const pData = await pRes.json().catch(() => ({ credentials: [] }));
      setClasses(cData.classes ?? []);
      setCreds(pData.credentials ?? []);
      setLoading(false);
    })();
  }, []);

  const credStatus = new Map(creds.map((c) => [c.id, c.status]));
  const activeCount = classes.filter((c) => c.isActive).length;
  const totalToday = classes.reduce((s, c) => s + c.usageToday.totalRequests, 0);
  const ocrToday = classes.reduce((s, c) => s + c.usageToday.ocrRequests, 0);
  const tutorToday = classes.reduce((s, c) => s + c.usageToday.tutorRequests, 0);
  const nearLimit = classes.filter(
    (c) => c.dailyLimitTotal > 0 && c.usageToday.totalRequests >= c.dailyLimitTotal * 0.8,
  );
  const errored = classes.filter(
    (c) =>
      c.usageToday.failureCount > 0 ||
      (c.providerCredentialId && credStatus.get(c.providerCredentialId) === 'invalid'),
  );

  if (loading) {
    return (
      <main className="admin-main">
        <p className="admin-muted">불러오는 중…</p>
      </main>
    );
  }

  return (
    <main className="admin-main">
      <div className="admin-head-row">
        <h1 className="admin-h1">대시보드</h1>
        <Link href="/teacher/classes/new" className="primary-button admin-head-cta">
          + 반 만들기
        </Link>
      </div>

      <div className="stat-grid">
        <div className="stat-tile">
          <span className="stat-value">{activeCount}</span>
          <span className="stat-label">활성 반</span>
        </div>
        <div className="stat-tile">
          <span className="stat-value">{totalToday}</span>
          <span className="stat-label">오늘 전체 요청</span>
        </div>
        <div className="stat-tile">
          <span className="stat-value">{ocrToday}</span>
          <span className="stat-label">오늘 문제 인식</span>
        </div>
        <div className="stat-tile">
          <span className="stat-value">{tutorToday}</span>
          <span className="stat-label">오늘 튜터 대화</span>
        </div>
      </div>

      {nearLimit.length > 0 ? (
        <div className="admin-notice admin-notice-warn">
          한도에 가까운 반: {nearLimit.map((c) => c.name).join(', ')}
        </div>
      ) : null}
      {errored.length > 0 ? (
        <div className="admin-notice admin-notice-err">
          연결/오류 확인이 필요한 반: {errored.map((c) => c.name).join(', ')}
        </div>
      ) : null}

      <h2 className="admin-h2">내 반</h2>
      {classes.length === 0 ? (
        <div className="admin-empty">
          <p>아직 만든 반이 없어요.</p>
          <p className="admin-muted">
            먼저 <Link href="/teacher/providers">AI 연결</Link>을 등록한 뒤 반을 만들어 주세요.
          </p>
        </div>
      ) : (
        <ul className="class-list">
          {classes.map((c) => (
            <li key={c.id} className="class-row">
              <Link href={`/teacher/classes/${c.id}`} className="class-row-main">
                <span className="class-row-name">{c.name}</span>
                <span className="class-row-meta">
                  오늘 {c.usageToday.totalRequests} / {c.dailyLimitTotal}회
                </span>
              </Link>
              <span className={`status-pill ${c.isActive ? 'status-active' : 'status-none'}`}>
                {c.isActive ? '사용 중' : '중지'}
              </span>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
