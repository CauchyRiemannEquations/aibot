import { NextResponse } from 'next/server';

import { hashAccessCode } from '@/lib/platform/access-code';
import { toTeacherClassroomDTO } from '@/lib/platform/classroom-dto';
import { generateSlug, type ClassroomRow } from '@/lib/platform/classrooms';
import { jsonError, withTeacher } from '@/lib/platform/http';
import { classroomCreateSchema } from '@/lib/platform/schemas';
import { getClassroomUsageToday } from '@/lib/platform/usage';
import { getAdminClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

export async function GET() {
  const auth = await withTeacher();
  if ('error' in auth) return auth.error;

  const admin = getAdminClient();
  const { data } = await admin
    .from('classrooms')
    .select('*')
    .eq('teacher_id', auth.ctx.userId)
    .order('created_at', { ascending: false });

  const rows = (data as ClassroomRow[] | null) ?? [];
  const classes = await Promise.all(
    rows.map(async (row) => ({
      ...toTeacherClassroomDTO(row),
      usageToday: await getClassroomUsageToday(row.id),
    })),
  );

  return NextResponse.json({ classes });
}

export async function POST(request: Request) {
  const auth = await withTeacher();
  if ('error' in auth) return auth.error;

  const parsed = classroomCreateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return jsonError('입력값을 확인해 주세요.', 400);
  }
  const input = parsed.data;
  const admin = getAdminClient();

  // 연결하려는 자격증명이 교사 소유이고 테스트를 통과(active)했는지 검증한다.
  const { data: cred } = await admin
    .from('provider_credentials')
    .select('id, status')
    .eq('id', input.providerCredentialId)
    .eq('teacher_id', auth.ctx.userId)
    .maybeSingle();

  if (!cred) {
    return jsonError('선택한 AI 연결을 찾을 수 없어요.', 400);
  }
  if (cred.status !== 'active') {
    return jsonError('연결 테스트를 통과한 AI 연결만 사용할 수 있어요.', 400);
  }

  const slug = generateSlug();
  const { data, error } = await admin
    .from('classrooms')
    .insert({
      teacher_id: auth.ctx.userId,
      name: input.name,
      public_slug: slug,
      subject_id: input.subjectId,
      provider_credential_id: input.providerCredentialId,
      vision_model: input.visionModel ?? null,
      tutor_model: input.tutorModel ?? null,
      solver_model: input.solverModel ?? null,
      guidance_note: input.guidanceNote ?? null,
      daily_limit_per_session: input.dailyLimitPerSession,
      daily_limit_total: input.dailyLimitTotal,
      optional_access_code_hash: input.accessCode ? hashAccessCode(slug, input.accessCode) : null,
      expires_at: input.expiresAt ?? null,
      is_active: true,
    })
    .select('*')
    .single();

  if (error || !data) {
    return jsonError('반을 만들지 못했어요.', 500);
  }

  return NextResponse.json({ ok: true, classroom: toTeacherClassroomDTO(data as ClassroomRow) });
}
