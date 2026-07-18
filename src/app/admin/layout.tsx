import { redirect } from 'next/navigation';

import { TeacherNav } from '@/components/teacher-nav';
import { isPlatformMode, isPlatformOwner } from '@/lib/platform/config';
import { getCurrentUser } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  if (!isPlatformMode()) {
    redirect('/');
  }
  const user = await getCurrentUser();
  if (!isPlatformOwner(user?.email)) {
    redirect('/teacher/dashboard');
  }

  return (
    <div className="admin-shell">
      <TeacherNav isOwner />
      <div className="admin-content">{children}</div>
    </div>
  );
}
