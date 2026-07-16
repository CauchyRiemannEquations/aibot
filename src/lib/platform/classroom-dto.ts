import { getAppUrl } from '@/lib/platform/config';
import type { ClassroomRow } from '@/lib/platform/classrooms';

/*
 * 교사 화면용 반 DTO. 교사에게는 제공업체/모델을 보여줘도 되지만
 * 자격증명 원문 키는 절대 포함하지 않는다.
 */
export type TeacherClassroomDTO = {
  id: string;
  name: string;
  slug: string;
  studentUrl: string;
  subjectId: string;
  providerCredentialId: string | null;
  visionModel: string | null;
  tutorModel: string | null;
  solverModel: string | null;
  guidanceNote: string | null;
  isActive: boolean;
  requiresAccessCode: boolean;
  dailyLimitPerSession: number;
  dailyLimitTotal: number;
  expiresAt: string | null;
  createdAt: string;
};

export function toTeacherClassroomDTO(row: ClassroomRow): TeacherClassroomDTO {
  return {
    id: row.id,
    name: row.name,
    slug: row.public_slug,
    studentUrl: `${getAppUrl()}/c/${row.public_slug}`,
    subjectId: row.subject_id,
    providerCredentialId: row.provider_credential_id,
    visionModel: row.vision_model,
    tutorModel: row.tutor_model,
    solverModel: row.solver_model,
    guidanceNote: row.guidance_note,
    isActive: row.is_active,
    requiresAccessCode: Boolean(row.optional_access_code_hash),
    dailyLimitPerSession: row.daily_limit_per_session,
    dailyLimitTotal: row.daily_limit_total,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
  };
}
