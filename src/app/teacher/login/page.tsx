'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';

import { getSupabaseBrowserClient } from '@/lib/supabase/client';

function LoginForm() {
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/teacher/dashboard';

  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [message, setMessage] = useState('');

  async function sendLink(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) return;

    setStatus('sending');
    setMessage('');
    try {
      const supabase = getSupabaseBrowserClient();
      const emailRedirectTo = `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(redirect)}`;
      const { error } = await supabase.auth.signInWithOtp({
        email: trimmed,
        options: { emailRedirectTo },
      });
      if (error) throw error;
      setStatus('sent');
    } catch {
      setStatus('error');
      setMessage('메일을 보내지 못했어요. 주소를 확인하고 다시 시도해 주세요.');
    }
  }

  return (
    <div className="admin-auth-wrap">
      <div className="admin-card admin-auth-card">
        <p className="platform-eyebrow">TEACHER</p>
        <h1 className="admin-h1">선생님 로그인</h1>
        <p className="admin-muted">
          이메일 주소로 로그인 링크를 보내 드려요. 별도 비밀번호나 외부 계정이 필요 없어요.
        </p>

        {status === 'sent' ? (
          <div className="admin-notice admin-notice-ok">
            <b>{email}</b> 로 로그인 링크를 보냈어요. 메일함에서 링크를 눌러 주세요.
          </div>
        ) : (
          <form onSubmit={sendLink} className="admin-form">
            <label className="admin-label" htmlFor="email">
              이메일
            </label>
            <input
              id="email"
              type="email"
              className="admin-input"
              placeholder="teacher@school.kr"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
            {message ? <p className="admin-error-text">{message}</p> : null}
            <button type="submit" className="primary-button" disabled={status === 'sending'}>
              {status === 'sending' ? '보내는 중…' : '로그인 링크 받기'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function TeacherLoginPage() {
  return (
    <Suspense fallback={<div className="admin-auth-wrap" />}>
      <LoginForm />
    </Suspense>
  );
}
