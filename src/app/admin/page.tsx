'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

type Summary = {
  teacherCount: number;
  activeClassCount: number;
  todayTotalRequests: number;
  topClasses: Array<{ id: string; name: string; requests: number }>;
};

export default function AdminPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [denied, setDenied] = useState(false);
  const [loading, setLoading] = useState(true);

  async function load() {
    const res = await fetch('/api/admin/summary');
    if (res.status === 403) {
      setDenied(true);
      setLoading(false);
      return;
    }
    const data = await res.json().catch(() => null);
    setSummary(data);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function deactivate(id: string) {
    if (!window.confirm('이 반을 비활성화할까요?')) return;
    await fetch(`/api/admin/classes/${id}/deactivate`, { method: 'POST' });
    load();
  }

  if (loading) {
    return (
      <main className="admin-main">
        <p className="admin-muted">불러오는 중…</p>
      </main>
    );
  }

  if (denied) {
    return (
      <main className="admin-main">
        <h1 className="admin-h1">관리자</h1>
        <p className="admin-muted">이 페이지에 접근할 권한이 없어요.</p>
        <Link href="/teacher/dashboard">대시보드로 →</Link>
      </main>
    );
  }

  return (
    <main className="admin-main">
      <h1 className="admin-h1">관리자</h1>
      <div className="stat-grid">
        <div className="stat-tile">
          <span className="stat-value">{summary?.teacherCount ?? 0}</span>
          <span className="stat-label">가입 교사</span>
        </div>
        <div className="stat-tile">
          <span className="stat-value">{summary?.activeClassCount ?? 0}</span>
          <span className="stat-label">활성 반</span>
        </div>
        <div className="stat-tile">
          <span className="stat-value">{summary?.todayTotalRequests ?? 0}</span>
          <span className="stat-label">오늘 전체 요청</span>
        </div>
      </div>

      <h2 className="admin-h2">오늘 요청이 많은 반</h2>
      {summary && summary.topClasses.length > 0 ? (
        <ul className="class-list">
          {summary.topClasses.map((c) => (
            <li key={c.id} className="class-row">
              <span className="class-row-main">
                <span className="class-row-name">{c.name}</span>
                <span className="class-row-meta">오늘 {c.requests}회</span>
              </span>
              <button type="button" className="danger-button" onClick={() => deactivate(c.id)}>
                비활성화
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="admin-muted">오늘 사용 기록이 있는 반이 없어요.</p>
      )}
    </main>
  );
}
