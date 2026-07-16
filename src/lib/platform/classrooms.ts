import 'server-only';

import { getDefaultModels, isProviderId } from '@/lib/ai/defaults';
import { getProviderAdapter } from '@/lib/ai/registry';
import type { ResolvedProvider } from '@/lib/ai/credential-resolver';
import type { ProviderId } from '@/lib/ai/types';
import { decryptCredential } from '@/lib/crypto/credential-crypto';
import {
  checkAvailability,
  generateSlug,
  toPublicView,
  type ClassroomAvailability,
  type ClassroomRow,
  type PublicClassroomView,
} from '@/lib/platform/classroom-logic';
import { getAdminClient } from '@/lib/supabase/admin';

/*
 * 반(Classroom) 서버 서비스 (server-only).
 * 학생 요청은 slug만 신뢰하고 서버가 DB에서 실제 설정을 조회한다.
 * 자격증명 복호화는 이 모듈에서만 이뤄지며 원문 키는 밖으로 나가지 않는다.
 */

// 순수 로직 재노출 (기존 import 경로 호환)
export {
  checkAvailability,
  generateSlug,
  toPublicView,
  type ClassroomAvailability,
  type ClassroomRow,
  type PublicClassroomView,
};

export async function getClassroomBySlug(slug: string): Promise<ClassroomRow | null> {
  const admin = getAdminClient();
  const { data } = await admin.from('classrooms').select('*').eq('public_slug', slug).maybeSingle();
  return (data as ClassroomRow | null) ?? null;
}

/**
 * 반의 연결된 교사 자격증명을 복호화하고 모델을 병합해 실행용 provider를 만든다.
 * 반 소유권은 이미 slug 조회로 확정된 상태에서만 호출한다.
 */
export async function resolveClassroomProvider(row: ClassroomRow): Promise<ResolvedProvider> {
  if (!row.provider_credential_id) {
    throw new Error('classroom has no linked credential');
  }
  const admin = getAdminClient();
  const { data: cred } = await admin
    .from('provider_credentials')
    .select('provider, encrypted_api_key, encryption_iv, encryption_auth_tag, encryption_key_version, status')
    .eq('id', row.provider_credential_id)
    .maybeSingle();

  if (!cred) {
    throw new Error('linked credential not found');
  }
  if (!isProviderId(cred.provider)) {
    throw new Error('unknown provider on credential');
  }

  const providerId = cred.provider as ProviderId;
  const apiKey = decryptCredential({
    ciphertext: cred.encrypted_api_key,
    iv: cred.encryption_iv,
    authTag: cred.encryption_auth_tag,
    keyVersion: cred.encryption_key_version,
  });

  const defaults = getDefaultModels(providerId);
  return {
    adapter: getProviderAdapter(providerId),
    providerId,
    apiKey,
    models: {
      visionModel: row.vision_model?.trim() || defaults.visionModel,
      tutorModel: row.tutor_model?.trim() || defaults.tutorModel,
      solverModel: row.solver_model?.trim() || defaults.solverModel,
    },
  };
}

/** 교사 소유 확인. service role로 조회하되 teacher_id를 반드시 대조한다. */
export async function getOwnedClassroom(
  classroomId: string,
  teacherId: string,
): Promise<ClassroomRow | null> {
  const admin = getAdminClient();
  const { data } = await admin
    .from('classrooms')
    .select('*')
    .eq('id', classroomId)
    .eq('teacher_id', teacherId)
    .maybeSingle();
  return (data as ClassroomRow | null) ?? null;
}
