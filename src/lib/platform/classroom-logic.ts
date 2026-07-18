import { randomBytes } from 'node:crypto';

import { getAppUrl } from '@/lib/platform/config';
import type { SubjectId } from '@/lib/types';

/*
 * 반 관련 순수 로직 (server-only 아님, 단위 테스트 대상).
 * DB/복호화가 필요한 부분은 classrooms.ts(server-only)에 있다.
 */

export type ClassroomRow = {
  id: string;
  teacher_id: string;
  name: string;
  public_slug: string;
  provider_credential_id: string | null;
  subject_id: string;
  vision_model: string | null;
  tutor_model: string | null;
  solver_model: string | null;
  guidance_note: string | null;
  is_active: boolean;
  optional_access_code_hash: string | null;
  daily_limit_per_session: number;
  daily_limit_total: number;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
};

/** 학생 화면에 노출해도 안전한 공개 정보. 제공업체·모델·교사 정보를 절대 담지 않는다. */
export type PublicClassroomView = {
  slug: string;
  name: string;
  subjectId: SubjectId;
  guidanceNote: string | null;
  requiresAccessCode: boolean;
  dailyLimitPerSession: number;
};

/** 40자 이상의 URL-safe 무작위 slug. 순차 번호를 쓰지 않는다. */
export function generateSlug(): string {
  return randomBytes(24).toString('base64url');
}

export function toPublicView(row: ClassroomRow): PublicClassroomView {
  return {
    slug: row.public_slug,
    name: row.name,
    subjectId: (row.subject_id as SubjectId) ?? 'calculus-1',
    guidanceNote: row.guidance_note,
    requiresAccessCode: Boolean(row.optional_access_code_hash),
    dailyLimitPerSession: row.daily_limit_per_session,
  };
}

export type ClassroomAvailability =
  | { available: true }
  | { available: false; reason: 'inactive' | 'expired' | 'not_found' };

export function checkAvailability(
  row: ClassroomRow | null,
  now: Date = new Date(),
): ClassroomAvailability {
  if (!row) return { available: false, reason: 'not_found' };
  if (!row.is_active) return { available: false, reason: 'inactive' };
  if (row.expires_at && new Date(row.expires_at).getTime() < now.getTime()) {
    return { available: false, reason: 'expired' };
  }
  return { available: true };
}

export function studentUrlFor(slug: string): string {
  return `${getAppUrl()}/c/${slug}`;
}
