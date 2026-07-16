import 'server-only';

import { getDefaultModels } from '@/lib/ai/defaults';
import { getProviderAdapter } from '@/lib/ai/registry';
import type { AIProviderAdapter, ProviderId, ProviderModels } from '@/lib/ai/types';

/*
 * 실행 시점에 사용할 제공업체 어댑터·API 키·모델을 해석한다.
 * - single 모드: 서버 환경변수(OPENROUTER_API_KEY 등)에서 해석.
 * - platform 모드: 반 → 자격증명에서 해석 (platform/classrooms.ts).
 * 원문 API 키는 이 결과 밖으로 나가지 않으며, 클라이언트에 반환되지 않는다.
 */
export type ResolvedProvider = {
  adapter: AIProviderAdapter;
  providerId: ProviderId;
  apiKey: string;
  models: ProviderModels;
};

/** single 모드: 기존 동작과 동일하게 환경변수 기반 OpenRouter 자격증명을 사용. */
export function resolveSingleModeProvider(): ResolvedProvider {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY is missing.');
  }
  const defaults = getDefaultModels('openrouter');
  const models: ProviderModels = {
    visionModel: process.env.OPENROUTER_VISION_MODEL?.trim() || defaults.visionModel,
    tutorModel: process.env.OPENROUTER_TUTOR_MODEL?.trim() || defaults.tutorModel,
    solverModel: process.env.OPENROUTER_SOLVER_MODEL?.trim() || defaults.solverModel,
  };
  return {
    adapter: getProviderAdapter('openrouter'),
    providerId: 'openrouter',
    apiKey,
    models,
  };
}
