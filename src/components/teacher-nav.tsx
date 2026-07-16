'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

import { getSupabaseBrowserClient } from '@/lib/supabase/client';

const LINKS = [
  { href: '/teacher/dashboard', label: '대시보드' },
  { href: '/teacher/providers', label: 'AI 연결' },
  { href: '/teacher/classes/new', label: '반 만들기' },
];

export function TeacherNav({ isOwner }: { isOwner: boolean }) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await getSupabaseBrowserClient().auth.signOut();
    router.push('/teacher/login');
    router.refresh();
  }

  return (
    <header className="admin-topbar">
      <Link href="/teacher/dashboard" className="admin-brand">
        SOCRA<span className="tutor-q">?</span>
      </Link>
      <nav className="admin-nav">
        {LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`admin-navlink${pathname === link.href ? ' is-active' : ''}`}
          >
            {link.label}
          </Link>
        ))}
        {isOwner ? (
          <Link
            href="/admin"
            className={`admin-navlink${pathname === '/admin' ? ' is-active' : ''}`}
          >
            관리자
          </Link>
        ) : null}
      </nav>
      <button type="button" className="ghost-button admin-logout" onClick={logout}>
        로그아웃
      </button>
    </header>
  );
}
