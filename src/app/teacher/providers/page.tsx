'use client';

import { useCallback, useEffect, useState } from 'react';

import {
  DEFAULT_PROVIDER_MODELS,
  PROVIDER_LABELS,
  SUPPORTED_PROVIDERS,
} from '@/lib/ai/defaults';
import type { ProviderId } from '@/lib/ai/types';

type SafeCredential = {
  id: string;
  provider: string;
  apiKeyLast4: string;
  status: string;
  lastTestedAt: string | null;
};

type TestState = { kind: 'idle' | 'testing' | 'ok' | 'fail'; message?: string };

const STATUS_LABEL: Record<string, string> = {
  active: '연결됨',
  invalid: '오류',
  unchecked: '미확인',
};

function ProviderCard({
  provider,
  existing,
  onSaved,
  onDeleted,
}: {
  provider: ProviderId;
  existing?: SafeCredential;
  onSaved: () => void;
  onDeleted: () => void;
}) {
  const defaults = DEFAULT_PROVIDER_MODELS[provider];
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [visionModel, setVisionModel] = useState('');
  const [tutorModel, setTutorModel] = useState('');
  const [test, setTest] = useState<TestState>({ kind: 'idle' });
  const [saving, setSaving] = useState(false);

  async function runTest() {
    if (!apiKey.trim()) {
      setTest({ kind: 'fail', message: 'API 키를 입력해 주세요.' });
      return;
    }
    setTest({ kind: 'testing' });
    const res = await fetch('/api/teacher/providers/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider, apiKey: apiKey.trim(), model: tutorModel.trim() || undefined }),
    });
    const data = await res.json().catch(() => ({}));
    setTest(data.ok ? { kind: 'ok', message: data.message } : { kind: 'fail', message: data.message });
  }

  async function save() {
    setSaving(true);
    const res = await fetch('/api/teacher/providers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider,
        apiKey: apiKey.trim(),
        visionModel: visionModel.trim() || undefined,
        tutorModel: tutorModel.trim() || undefined,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (res.ok && data.ok) {
      setApiKey('');
      setTest({ kind: 'idle' });
      onSaved();
    } else {
      setTest({ kind: 'fail', message: data.message || data.error || '저장하지 못했어요.' });
    }
  }

  async function remove() {
    if (!existing) return;
    if (!window.confirm('이 AI 연결을 삭제할까요? 이 연결을 쓰는 반은 사용할 수 없게 돼요.')) return;
    await fetch(`/api/teacher/providers/${existing.id}`, { method: 'DELETE' });
    onDeleted();
  }

  return (
    <article className="admin-card provider-card">
      <div className="provider-card-head">
        <h3>{PROVIDER_LABELS[provider]}</h3>
        {existing ? (
          <span className={`status-pill status-${existing.status}`}>
            {STATUS_LABEL[existing.status] ?? existing.status} · ••••{existing.apiKeyLast4}
          </span>
        ) : (
          <span className="status-pill status-none">미연결</span>
        )}
      </div>

      <label className="admin-label">API 키</label>
      <div className="admin-key-row">
        <input
          type={showKey ? 'text' : 'password'}
          className="admin-input"
          placeholder={existing ? '새 키로 교체하려면 입력' : 'API 키 입력'}
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          autoComplete="off"
        />
        <button type="button" className="ghost-button" onClick={() => setShowKey((v) => !v)}>
          {showKey ? '숨기기' : '보기'}
        </button>
      </div>

      <details className="provider-advanced">
        <summary>고급 — 모델 직접 지정 (선택)</summary>
        <label className="admin-label">문제 인식(OCR) 모델</label>
        <input
          className="admin-input"
          placeholder={defaults.visionModel}
          value={visionModel}
          onChange={(e) => setVisionModel(e.target.value)}
        />
        <label className="admin-label">튜터 대화 모델</label>
        <input
          className="admin-input"
          placeholder={defaults.tutorModel}
          value={tutorModel}
          onChange={(e) => setTutorModel(e.target.value)}
        />
      </details>

      {test.kind !== 'idle' ? (
        <p
          className={`provider-test-msg ${
            test.kind === 'ok' ? 'ok' : test.kind === 'fail' ? 'fail' : ''
          }`}
        >
          {test.kind === 'testing' ? '연결 확인 중…' : test.message}
        </p>
      ) : null}

      <div className="provider-actions">
        <button type="button" className="ghost-button" onClick={runTest} disabled={test.kind === 'testing'}>
          연결 테스트
        </button>
        <button
          type="button"
          className="primary-button provider-save"
          onClick={save}
          disabled={saving || test.kind !== 'ok'}
          title={test.kind !== 'ok' ? '연결 테스트를 먼저 통과해 주세요.' : ''}
        >
          {saving ? '저장 중…' : existing ? '키 교체 저장' : '저장'}
        </button>
        {existing ? (
          <button type="button" className="danger-button" onClick={remove}>
            삭제
          </button>
        ) : null}
      </div>
    </article>
  );
}

export default function ProvidersPage() {
  const [credentials, setCredentials] = useState<SafeCredential[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const res = await fetch('/api/teacher/providers');
    const data = await res.json().catch(() => ({ credentials: [] }));
    setCredentials(data.credentials ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const byProvider = new Map(credentials.map((c) => [c.provider, c]));

  return (
    <main className="admin-main">
      <h1 className="admin-h1">AI 연결</h1>
      <p className="admin-muted">
        선생님의 API 키는 <b>암호화하여 저장</b>되고, <b>학생에게는 노출되지 않아요.</b> AI 요청을 보낼 때만
        서버에서 사용되며, <b>언제든지 삭제</b>할 수 있어요.
      </p>

      {loading ? (
        <p className="admin-muted">불러오는 중…</p>
      ) : (
        <div className="provider-grid">
          {SUPPORTED_PROVIDERS.map((provider) => (
            <ProviderCard
              key={provider}
              provider={provider}
              existing={byProvider.get(provider)}
              onSaved={load}
              onDeleted={load}
            />
          ))}
        </div>
      )}
    </main>
  );
}
