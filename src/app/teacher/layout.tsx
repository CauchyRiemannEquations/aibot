import { redirect } from 'next/navigation';

import { TeacherNav } from '@/components/teacher-nav';
import { isPlatformMode, isPlatformOwner } from '@/lib/platform/config';
import { getCurrentUser } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function TeacherLayout({ children }: { children: React.ReactNode }) {
  if (!isPlatformMode()) {
    redirect('/');
  }

  const user = await getCurrentUser();
  const isOwner = isPlatformOwner(user?.email);

  return (
    <div className="admin-shell">
      {user ? <TeacherNav isOwner={isOwner} /> : null}
      <div className="admin-content">{children}</div>
    </div>
  );
}
