import { NextResponse } from 'next/server';

import { jsonError, withOwner } from '@/lib/platform/http';
import { seoulDateString } from '@/lib/platform/time';
import { getAdminClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

/*
 * 관리자 요약. 교사 API 키 원문은 어디에도 포함하지 않는다.
 */
export async function GET() {
  const auth = await withOwner();
  if ('error' in auth) return auth.error;

  const admin = getAdminClient();
  const today = seoulDateString();

  const [{ count: teacherCount }, { count: activeClassCount }, usageRows] = await Promise.all([
    admin.from('profiles').select('id', { count: 'exact', head: true }),
    admin.from('classrooms').select('id', { count: 'exact', head: true }).eq('is_active', true),
    admin
      .from('usage_daily')
      .select('classroom_id, total_requests')
      .eq('usage_date', today)
      .order('total_requests', { ascending: false })
      .limit(10),
  ]);

  const rows = usageRows.data ?? [];
  const todayTotal = rows.reduce((sum, row) => sum + (row.total_requests ?? 0), 0);

  // 상위 반 이름 매핑
  const classroomIds = rows.map((row) => row.classroom_id);
  const nameById = new Map<string, string>();
  if (classroomIds.length) {
    const { data: classes } = await admin
      .from('classrooms')
      .select('id, name')
      .in('id', classroomIds);
    (classes ?? []).forEach((c) => nameById.set(c.id, c.name));
  }

  return NextResponse.json({
    teacherCount: teacherCount ?? 0,
    activeClassCount: activeClassCount ?? 0,
    todayTotalRequests: todayTotal,
    topClasses: rows.map((row) => ({
      id: row.classroom_id,
      name: nameById.get(row.classroom_id) ?? '(이름 없음)',
      requests: row.total_requests ?? 0,
    })),
  });
}
