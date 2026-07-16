import { NextResponse } from 'next/server';

import { jsonError, withTeacher } from '@/lib/platform/http';
import { getAdminClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await withTeacher();
  if ('error' in auth) return auth.error;

  const { id } = await params;
  const admin = getAdminClient();

  // 소유권을 반드시 대조한다.
  const { error } = await admin
    .from('provider_credentials')
    .delete()
    .eq('id', id)
    .eq('teacher_id', auth.ctx.userId);

  if (error) {
    return jsonError('삭제하지 못했어요.', 500);
  }
  return NextResponse.json({ ok: true });
}
