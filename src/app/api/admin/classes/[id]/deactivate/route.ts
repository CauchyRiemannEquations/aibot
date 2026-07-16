import { NextResponse } from 'next/server';

import { jsonError, withOwner } from '@/lib/platform/http';
import { getAdminClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

/*
 * 관리자용 반 비활성화. 원문 키를 다루지 않으며 소유권과 무관하게
 * 플랫폼 운영자만 호출할 수 있다(withOwner).
 */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await withOwner();
  if ('error' in auth) return auth.error;

  const { id } = await params;
  const admin = getAdminClient();
  const { error } = await admin.from('classrooms').update({ is_active: false }).eq('id', id);
  if (error) return jsonError('비활성화하지 못했어요.', 500);
  return NextResponse.json({ ok: true });
}
