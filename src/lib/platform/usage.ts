import 'server-only';

import { getAdminClient } from '@/lib/supabase/admin';
import { seoulDateString } from '@/lib/platform/time';

/*
 * 사용량 한도 소비 및 결과 기록.
 * consume_quota / record_usage_result PostgreSQL 함수를 호출해 원자적으로 처리한다.
 */

export type QuotaKind = 'ocr' | 'tutor';

export type QuotaResult =
  | { allowed: true; sessionCount: number; totalCount: number }
  | { allowed: false; reason: 'session_limit' | 'total_limit' };

export async function consumeQuota(params: {
  classroomId: string;
  studentSessionId: string;
  kind: QuotaKind;
  sessionLimit: number;
  totalLimit: number;
  provider: string;
}): Promise<QuotaResult> {
  const admin = getAdminClient();
  const { data, error } = await admin.rpc('consume_quota', {
    p_classroom_id: params.classroomId,
    p_session_id: params.studentSessionId,
    p_kind: params.kind,
    p_session_limit: params.sessionLimit,
    p_total_limit: params.totalLimit,
    p_provider: params.provider,
    p_date: seoulDateString(),
  });

  if (error) {
    throw new Error(`consume_quota failed: ${error.message}`);
  }

  const result = data as {
    allowed: boolean;
    reason?: 'session_limit' | 'total_limit';
    session_count?: number;
    total_count?: number;
  };

  if (!result.allowed) {
    return { allowed: false, reason: result.reason ?? 'total_limit' };
  }
  return {
    allowed: true,
    sessionCount: result.session_count ?? 0,
    totalCount: result.total_count ?? 0,
  };
}

export async function recordUsageResult(classroomId: string, success: boolean): Promise<void> {
  const admin = getAdminClient();
  const { error } = await admin.rpc('record_usage_result', {
    p_classroom_id: classroomId,
    p_date: seoulDateString(),
    p_success: success,
  });
  if (error) {
    // 사용량 기록 실패는 학생 요청을 막지 않는다. (키/본문은 로그에 남기지 않음)
    console.error('[usage] record_usage_result failed');
  }
}

export async function getSessionCountToday(studentSessionId: string): Promise<number> {
  const admin = getAdminClient();
  const { data } = await admin
    .from('session_usage_daily')
    .select('request_count')
    .eq('student_session_id', studentSessionId)
    .eq('usage_date', seoulDateString())
    .maybeSingle();
  return data?.request_count ?? 0;
}

export type ClassroomUsageToday = {
  totalRequests: number;
  ocrRequests: number;
  tutorRequests: number;
  successCount: number;
  failureCount: number;
};

export async function getClassroomUsageToday(classroomId: string): Promise<ClassroomUsageToday> {
  const admin = getAdminClient();
  const { data } = await admin
    .from('usage_daily')
    .select('total_requests, ocr_requests, tutor_requests, success_count, failure_count')
    .eq('classroom_id', classroomId)
    .eq('usage_date', seoulDateString())
    .maybeSingle();

  return {
    totalRequests: data?.total_requests ?? 0,
    ocrRequests: data?.ocr_requests ?? 0,
    tutorRequests: data?.tutor_requests ?? 0,
    successCount: data?.success_count ?? 0,
    failureCount: data?.failure_count ?? 0,
  };
}
