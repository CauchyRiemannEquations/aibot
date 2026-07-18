import { NextResponse } from 'next/server';

import { hashAccessCode } from '@/lib/platform/access-code';
import { toTeacherClassroomDTO } from '@/lib/platform/classroom-dto';
import { getOwnedClassroom, type ClassroomRow } from '@/lib/platform/classrooms';
import { jsonError, withTeacher } from '@/lib/platform/http';
import { classroomUpdateSchema } from '@/lib/platform/schemas';
import { getClassroomUsageToday } from '@/lib/platform/usage';
import { getAdminClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await withTeacher();
  if ('error' in auth) return auth.error;

  const { id } = await params;
  const row = await getOwnedClassroom(id, auth.ctx.userId);
  if (!row) return jsonError('반을 찾을 수 없어요.', 404);

  return NextResponse.json({
    classroom: toTeacherClassroomDTO(row),
    usageToday: await getClassroomUsageToday(row.id),
  });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await withTeacher();
  if ('error' in auth) return auth.error;

  const { id } = await params;
  const row = await getOwnedClassroom(id, auth.ctx.userId);
  if (!row) return jsonError('반을 찾을 수 없어요.', 404);

  const parsed = classroomUpdateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return jsonError('입력값을 확인해 주세요.', 400);
  }
  const input = parsed.data;
  const admin = getAdminClient();

  // 자격증명을 바꾸는 경우 소유·active 검증
  if (input.providerCredentialId) {
    const { data: cred } = await admin
      .from('provider_credentials')
      .select('id, status')
      .eq('id', input.providerCredentialId)
      .eq('teacher_id', auth.ctx.userId)
      .maybeSingle();
    if (!cred) return jsonError('선택한 AI 연결을 찾을 수 없어요.', 400);
    if (cred.status !== 'active') {
      return jsonError('연결 테스트를 통과한 AI 연결만 사용할 수 있어요.', 400);
    }
  }

  const patch: Record<string, unknown> = {};
  if (input.name !== undefined) patch.name = input.name;
  if (input.subjectId !== undefined) patch.subject_id = input.subjectId;
  if (input.providerCredentialId !== undefined) patch.provider_credential_id = input.providerCredentialId;
  if (input.visionModel !== undefined) patch.vision_model = input.visionModel || null;
  if (input.tutorModel !== undefined) patch.tutor_model = input.tutorModel || null;
  if (input.solverModel !== undefined) patch.solver_model = input.solverModel || null;
  if (input.guidanceNote !== undefined) patch.guidance_note = input.guidanceNote || null;
  if (input.isActive !== undefined) patch.is_active = input.isActive;
  if (input.dailyLimitPerSession !== undefined) patch.daily_limit_per_session = input.dailyLimitPerSession;
  if (input.dailyLimitTotal !== undefined) patch.daily_limit_total = input.dailyLimitTotal;
  if (input.expiresAt !== undefined) patch.expires_at = input.expiresAt;
  if (input.accessCode !== undefined) {
    // null 또는 빈 문자열 → 접속 코드 제거, 값 → 재설정 (slug는 그대로 유지)
    patch.optional_access_code_hash = input.accessCode
      ? hashAccessCode(row.public_slug, input.accessCode)
      : null;
  }

  const { data, error } = await admin
    .from('classrooms')
    .update(patch)
    .eq('id', id)
    .eq('teacher_id', auth.ctx.userId)
    .select('*')
    .single();

  if (error || !data) {
    return jsonError('반을 수정하지 못했어요.', 500);
  }
  return NextResponse.json({ ok: true, classroom: toTeacherClassroomDTO(data as ClassroomRow) });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await withTeacher();
  if ('error' in auth) return auth.error;

  const { id } = await params;
  const admin = getAdminClient();
  const { error } = await admin
    .from('classrooms')
    .delete()
    .eq('id', id)
    .eq('teacher_id', auth.ctx.userId);

  if (error) return jsonError('반을 삭제하지 못했어요.', 500);
  return NextResponse.json({ ok: true });
}
